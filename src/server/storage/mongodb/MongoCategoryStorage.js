const CategoryStorage       = require('../CategoryStorage.js');
const MongoClient       = require('mongodb').MongoClient;
const assert            = require('assert');
const _                 = require('lodash');

//TODO put all this into config
const mongodbUrl = 'mongodb://localhost:27017';
// Database Name
const dbName = 'myproject';
const poolSize = 10;


class MongoCategoryStorage extends CategoryStorage {
    constructor() {
        super();
        this.db = null;
        MongoClient.connect(mongodbUrl, {
            poolSize: poolSize
        }).then(client => {
            this.db = client.db(dbName);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }

    _categories() {
        return this.db.collection('categories');
    }
    _schemes() {
        return this.db.collection('schemes');
    }

    createCategory(name, id, parentId) {
        if (!name || name.trim().length === 0) {
            return Promise.reject('name should not be empty');
        }
        if (!id || id.trim().length === 0) {
            return Promise.reject('category id should not be empty');
        }

        this._categories().createIndex({id: 1}, {unique: true});
        this._categories().createIndex({parentId: 1, lname: 1}, {unique: true});

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
                ancestors
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
}

module.exports = MongoCategoryStorage;
