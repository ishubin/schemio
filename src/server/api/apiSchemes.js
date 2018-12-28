const schemeStorage     = require('../storage/storageProvider.js').provideSchemeStorage();
const categoryStorage   = require('../storage/storageProvider.js').provideCategoryStorage();
const _                 = require('lodash');
const fs                = require('fs-extra');


const shapes        = [];
fs.readdirSync('public/shapes').forEach(fileName => {
    var i = fileName.indexOf('.');
    if (i > 0) {
        shapes.push(fileName.substring(0, i));
    } else {
        shapes.push(fileName);
    }
});



const ApiSchemes = {
    getScheme(req, res) {
        var schemeId = req.params.schemeId;
        schemeStorage.getScheme(schemeId).then(scheme => {
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
        }).then(scheme => {
            res.json(scheme);
        }).catch( err => {
            res.status(404);
            res.json({error: 'Not found'});
        });
    },

    createScheme(req, res) {
        schemeStorage.createScheme(req.body).then(scheme => {
            res.json(scheme);
        }).catch( err => {
            res.status(500);
            res.json({error: 'Error creating scheme'});
        });
    },

    saveScheme(req, res) {
        var schemeId = req.params.schemeId;
        var requestScheme = ApiSchemes.sanitizeScheme(req.body);
        schemeStorage.saveScheme(schemeId, requestScheme).then(scheme => {
            res.json(scheme);
        }).catch( err => {
            res.status(500);
            res.json({error: `Error saving scheme ${schemeId}`});
        });
    },

    findSchemes(req, res) {
        var query = {
            offset: req.query.offset || 0,
            query: req.query.q ? req.query.q.trim() : null
        };
        if (req.query.hasOwnProperty('category')) {
            query['category'] = req.query.category.trim();
        }
        schemeStorage.findSchemes(query).then(searchResult => {
            res.json(searchResult);
        }).catch( err => {
            res.status(500);
            res.json({error: 'Could not find schemes'});
        });
    },

    getTags(req, res) {
        schemeStorage.getTags().then(tags => {
            res.json(tags);
        }).catch( err => {
            res.status(500);
            res.json({error: 'Could not get tags'});
        });
    },

    getShapes(req, res) {
        res.json(shapes);
    },

    sanitizeScheme(scheme) {
        if (scheme.items) {
            _.forEach(scheme.items, item => {
                if (item.hasOwnProperty('meta')) {
                    delete item['meta'];
                }
            });
        }
        if (scheme.connectors) {
            _.forEach(scheme.connectors, connector => {
                if (connector.hasOwnProperty('meta')) {
                    delete connector['meta'];
                }
            });
        }
        return scheme;
    }

}

module.exports = ApiSchemes;
