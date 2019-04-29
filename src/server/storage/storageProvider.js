/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const LocalSchemeStorage = require('./LocalSchemeStorage.js');
const MongoSchemeStorage = require('./mongodb/MongoSchemeStorage.js');
const MongoCategoryStorage = require('./mongodb/MongoCategoryStorage.js');
const MongoArtStorage = require('./mongodb/MongoArtStorage.js');
const MongoImageStorage = require('./mongodb/MongoImageStorage.js');

var localSchemeStorage = null;
function provideLocalStorage() {
    if (!localSchemeStorage) {
        localSchemeStorage = new LocalSchemeStorage();
    }
    return localSchemeStorage;
}

var mongoSchemeStorage = null;
function provideMongoStorage() {
    if (!mongoSchemeStorage) {
        mongoSchemeStorage = new MongoSchemeStorage();
    }
    return mongoSchemeStorage;
}

var mongoCategoryStorage = null;
function provideMongoCategoryStorage() {
    if (!mongoCategoryStorage) {
        mongoCategoryStorage = new MongoCategoryStorage();
    }
    return mongoCategoryStorage;
}

var mongoArtStorage = null;
function provideMongoArtStorage() {
    if (!mongoArtStorage) {
        mongoArtStorage = new MongoArtStorage();
    }
    return mongoArtStorage;
}

const mongoImageStorage = new MongoImageStorage();

module.exports = {
    provideSchemeStorage() {
        return provideMongoStorage();
    },

    provideCategoryStorage() {
        return provideMongoCategoryStorage();
    },

    provideArtStorage() {
        return provideMongoArtStorage();
    },

    provideImageStorage() {
        return mongoImageStorage;
    }
}
