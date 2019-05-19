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

    createArt(art) {
        var artItem = {
            id: shortid.generate(),
            name: art.name,
            url: art.url,
            modifiedDate: art.modifiedDate,
            version: CURRENT_ART_VERSION
        };

        return this._art().insertOne(artItem).then(result => {
            return artItem;
        });
    }

    getArt() {
        return this._art().find({}).toArray().then(result => {
            return _.map(result, item => {
                return {
                    id: item.id,
                    name: item.name,
                    url: item.url
                };
            });
        });
    }

}

module.exports = MongoArtStorage;
