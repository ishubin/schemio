/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const artStorage     = require('../storage/storageProvider.js').provideArtStorage();
const _                 = require('lodash');
const fs                = require('fs-extra');


function artFromRequest(req) {
    const art = req.body;
    const artItem = {
        projectId: req.params.projectId,
        name: art.name,
        url: art.url,
    };

    if (art.id) {
        artItem.id = art.id;
    }

    return artItem;
}

const ApiArt = {
    createArt(req, res) {
        const projectId = req.params.projectId;
        const requestArt = artFromRequest(req);

        artStorage.createArt(projectId, requestArt).then(art => {
            res.json(art);
        }).catch(err => res.$apiError(err, 'Could not create art'));
    },

    getArt(req, res) {
        const projectId = req.params.projectId;
        artStorage.getAllArt(projectId).then(artList => {
            res.json(artList);
        }).catch(err => res.$apiError(err, 'Could not retrieve art list'));
    },

    saveArt(req, res) {
        const projectId = req.params.projectId;
        const artId = req.params.artId;
        const requestArt = artFromRequest(req);

        requestArt.modifiedDate = Date.now();
        artStorage.saveArt(projectId, artId, requestArt).then(art => {
            res.json(art);
        }).catch(err => res.$apiError(err, 'Could not save art'));
    },

    deleteArt(req, res) {
        const projectId = req.params.projectId;
        const artId = req.params.artId;

        artStorage.deleteArt(projectId, artId).then(() => {
            res.json({status: 'ok'});
        }).catch(err => {
            res.$apiError(err, 'Could not delete art');
        });
    }
};


module.exports = ApiArt;
