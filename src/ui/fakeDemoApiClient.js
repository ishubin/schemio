/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import LocalStorageDb from './localStorageDb.js';
import shortid from 'shortid';

const schemeStorage = new LocalStorageDb('schemes');
const currentUser = {login: 'demo-user', name: 'Demo User'};

export default {
    getCurrentUser() {
        return Promise.resolve(currentUser);
    },

    login(login, password) {
        return Promise.resolve(currentUser);
    },

    createArt(art) {
        return Promise.resolve(null);
    },

    getAllArt() {
        return Promise.resolve(null);
    },

    loadScheme(schemeId) {
        return schemeStorage.loadDocument(schemeId);
    },

    createNewScheme(scheme) {
        scheme.id = shortid.generate();
        scheme.modifiedDate = Date.now();
        return schemeStorage.saveDocument(scheme.id, scheme).then(() => {
            return scheme;
        });
    },

    saveScheme(schemeId, scheme) {
        scheme.modifiedDate = Date.now();
        return schemeStorage.saveDocument(schemeId, scheme);
    },

    deleteScheme(schemeId) {
        return schemeStorage.deleteDocument(schemeId);
    },

    findSchemes(filters) {
        return schemeStorage.findDocuments()
        .then(schemes => {
            const limit = 10;
            const total = schemes.length;

            if (schemes.length > limit) {
                //TODO proper pagination with offset
                schemes = schemes.slice(0, limit);
            }
            return {
                results: _.map(schemes, scheme => {
                    return {
                        id: scheme.id,
                        name: scheme.name,
                        description: scheme.description,
                        tags: scheme.tags,
                        modifiedDate: scheme.modifiedDate
                    };
                }),
                total: total,
                resultsPerPage: limit,
                offset: 0
            };
        }).then(data => {
            return data;
        });
    },

    getSchemesInCategory(categoryId) {
        return Promise.resolve(null);
    },

    getTags() {
        return Promise.resolve(null);
    },

    getShapes() {
        return Promise.resolve(null);
    },

    getCategory(parentCategoryId) {
        return Promise.resolve(null);
    },

    getCategoryTree() {
        return Promise.resolve(null);
    },

    ensureCategoryStructure(categories) {
        return Promise.resolve(null);
    },

    uploadSchemeThumbnail(schemeId, data) {
        return Promise.resolve(null);
    }

};
