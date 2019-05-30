/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import LocalStorageDb from './localStorageDb.js';
import utils from './utils.js';
import shortid from 'shortid';

const schemeStorage = new LocalStorageDb('schemes');
const artStorage    = new LocalStorageDb('art');
const tagsStorage   = new LocalStorageDb('tags');

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

function saveSchemeTags(scheme) {
    let tags = [].concat(scheme.tags);
    _.forEach(scheme.items, item => {
        if (item.tags) {
            tags = tags.concat(item.tags);
        }
    });

    tags = _.uniq(tags);
    //TODO this is inefficient, but I don't have enough time. Fix later.
    _.forEach(tags, (tag, index) => {
        tagsStorage.save(index, tag);
    });
}

export default {
    getCurrentUser() {
        return Promise.resolve(currentUser);
    },

    login(login, password) {
        return Promise.resolve(currentUser);
    },

    createArt(art) {
        art.id = shortid.generate();
        return artStorage.save(art.id, art).then(() => {
            return art;
        });
    },

    getAllArt() {
        return artStorage.find();
    },

    loadScheme(schemeId) {
        return schemeStorage.load(schemeId);
    },

    createNewScheme(scheme) {
        scheme = utils.sanitizeScheme(scheme);
        scheme.id = shortid.generate();
        scheme.modifiedDate = Date.now();
        scheme.indexedWords = createSchemeIndexedWords(scheme);
        saveSchemeTags(scheme);
        return schemeStorage.save(scheme.id, scheme).then(() => {
            return scheme;
        });
    },

    saveScheme(schemeId, scheme) {
        scheme = utils.sanitizeScheme(scheme);
        scheme.modifiedDate = Date.now();
        scheme.indexedWords = createSchemeIndexedWords(scheme);
        saveSchemeTags(scheme);
        return schemeStorage.save(schemeId, scheme);
    },

    deleteScheme(schemeId) {
        return schemeStorage.delete(schemeId);
    },

    findSchemes(filters) {
        const offset = filters.offset || 0;

        return schemeStorage.find()
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

    getTags() {
        return tagsStorage.find();
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
