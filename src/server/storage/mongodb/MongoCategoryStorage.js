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
                modifiedTime: new Date().toISOString()
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
     * This function is terrible, but have no time to make it properly.
     * In case something goes wrong the data will be corrupted and all the categories are going to be in a broken state.
     * Perhaps this should move into background scheduled job or being processed in a background queue.
     * The problem with background job is that, unlike with project deletion, user would want to have the result immediately
     * 
     * Move a category into another category as its child
     * This is NOT FINISHED YET.
     * @param {String} projectId 
     * @param {String} categoryId id of category that is moving to another category as its child
     * @param {String} destinationCategoryId  id of new parent category. If defined 'null' then it will move it to root
     */
    moveCategory(projectId, categoryId, destinationCategoryId) {
        //TODO move this into background scheduled job. Moving categories can be intensive in case there are a lot of schemes and categories that need to be updated

        //TODO finish and optimize moveCategory implementation. The following needs to be done:
        // - moving to top level
        
        if (categoryId === destinationCategoryId) {
            return Promise.reject('Destination and origin should not match');
        }

        let chain = null;
        if (destinationCategoryId) {
            chain = this._categories().findOne({projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(destinationCategoryId)})
            .then(parentCategory => {
                // Here we need to verify that category is allowed to move to destination category
                // we need to check that category is not mentioned in the ancestors array of destination category
                if (!parentCategory) {
                    return Promise.reject(`Cannot find destination category with id ${destinationCategoryId}`);
                }
                if (_.find(parentCategory.ancestors, a => a.id === categoryId)) {
                    return Promise.reject(`Cannot move category ${categoryId} into its own children in destination category ${destinationCategoryId}`);
                }
                return this._categories().findOne({projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(categoryId)})
                .then(category => {
                    if (!category) {
                        return Promise.reject(`Cannot find category with id ${categoryId}`);
                    }
                    return parentCategory;
                });
            })
            .then(parentCategory => {
                const ancestors = parentCategory.ancestors.concat({
                    name: parentCategory.name,
                    id: parentCategory.id
                });
                return this._categories().updateOne(
                    {projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(categoryId)},
                    {$set: {parentId: destinationCategoryId, ancestors: ancestors}}
                );
            })
            .then(() => this._categories().findOne({projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(categoryId)}))
            // Preparing ancestors including the current category so that we can update all of its children
            .then(category => category.ancestors.concat({
                name: category.name,
                id: category.id
            }));
        } else {
            // it means that the category was moved to roo
            chain = this._categories().updateOne(
                {projectId: mongo.sanitizeString(projectId), id: mongo.sanitizeString(categoryId)},
                {$set: {parentId: null, ancestors: []}}
            )
            .then(() => []);
        }

        return chain.then(ancestors => {
            return this._categories().find({projectId: mongo.sanitizeString(projectId), 'ancestors.id': mongo.sanitizeString(categoryId)}).toArray()
            .then(categories => {
                let promise = Promise.resolve(null);
                _.forEach(categories, category => {
                    promise = promise.then(this._createCategoryAncestorUpdatePromise(projectId, category, ancestors, categoryId));
                });
            }).then(() => {
                const ancestorIds = _.map(ancestors, a => a.id);
                return this._schemes().updateMany({projectId, categoryId}, {$set: {allSubCategoryIds: ancestorIds}})
            });
        });
    }

    _createCategoryAncestorUpdatePromise(projectId, category, parentAncestors, categoryId) {
        const i = _.findIndex(category.ancestors, ancestor => ancestor.id === categoryId);
        let ancestors = _.clone(category.ancestors);
        if (i >= 0) {
            ancestors.splice(0, i + 1);
        } 
        const fixedAncestors = parentAncestors.concat(ancestors);
        const ancestorIds = _.map(fixedAncestors, a => a.id);

        return this._categories().updateOne({projectId: mongo.sanitizeString(projectId), id: category.id}, {$set: {ancestors: fixedAncestors}})
        .then(() => {
            return this._schemes().updateMany({projectId, categoryId: category.id}, {$set: {allSubCategoryIds: ancestorIds}})
        });
    }

    _categoryArrayToTree(categories) {
        const map = {};
        const topCategories = [];

        categories.sort(this._categoryComparator);

        _.forEach(categories, category => {
            const cat = {
                name: category.name,
                id: category.id,
                childCategories: [],
                ancestors: category.ancestors
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
