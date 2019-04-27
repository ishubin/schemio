/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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
