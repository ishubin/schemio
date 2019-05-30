/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const categoryStorage = require('../storage/storageProvider.js').provideCategoryStorage();
const _             = require('lodash');
const shortid       = require('shortid');

const ApiCategories = {

    createCategory(req, res) {
        var category = req.body;
        categoryStorage.createCategory(category.name, category.id, category.parentId).then(category => {
            res.json(category);
        }).catch(err => res.$apiError(err));
    },

    getRootCategory(req, res) {
        categoryStorage.getCategories(null).then(categories => {
            res.json({
                childCategories: categories
            });
        }).catch(err => res.$apiError(err));
    },

    getCategory(req, res) {
        Promise.all([
            categoryStorage.getCategory(req.params.categoryId),
            categoryStorage.getCategories(req.params.categoryId)
        ]).then(data => {
            if (data[0]) {
                var category = data[0];
                var childCategories = data[1];
                category['childCategories'] = childCategories;
                res.json(category);
            } else {
                res.$notFound('Category not found');
            }
        }).catch(err => res.$apiError(err));
    },

    getCategoryTree(req, res) {
        categoryStorage.getCategoryTree().then(tree => {
            res.json(tree);
        }).catch(err => res.$apiError(err));
    },

    deleteCategory(req, res) {
        categoryStorage.deleteCategory(req.params.categoryId).then(data => {
            res.json({message: `deleted category ${req.params.categoryId}`});
        }).catch(err => res.$apiError(err));
    },

    /**
    Creates category tree in case its nodes are missing
    */
    ensureCategoryStructure(req, res) {
        var categories = req.body;
        if (categories && categories.length > 0) {
            _.reduce(categories, (promise, category) => {
                return promise.then(parentCategory => {
                    //checking if category is new or already exists
                    var parentId = parentCategory ? parentCategory.id : null;
                    if (!category.id) {
                        return categoryStorage.createCategory(category.name, shortid.generate(), parentId);
                    } else {
                        return categoryStorage.getCategory(category.id);
                    }
                });
            }, Promise.resolve(null)).then(category =>{
                res.json(category);
            }).catch(err => res.$apiError(err));
        } else {
            res.$badRequest('Categories are empty');
        }
    }
}

module.exports = ApiCategories;
