const LocalSchemeStorage = require('./LocalSchemeStorage.js');
const MongoSchemeStorage = require('./mongodb/MongoSchemeStorage.js');
const MongoCategoryStorage = require('./mongodb/MongoCategoryStorage.js');

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


module.exports = {
    provideSchemeStorage() {
        return provideMongoStorage();
    },

    provideCategoryStorage() {
        return provideMongoCategoryStorage();
    }
}
