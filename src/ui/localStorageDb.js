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

    _delete(fullId) {
        window.localStorage.removeItem(fullId);
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
            this._delete(`ldb-${this.collectionName}-document-${id}`);
        }
        return Promise.resolve({});
    }
}
