const SchemeStorage     = require('./SchemeStorage.js');
const fs                = require('fs-extra');


class LocalSchemeStorage extends SchemeStorage {
    constructor() {
        super();
        this.storagePath = process.env.LOCAL_SCHEME_STORAGE_PATH || 'local-storage';
        console.log('Local scheme storage: ' + this.storagePath);
    }

    getScheme(schemeId) {
        return fs.readJson(`${this.storagePath}/schemes/${schemeId}.json`);
    }
}

module.exports = LocalSchemeStorage;
