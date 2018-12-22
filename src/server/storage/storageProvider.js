const LocalSchemeStorage = require('./LocalSchemeStorage.js');
const MongoSchemeStorage = require('./mongodb/MongoSchemeStorage.js');

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

module.exports = {
    provideSchemeStorage() {
        return provideMongoStorage();
    }
}
