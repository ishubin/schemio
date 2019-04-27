/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import axios from 'axios';
import _ from 'lodash';
import shortid from 'shortid';


function sanitizeItem(oldItem) {
    var item = {};
    _.forEach(oldItem, (value, field) => {
        if (field === 'connectors') {
            item.connectors = _.map(value, sanitizeConnector);
        } else if (field !== 'meta') {
            item[field] = value;
        }
    });
    return item;
}
function sanitizeConnector(oldConnector) {
    var connector = {};
    _.forEach(oldConnector, (value, field) => {
        if (field !== 'meta') {
            connector[field] = value;
        }
    });
    return connector;
}


function sanitizeScheme(scheme) {
    var items = _.map(scheme.items, sanitizeItem);
    return {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description,
        tags: scheme.tags,
        modifiedDate: scheme.modifiedDate,
        categoryId: scheme.categoryId,
        items: items
    }
}

export default {
    getCurrentUser() {
        return axios.get('/api/user').then(response => {
            return response.data;
        }).catch(err => {
            return null;
        });
    },


    login(login, password) {
        return axios.post('/api/login', {login, password}).then(response => {
            return response;
        });
    },

    createArt(art) {
        return axios.post('/api/art', art).then(response => {
            return response.data;
        });
    },

    getAllArt() {
        return axios.get('/api/art').then(response => {
            return response.data;
        });
    },

    loadScheme(schemeId) {
        return axios.get(`/api/schemes/${schemeId}`).then(response => {
            var scheme = response.data;

            //TODO move this to server
            _.forEach(scheme.items, item => {
                item.meta = {};
                if (!item.hasOwnProperty('id')) {
                    item.id = shortid.generate();
                }
                if (!item.hasOwnProperty('tags')) {
                    item.tags = [];
                }
            });
            return scheme;
        });
    },

    createNewScheme(scheme) {
        return axios.post(`/api/schemes`, scheme).then(response => {
            return response.data;
        });
    },

    saveScheme(schemeId, scheme) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.put(`/api/schemes/${schemeId}`, sanitizeScheme(scheme)).then(response => {
                return 'saved';
            });
        } else {
            return Promise.resolve(null);
        }
    },

    deleteScheme(schemeId) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.delete(`/api/schemes/${schemeId}`).then(response => {
                return response.data;
            });
        } else {
            return Promise.resolve(null);
        }
    },

    findSchemes(filters) {
        var encodedQuery = encodeURIComponent(filters.query || '');
        return axios.get(`/api/schemes?offset=${filters.offset || 0}&q=${encodedQuery}`).then(response => {
            return response.data;
        });
    },

    getSchemesInCategory(categoryId) {
        if (!categoryId) {
            categoryId = 0;
        }
        return axios.get(`/api/schemes?category=${categoryId}`).then(response => {
            return response.data;
        });
    },

    getTags() {
        return axios.get('/api/tags').then(response => {
            return response.data;
        });
    },

    getShapes() {
        return axios('/api/shapes').then(response => {
            return response.data;
        });
    },

    getCategory(parentCategoryId) {
        var id = parentCategoryId ? parentCategoryId : '';
        return axios.get(`/api/categories/${id}`).then(response => {
            return response.data;
        });
    },

    ensureCategoryStructure(categories) {
        if (categories && categories.length > 0) {
            return axios.put(`/api/category-structure`, categories).then(response => {
                return response.data;
            });
        } else {
            return Promise.resolve(null);
        }
    },

    uploadSchemeThumbnail(schemeId, data) {
        return axios.post(`/api/scheme-thumnbails/${schemeId}`, {image: data}).then(response => {
            return response.data;
        });
    }
}
