const artStorage     = require('../storage/storageProvider.js').provideArtStorage();
const _                 = require('lodash');
const fs                = require('fs-extra');

const ApiArt = {
    createArt(req, res) {
        var requestArt = req.body;
        requestArt.modifiedDate = Date.now();

        artStorage.createArt(requestArt).then(art => {
            res.json(art);
        }).catch(err => res.$apiError(err, 'Could not create art'));
    },

    getArt(req, res) {
        artStorage.getArt().then(artList => {
            res.json(artList);
        }).catch(err => res.$apiError(err, 'Could not retrieve art list'));
    }
};


module.exports = ApiArt;
