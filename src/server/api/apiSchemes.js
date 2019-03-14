const schemeStorage     = require('../storage/storageProvider.js').provideSchemeStorage();
const categoryStorage   = require('../storage/storageProvider.js').provideCategoryStorage();
const _                 = require('lodash');
const fs                = require('fs-extra');

const ApiSchemes = {
    getScheme(req, res) {
        var schemeId = req.params.schemeId;
        schemeStorage.getScheme(schemeId).then(scheme => {
            if (scheme) {
                if (scheme.categoryId) {
                    return categoryStorage.getCategory(scheme.categoryId).then(category => {
                        scheme.category = category;
                        return scheme;
                    }).catch(err => {
                        return scheme;
                    });
                } else {
                    return scheme;
                }
            } else {
                return null;
            }
        }).then(scheme => {
            if (scheme) {
                res.json(scheme);
            } else {
                res.$notFound('Scheme not found');
            }
        }).catch(err => res.$apiError(err));
    },

    createScheme(req, res) {
        var requestScheme = req.body;
        requestScheme.modifiedDate = Date.now();

        schemeStorage.createScheme(requestScheme).then(scheme => {
            res.json(scheme);
        }).catch(err => res.$apiError(err));
    },

    saveScheme(req, res) {
        var schemeId = req.params.schemeId;
        var requestScheme = req.body;
        requestScheme.modifiedDate = Date.now();
        schemeStorage.saveScheme(schemeId, requestScheme).then(scheme => {
            res.json(scheme);
        }).catch(err => res.$apiError(err));
    },

    deleteScheme(req, res) {
        var schemeId = req.params.schemeId;
        schemeStorage.deleteScheme(schemeId).then(() => {
            res.json({status: "ok"});
        }).catch(err => res.$apiError(err));
    },

    findSchemes(req, res) {
        var query = {
            query: req.query.q ? req.query.q.trim() : null
        };

        if (req.query.offset && req.query.offset.length > 0) {
            query.offset = parseInt(req.query.offset);
        }

        if (req.query.hasOwnProperty('category')) {
            query['category'] = req.query.category.trim();
        }
        schemeStorage.findSchemes(query).then(searchResult => {
            res.json(searchResult);
        }).catch(err => res.$apiError(err));
    },

    getTags(req, res) {
        schemeStorage.getTags().then(tags => {
            res.json(tags);
        }).catch(err => res.$apiError(err));
    },

    getShapes(req, res) {
        res.json({});
    }
}

module.exports = ApiSchemes;
