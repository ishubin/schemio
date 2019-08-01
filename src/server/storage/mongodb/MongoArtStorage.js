/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const shortid           = require('shortid');
const _                 = require('lodash');
const mongo             = require('./Mongo.js');


const CURRENT_ART_VERSION = 1;

class MongoArtStorage {
    _art() {
        return mongo.db().collection('art');
    }

    createArt(projectId, art) {
        art.id = shortid.generate();
        art.version = CURRENT_ART_VERSION;
        art.projectId = projectId;

        return this._art().insertOne(art).then(result => {
            return art;
        });
    }

    getAllArt(projectId) {
        return this._art().find({projectId}).toArray().then(result => {
            return _.map(result, item => {
                return {
                    id: item.id,
                    name: item.name,
                    url: item.url
                };
            });
        });
    }

    saveArt(projectId, artId, art) {
        art.version = CURRENT_ART_VERSION;
        return this._art().updateOne({projectId, id: artId}, {$set: art}).then(() => {
            return art;
        });
    }
    
    deleteArt(projectId, artId) {
        return this._art().deleteOne({projectId, id: artId}).then(() => {return {};});
    }
}

module.exports = MongoArtStorage;
