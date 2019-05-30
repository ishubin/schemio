/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';


export default class LocalStorageDb {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.index = this._get(`ldb-${this.collectionName}-index`, {});
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

    /**
     * Saves document with specified id
     *
     * @param {string} id unique id of a document
     *
     * @param {object} document just any js object
     */
    saveDocument(id, document) {
        this.index[id] = true;
        this._set(`ldb-${this.collectionName}-index`, this.index);
        this._set(`ldb-${this.collectionName}-document-${id}`, document);
        return Promise.resolve({});
    }


     /**
      * Loads a document with specified id from a collection. Returns null if notthing was found.
      *
      * @param {string} id unique id of a document
      *
      * @returns {Promise} a document if it was found with specified id
      */
    loadDocument(id) {
        return new Promise((resolve, reject) => {
            if (this.index[id]) {
                resolve(this._get(`ldb-${this.collectionName}-document-${id}`));
            } else {
                reject(`Document ${id} does not exist`);
            }
        });
    }

    findDocuments() {
        return new Promise((resolve, reject) => {
            const documents = [];
            _.forEach(this.index, (value, id) => {
                const document = this._get(`ldb-${this.collectionName}-document-${id}`);
                if (document) {
                    documents.push(document);
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
    deleteDocument(id) {
        if (this.index[id]) {
            delete this.index[id];
            this._get(`ldb-${this.collectionName}-index`, this.index);
            this._get(`ldb-${this.collectionName}-document-${id}`);
        }
        return Promise.resolve({});
    }
}
