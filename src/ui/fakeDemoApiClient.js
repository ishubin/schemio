/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import LocalStorageDb from './localStorageDb.js';
import utils from './utils.js';
import shortid from 'shortid';
import {forEach, filter, find, uniq, map, reduce} from 'lodash';

const schemeStorage     = new LocalStorageDb('schemes');
const artStorage        = new LocalStorageDb('art');
const tagsStorage       = new LocalStorageDb('tags');
const categoryStorage   = new LocalStorageDb('categories');

const currentUser = {login: 'demo-user', name: 'Demo User'};
const GLOBAL_TAGS_ID = 'global-tags';

function textToWords(text) {
    if (text && text.length > 0) {
        return text.toLowerCase().split(/\s+/);
    }
    return [];
}

function createSchemeIndexedWords(scheme) {
    let wordSet = {};

    let fullText = scheme.name + ' ' + scheme.description;

    forEach(scheme.items, item => {
        fullText += ' ' + item.name + ' ' + item.description;
    });

    forEach(textToWords(fullText), word => {
        if (word) {
            wordSet[word] = 1;
        }
    });

    return wordSet;
}


function filterSchemes(schemes, filters) {
    if (filters.categoryId) {
        schemes = filter(schemes, scheme => {
            if (scheme.category) {
                if (scheme.category.id === filters.categoryId || find(scheme.category.ancestors, category => category.id === filters.categoryId)) {
                    return true;
                } else {
                    return false;
                }
            }
            return false;
        });
    }
    if (filters.query) {
        const queryForWords = textToWords(filters.query);
        schemes = filter(schemes, scheme => {
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
    tagsStorage.load(GLOBAL_TAGS_ID).catch(err => []).then(existingTags => {
        let tags = existingTags.concat(scheme.tags);
        forEach(scheme.items, item => {
            if (item.tags) {
                tags = tags.concat(item.tags);
            }
        });

        tags = uniq(tags);
        return tagsStorage.save(GLOBAL_TAGS_ID, tags);
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
        scheme.id = shortid.generate();
        return this.saveScheme(scheme.id, scheme);
    },

    saveScheme(schemeId, scheme) {
        scheme = utils.sanitizeScheme(scheme);
        scheme.modifiedDate = Date.now();
        scheme.indexedWords = createSchemeIndexedWords(scheme);
        saveSchemeTags(scheme);

        let chain = Promise.resolve(null);
        if (scheme.categoryId) {
            chain = categoryStorage.load(scheme.categoryId);
        }
        return chain.then(category => {
            scheme.category = category;
            return schemeStorage.save(scheme.id, scheme).then(() => {
                return scheme;
            });
        });
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
                results: map(schemes, scheme => {
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
        return tagsStorage.load(GLOBAL_TAGS_ID).catch(err => []);
    },

    getCategory(categoryId) {
        return categoryStorage.find().then(categories => {
            if (!categoryId) {
                return {
                    childCategories: filter(categories, category => !category.parentId)
                };
            } else {
                return categoryStorage.load(categoryId).then(category => {
                    category.childCategories = filter(categories, c => c.parentId === categoryId);
                    return category;
                });
            }
        });
    },

    getCategoryTree() {
        return categoryStorage.find().then(categories => {
            const map = {};
            const topCategories = [];

            categories.sort(this._categoryComparator);

            forEach(categories, category => {
                const cat = {
                    name: category.name,
                    id: category.id,
                    childCategories: []
                };
                map[category.id] = cat;

                if (!category.parentId) {
                    topCategories.push(cat);
                } else {
                    if (map.hasOwnProperty(category.parentId)) {
                        map[category.parentId].childCategories.push(cat);
                    }
                }

            });

            return topCategories;
        });
    },

    _categoryComparator(a, b) {
        if ( a.ancestors.length < b.ancestors.length ){
            return -1;
        }
        if ( a.ancestors.length > b.ancestors.length ){
            return 1;
        }

        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return -1;
        }
        return 0;
    },

    ensureCategoryStructure(categories) {
        if (categories && categories.length > 0) {
            return reduce(categories, (promise, category) => {
                return promise.then(parentCategory => {
                    //checking if category is new or already exists
                    const parentId = parentCategory ? parentCategory.id : null;
                    let ancestors = [];
                    if (parentCategory) {
                        ancestors = [].concat(parentCategory.ancestors);
                        ancestors.push({name: parentCategory.name, id: parentCategory.id});
                    }
                    if (!category.id) {
                        const id = shortid.generate();
                        return categoryStorage.save(id, { name: category.name, id, parentId, ancestors });
                    } else {
                        return categoryStorage.load(category.id);
                    }
                });
            }, Promise.resolve(null));
        } else {
            return Promise.resolve(null);
        }
    },

    uploadSchemePreview(schemeId, data) {
        return Promise.resolve(null);
    }
};
