/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const ArtStorage     = require('../ArtStorage.js');
const MongoClient       = require('mongodb').MongoClient;
const shortid           = require('shortid');
const _                 = require('lodash');
const config            = require('../../config.js');

class MongoArtStorage extends ArtStorage {
    constructor() {
        super();
        this.db = null;
        MongoClient.connect(config.mongodb.url, {
            poolSize: config.mongodb.poolSize
        }).then(client => {
            this.db = client.db(config.mongodb.dbName);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }

    _art() {
        return this.db.collection('art');
    }

    createArt(art) {
        var artItem = {
            id: shortid.generate(),
            name: art.name,
            url: art.url,
            modifiedDate: art.modifiedDate
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
