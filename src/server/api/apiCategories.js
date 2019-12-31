/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const categoryStorage = require('../storage/storageProvider.js').provideCategoryStorage();
const projectStorage = require('../storage/storageProvider.js').provideProjectStorage();
const _             = require('lodash');
const shortid       = require('shortid');

const ApiCategories = {

    createCategory(req, res) {
        const projectId = req.params.projectId;
        const category = req.body;
        const categoryId = shortid.generate();

        categoryStorage.createCategory(projectId, category.name, categoryId, category.parentId).then(category => {
            res.json(category);
        }).catch(err => res.$apiError(err));
    },

    getRootCategory(req, res) {
        const projectId = req.params.projectId;
        categoryStorage.getCategories(projectId, null).then(categories => {
            res.json({
                childCategories: categories
            });
        }).catch(err => res.$apiError(err));
    },

    getCategory(req, res) {
        const projectId = req.params.projectId;
        Promise.all([
            categoryStorage.getCategory(projectId, req.params.categoryId),
            categoryStorage.getCategories(projectId, req.params.categoryId)
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

    updateCategory(req, res) {
        const projectId = req.params.projectId;
        const categoryId = req.params.categoryId;
        const updateRequest = req.body;

        if (updateRequest && updateRequest.name) {
            categoryStorage.updateCategory(projectId, categoryId, updateRequest.name)
            .then(() => {
                res.json({result: 'updated'});
            })
        } else {
            res.$badRequest();
        }
    },

    getCategoryTree(req, res) {
        const projectId = req.params.projectId;
        categoryStorage.getCategoryTree(projectId).then(tree => {
            res.json(tree);
        }).catch(err => res.$apiError(err));
    },

    deleteCategory(req, res) {
        const projectId = req.params.projectId;
        categoryStorage.deleteCategory(projectId, req.params.categoryId).then(data => {
            res.json({message: `deleted category ${req.params.categoryId}`});
        }).catch(err => res.$apiError(err));
    },

    /**
    Creates category tree in case its nodes are missing
    */
    ensureCategoryStructure(req, res) {
        const projectId = req.params.projectId;
        let categories = req.body;
        if (categories && categories.length > 0) {
            _.reduce(categories, (promise, category) => {
                return promise.then(parentCategory => {
                    //checking if category is new or already exists
                    let parentId = parentCategory ? parentCategory.id : null;
                    if (!category.id) {
                        return categoryStorage.createCategory(projectId, category.name, shortid.generate(), parentId);
                    } else {
                        return categoryStorage.getCategory(projectId, category.id);
                    }
                });
            }, Promise.resolve(null)).then(category =>{
                res.json(category);
            }).catch(err => res.$apiError(err));
        } else {
            res.$badRequest('Categories are empty');
        }
    },

    moveCategory(req, res) {
        const projectId = req.params.projectId;
        const moveRequest = req.body;
        if (moveRequest && moveRequest.categoryId && moveRequest.destinationCategoryId) {
            categoryStorage.moveCategory(projectId, moveRequest.categoryId, moveRequest.destinationCategoryId).then(tree => {
                res.json(tree);
            }).catch(err => res.$apiError(err));
        } else {
            res.$badRequest();
        }
    }
}

module.exports = ApiCategories;
