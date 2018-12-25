const categoryStorage = require('../storage/storageProvider.js').provideCategoryStorage();
const _             = require('lodash');
const shortid       = require('shortid');

const ApiCategories = {

    createCategory(req, res) {
        var category = req.body;
        categoryStorage.createCategory(category.name, category.id, category.parentId).then(category => {
            res.json(category);
        }).catch(err=>{
            res.status(500);
            res.json(err);
            console.error(err);
        })
    },

    getRootCategory(req, res) {
        categoryStorage.getCategories(null).then(categories => {
            res.json({
                childCategories: categories
            });
        }).catch(err=>{
            res.status(500);
            res.json(err);
            console.error(err);
        });
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
                res.status(404);
                res.send('Category not found');
            }
        }).catch(err=>{
            res.status(500);
            res.json(err);
            console.error(err);
        });
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
            }).catch(err => {
                res.status(500);
                res.json(err);
                console.error(err);
            });
        } else {
            res.status(500);
            res.json({error: 'empty categories'});
        }
    }
}


module.exports = ApiCategories;
