const categoryStorage = require('../storage/storageProvider.js').provideCategoryStorage();
const _             = require('lodash');

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

    getRootCategories(req, res) {
        categoryStorage.getCategories(null).then(categories => {
            res.json(categories);
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
    }
}


module.exports = ApiCategories;
