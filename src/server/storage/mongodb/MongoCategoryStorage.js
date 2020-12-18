/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const assert            = require('assert');
const _                 = require('lodash');
const config            = require('../../config.js');
const mongo             = require('./Mongo.js');

const CURRENT_CATEGORY_VERSION = 1;

class MongoCategoryStorage {
    _categories() {
        return mongo.db().collection('categories');
    }
    _schemes() {
        return mongo.db().collection('schemes');
    }

    createCategory(projectId, name, id, parentId) {
        if (!name || name.trim().length === 0) {
            return Promise.reject('name should not be empty');
        }
        if (!id || id.trim().length === 0) {
            return Promise.reject('category id should not be empty');
        }


        var chain = null;
        if (parentId) {
            chain = this.getCategory(projectId, parentId).then(category => {
                if (!category) {
                    throw new Error(`Parent category ${parentId} does not exist`);
                }
                return category;
            });
        } else {
            chain = Promise.resolve(null);
        }

        return chain.then(parentCategory => {
            var ancestors = [];
            if (parentCategory) {
                ancestors = parentCategory.ancestors.concat({
                    name: parentCategory.name,
                    id: parentCategory.id
                });
            }

            var categoryData = {
                name,
                id,
                projectId,
                parentId,
                ancestors,
                version: CURRENT_CATEGORY_VERSION,
                modifiedDate: Date.now()
            };
            return this._categories().insert(categoryData).then(result => {
                return categoryData;
            });
        });
    }

    getCategory(projectId, id) {
        return this._categories().findOne({
            id: mongo.sanitizeString(id),
            projectId: mongo.sanitizeString(projectId)
        });
    }

    updateCategory(projectId, categoryId, newCategoryName) {
        return this._categories().updateOne({
            id: mongo.sanitizeString(categoryId),
            projectId: mongo.sanitizeString(projectId)
        }, {
            $set: {name: newCategoryName}
        }).then(() => {
            return this._categories().find({
                projectId: mongo.sanitizeString(projectId),
                'ancestors.id': mongo.sanitizeString(categoryId)
            }).toArray()
            .then(categories => {
                let promise = Promise.resolve(null);
                _.forEach(categories, category => {
                    const ancestors = _.map(category.ancestors, ancestor => {
                        if (ancestor.id === categoryId) {
                            return {name: newCategoryName, id: categoryId};
                        }
                        return ancestor;
                    });

                    promise = promise.then(() => this._categories().updateOne({projectId: mongo.sanitizeString(projectId), id: category.id}, {$set: {ancestors: ancestors}}));
                });
                return promise;
            });
        });
    }

    getCategories(projectId, parentId) {
        return this._categories().find({
            parentId: mongo.sanitizeString(parentId),
            projectId: mongo.sanitizeString(projectId)
        }).toArray();
    }


    deleteCategory(projectId, categoryId) {
        return Promise.all([
            this._schemes().deleteMany({
                allSubCategoryIds: mongo.sanitizeString(categoryId),
                projectId: mongo.sanitizeString(projectId)
            }),
            this._categories().deleteOne({
                id: mongo.sanitizeString(categoryId),
                projectId: mongo.sanitizeString(projectId)
            }),
            this._categories().deleteMany({
                'ancestors.id': mongo.sanitizeString(categoryId),
                projectId: mongo.sanitizeString(projectId)
            })
        ]);
    }


    // Converts list of all categories into tree structure
    getCategoryTree(projectId) {
        return this._categories().find({projectId: mongo.sanitizeString(projectId)}).toArray()
        .then(categories => {
            return this._categoryArrayToTree(categories)
        });
    }
    
    /**
     * Move a category into another category as its child
     * This is NOT FINISHED YET.
     * @param {String} projectId 
     * @param {String} categoryId 
     * @param {String} destinationCategoryId 
     */
    moveCategory(projectId, categoryId, destinationCategoryId) {
        //TODO finish and optimize moveCategory implementation. The following needs to be done:
        // - moving to top level
        // - updating category ancestors for all related schemes
        
        if (categoryId === destinationCategoryId) {
            return Promise.reject('Destination and origin should not match');
        }

        return this._categories().findOne({projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(destinationCategoryId)})
        .then(parentCategory => {
            const ancestors = parentCategory.ancestors.concat([destinationCategoryId]);
            return this._categories().updateOne(
                {projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(categoryId)},
                {$set: {parentId: destinationCategoryId, ancestors: ancestors}}
            ).then(() => ancestors);
        }).then(ancestors => {
            return this._categories().find({projectId: mongo.sanitizeString(projectId), ancestors: mongo.sanitizeString(categoryId)}).toArray()
            .then(categories => {
                let promise = Promise.resolve(null);
                _.forEach(categories, category => {
                    promise = promise.then(this._createCategoryAncestorUpdatePromise(projectId, category, ancestors, categoryId, destinationCategoryId));
                });
                return promise;
            });
        });
    }

    _createCategoryAncestorUpdatePromise(projectId, category, parentAncestors, categoryId, destinationCategoryId) {
        const i = _.indexOf(category.ancestors, categoryId);
        let ancestors = _.clone(category.ancestors);
        if (i >= 0) {
            ancestors.splice(0, i);
        } 
        ancestors = parentAncestors.concat(ancestors);
        return this._categories().updateOne({projectId: mongo.sanitizeString(projectId), id: category.id}, {$set: {ancestors: ancestors}});
    }

    _categoryArrayToTree(categories) {
        const map = {};
        const topCategories = [];

        categories.sort(this._categoryComparator);

        _.forEach(categories, category => {
            const cat = {
                name: category.name,
                id: category.id,
                childCategories: []
            };
            map[category.id] = cat;

            if (!category.parentId) {
                topCategories.push(cat);
            } else {
                if (map.hasOwnProperty(category.parentId)) {
                    map[category.parentId].childCategories.push(cat);
                }
            }

        });

        return topCategories;
    }

    _categoryComparator(a, b) {
        if ( a.ancestors.length < b.ancestors.length ){
            return -1;
        }
        if ( a.ancestors.length > b.ancestors.length ){
            return 1;
        }

        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return -1;
        }
        return 0;
    }
}

module.exports = MongoCategoryStorage;
