/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const CategoryStorage       = require('../CategoryStorage.js');
const assert            = require('assert');
const _                 = require('lodash');
const config            = require('../../config.js');
const mongo             = require('./Mongo.js');

const CURRENT_CATEGORY_VERSION = 1;

class MongoCategoryStorage extends CategoryStorage {
    constructor() {
        super();
    }

    _categories() {
        return mongo.db().collection('categories');
    }
    _schemes() {
        return mongo.db().collection('schemes');
    }

    createCategory(name, id, parentId) {
        if (!name || name.trim().length === 0) {
            return Promise.reject('name should not be empty');
        }
        if (!id || id.trim().length === 0) {
            return Promise.reject('category id should not be empty');
        }


        var chain = null;
        if (parentId) {
            chain = this.getCategory(parentId).then(category => {
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
                lname: name.toLowerCase(),
                id,
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

    getCategory(id) {
        return this._categories().findOne({id});
    }

    getCategories(parentId) {
        return this._categories().find({parentId}).toArray();
    }


    deleteCategory(categoryId) {
        return Promise.all([
            this._schemes().deleteMany({'allSubCategoryIds': categoryId}),
            this._categories().deleteOne({id: categoryId}),
            this._categories().deleteMany({'ancestors.id': categoryId})
        ]);
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

    // Converts list of all categories into tree structure
    getCategoryTree() {
        return this._categories().find().toArray().then(categories => {
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
        });
    }
}

module.exports = MongoCategoryStorage;
