/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const schemeStorage     = require('../storage/storageProvider.js').provideSchemeStorage();
const categoryStorage   = require('../storage/storageProvider.js').provideCategoryStorage();
const _                 = require('lodash');
const fs                = require('fs-extra');
const shortid           = require('shortid');


function sanitizeScheme(scheme) {
    _.forEach(scheme.items, item => {
        item.meta = {};
        if (!item.hasOwnProperty('id')) {
            item.id = shortid.generate();
        }
        if (!item.hasOwnProperty('tags')) {
            item.tags = [];
        }
    });
    return scheme;
}

const ApiSchemes = {
    getScheme(req, res) {
        const projectId = req.params.projectId;

        let schemeId = req.params.schemeId;
        schemeStorage.getScheme(projectId, schemeId)
        .then(scheme => {
            if (scheme) {
                if (scheme.categoryId) {
                    return categoryStorage.getCategory(projectId, scheme.categoryId).then(category => {
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
        })
        .then(sanitizeScheme)
        .then(scheme => {
            if (scheme) {
                res.json(scheme);
            } else {
                res.$notFound('Scheme not found');
            }
        }).catch(err => res.$apiError(err));
    },

    createScheme(req, res) {
        const projectId = req.params.projectId;
        const requestScheme = req.body;
        requestScheme.modifiedDate = Date.now();

        schemeStorage.createScheme(projectId, requestScheme).then(scheme => {
            res.json(scheme);
        }).catch(err => res.$apiError(err));
    },

    saveScheme(req, res) {
        const projectId = req.params.projectId;
        const schemeId = req.params.schemeId;
        const requestScheme = req.body;
        requestScheme.modifiedDate = Date.now();
        schemeStorage.saveScheme(projectId, schemeId, requestScheme).then(scheme => {
            res.json(scheme);
        }).catch(err => res.$apiError(err));
    },

    deleteScheme(req, res) {
        const projectId = req.params.projectId;
        const schemeId = req.params.schemeId;
        schemeStorage.deleteScheme(projectId, schemeId).then(() => {
            res.json({status: "ok"});
        }).catch(err => res.$apiError(err));
    },

    findSchemes(req, res) {
        const projectId = req.params.projectId;
        var query = {
            query: req.query.q ? req.query.q.trim() : null,
            includeParent: false
        };

        if (req.query.offset && req.query.offset.length > 0) {
            query.offset = parseInt(req.query.offset);
        }

        if (req.query.hasOwnProperty('category')) {
            query['category'] = req.query.category.trim();
        }

        if (req.query.hasOwnProperty('includeSubcategories')) {
            query.includeSubcategories = true;
        }

        schemeStorage.findSchemes(projectId, query).then(searchResult => {
            res.json(searchResult);
        }).catch(err => res.$apiError(err));
    },

    getTags(req, res) {
        const projectId = req.params.projectId;
        schemeStorage.getTags(projectId).then(tags => {
            res.json(tags);
        }).catch(err => res.$apiError(err));
    }
}

module.exports = ApiSchemes;
