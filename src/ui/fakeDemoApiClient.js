/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import LocalStorageDb from './localStorageDb.js';
import shortid from 'shortid';

const schemeStorage = new LocalStorageDb('schemes');
const currentUser = {login: 'demo-user', name: 'Demo User'};

function textToWords(text) {
    if (text && text.length > 0) {
        return text.toLowerCase().split(/\s+/);
    }
    return [];
}

function createSchemeIndexedWords(scheme) {
    let wordSet = {};

    let fullText = scheme.name + ' ' + scheme.description;

    _.forEach(scheme.items, item => {
        fullText += ' ' + item.name + ' ' + item.description;
    });

    _.forEach(textToWords(fullText), word => {
        if (word) {
            wordSet[word] = 1;
        }
    });

    return wordSet;
}

function filterSchemes(schemes, filters) {
    if (filters.query) {
        const queryForWords = textToWords(filters.query);
        schemes = _.filter(schemes, scheme => {
            // checking if any word from the query exists in the index
            let found = false;

            for (let i = 0; i < queryForWords.length && !found; i++) {
                if (scheme.indexedWords[queryForWords[i]]) {
                    found = true;
                }
            }
            return found;
        });
    }
    return schemes;
}

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
        scheme.indexedWords = createSchemeIndexedWords(scheme);
        return schemeStorage.saveDocument(scheme.id, scheme).then(() => {
            return scheme;
        });
    },

    saveScheme(schemeId, scheme) {
        scheme.modifiedDate = Date.now();
        scheme.indexedWords = createSchemeIndexedWords(scheme);
        return schemeStorage.saveDocument(schemeId, scheme);
    },

    deleteScheme(schemeId) {
        return schemeStorage.deleteDocument(schemeId);
    },

    findSchemes(filters) {
        const offset = filters.offset || 0;

        return schemeStorage.findDocuments()
        .then(schemes => filterSchemes(schemes, filters))
        .then(schemes => {
            const limit = 10;
            const total = schemes.length;

            let start = offset;
            let end = limit;
            if (offset > schemes.length) {
                schemes = [];
            } else {
                end = Math.min(schemes.length, limit);
                schemes = schemes.slice(start, end);
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
                offset: offset
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
