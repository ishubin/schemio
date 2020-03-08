/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const MongoSchemeStorage    = require('./mongodb/MongoSchemeStorage.js');
const MongoCategoryStorage  = require('./mongodb/MongoCategoryStorage.js');
const MongoArtStorage       = require('./mongodb/MongoArtStorage.js');
const MongoFileStorage      = require('./mongodb/MongoFileStorage.js');
const MongoProjectStorage   = require('./mongodb/MongoProjectStorage.js');
const MongoStyleStorage     = require('./mongodb/MongoStyleStorage.js');

const mongoSchemeStorage    = new MongoSchemeStorage();
const mongoCategoryStorage  = new MongoCategoryStorage();
const mongoArtStorage       = new MongoArtStorage();
const mongoFileStorage      = new MongoFileStorage();
const mongoProjectStorage   = new MongoProjectStorage();
const mongoStyleStorage     = new MongoStyleStorage();

module.exports = {
    provideSchemeStorage() {
        return mongoSchemeStorage;
    },

    provideCategoryStorage() {
        return mongoCategoryStorage;
    },

    provideArtStorage() {
        return mongoArtStorage;
    },

    provideFileStorage() {
        return mongoFileStorage;
    },

    provideProjectStorage() {
        return mongoProjectStorage;
    },

    provideStyleStorage() {
        return mongoStyleStorage;
    }
}
