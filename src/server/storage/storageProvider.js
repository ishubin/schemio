const LocalSchemeStorage = require('./LocalSchemeStorage.js');
const localSchemeStorage = new LocalSchemeStorage();

module.exports = {
    provideStorage() {
        return localSchemeStorage;
    }
}
