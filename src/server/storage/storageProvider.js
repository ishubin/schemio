const LocalSchemeStorage = require('./LocalSchemeStorage.js');
const MongoSchemeStorage = require('./mongodb/MongoSchemeStorage.js');
const MongoCategoryStorage = require('./mongodb/MongoCategoryStorage.js');
const MongoArtStorage = require('./mongodb/MongoArtStorage.js');

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


module.exports = {
    provideSchemeStorage() {
        return provideMongoStorage();
    },

    provideCategoryStorage() {
        return provideMongoCategoryStorage();
    },

    provideArtStorage() {
        return provideMongoArtStorage();
    }
}
