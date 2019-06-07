/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';

const localStorageClientFunctions = {
    exportAllStorage() {
        let collectedData = {};
        let promises = []
        _.forEach(document.schemioLocalStorageDatabases, (db, dbName) => {
            promises.push(db.find().then(items => {
                collectedData[dbName] = items;
            }));
        });

        Promise.all(promises).then(() => {
            const newWindow = window.open();
            newWindow.document.write(JSON.stringify(collectedData, 4));
        });
    },

    importAllStorage() {
        let html = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #fff;">';
        html += '<button id="schemio-local-storage-import-submit">Import</button><br/>';
        html += '<textarea id="schemio-local-storage-import-input" style="width: 100%; height: 400px; box-sizing: border-box;"></textarea>';
        html += '</div>;'
        document.body.innerHTML += html;

        document.getElementById('schemio-local-storage-import-submit').addEventListener('click', () => {
            let inputText = document.getElementById('schemio-local-storage-import-input').value;
            const jsonToImport = JSON.parse(inputText);
            
            let chain = Promise.resolve(null);
            _.forEach(document.schemioLocalStorageDatabases, (db, dbName) => {
                if (jsonToImport[dbName]) {
                    _.forEach(jsonToImport[dbName], doc => {
                        chain = chain.then(() => {
                            db.save(doc.id, doc);
                        });
                    });
                }
            });

            chain.then(() => window.location.reload());
        });
    },

    clearStorage() {
        let promises = []
        _.forEach(document.schemioLocalStorageDatabases, (db, dbName) => {
            promises.push(db.clear());
        });

        Promise.all(promises).then(() => {
            window.location.reload();
        });
    }
};



if (!document.schemioLocalStorage) {
    document.schemioLocalStorageDatabases = {};
    document.schemioLocalStorage = localStorageClientFunctions;
}


export default class LocalStorageDb {
    /**
     * 
     * @param {string} collectionName 
     */
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.index = this._get(`ldb-${this.collectionName}-index`, {});
        if (!this._get(`ldb-${this.collectionName}-index`)) {
            this._initStorage();
        }
        document.schemioLocalStorageDatabases[this.collectionName] = this;
    }

    /**
     * Initializes storage with local data
     */
    _initStorage() {
    }

    _set(fullId, data) {
        window.localStorage.setItem(fullId, JSON.stringify(data));
    }

    _get(fullId, defaultValue) {
        const encoded = window.localStorage.getItem(fullId);
        if (encoded) {
            return JSON.parse(encoded);
        } else {
            return defaultValue;
        }
    }

    _delete(fullId) {
        window.localStorage.removeItem(fullId);
    }

    clear() {
        let promises = [];
        _.forEach(this.index, id => {
            promises.push(this.delete(id));
        });

        Promise.all(promises).then(() => {
            this._delete(`ldb-${this.collectionName}-index`);
        });
    }

    /**
     * Saves document with specified id
     *
     * @param {string} id unique id of a document
     *
     * @param {object} document just any js object
     */
    save(id, doc) {
        this.index[id] = 1;
        this._set(`ldb-${this.collectionName}-index`, this.index);
        this._set(`ldb-${this.collectionName}-document-${id}`, doc);
        return Promise.resolve(doc);
    }


     /**
      * Loads a document with specified id from a collection. Returns null if notthing was found.
      *
      * @param {string} id unique id of a document
      *
      * @returns {Promise} a document if it was found with specified id
      */
    load(id) {
        return new Promise((resolve, reject) => {
            if (this.index[id]) {
                resolve(this._get(`ldb-${this.collectionName}-document-${id}`));
            } else {
                reject(`Document ${id} does not exist`);
            }
        });
    }

    find() {
        return new Promise((resolve, reject) => {
            const documents = [];
            _.forEach(this.index, (value, id) => {
                const doc = this._get(`ldb-${this.collectionName}-document-${id}`);
                if (doc) {
                    documents.push(doc);
                }
            });
            resolve(documents);
        });
    }

    /**
     * deleteDocument - Description
     *
     * @param {string} id unique id of a document
     *
     * @returns {Promise}
     */
    delete(id) {
        if (this.index[id]) {
            delete this.index[id];
            this._set(`ldb-${this.collectionName}-index`, this.index);
        }
        this._delete(`ldb-${this.collectionName}-document-${id}`);
        return Promise.resolve({});
    }
}
