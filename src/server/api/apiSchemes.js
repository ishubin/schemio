const schemeStorage = require('../storage/storageProvider.js').provideStorage();
const _             = require('lodash');


const ApiSchemes = {
    getScheme(req, res) {
        var schemeId = req.params.schemeId;
        schemeStorage.getScheme(schemeId).then(scheme => {
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
        schemeStorage.findSchemes({
            offset: req.query.offset || 0,
            query: req.query.q ? req.query.q.trim() : null
        }).then(searchResult => {
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
