const SchemeStorage     = require('./SchemeStorage.js');
const fs                = require('fs-extra');
const shortid           = require('shortid');


class LocalSchemeStorage extends SchemeStorage {
    constructor() {
        super();
        this.storagePath = process.env.LOCAL_SCHEME_STORAGE_PATH || 'local-storage';
        console.log('Local scheme storage: ' + this.storagePath);
    }

    getScheme(schemeId) {
        return fs.readJson(`${this.storagePath}/schemes/${schemeId}.json`);
    }

    createScheme(scheme) {
        scheme.id = shortid.generate();
        return fs.writeJson(`${this.storagePath}/schemes/${scheme.id}.json`, scheme).then(() => {
            return scheme;
        });
    }
}

module.exports = LocalSchemeStorage;
