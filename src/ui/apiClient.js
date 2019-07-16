/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import axios from 'axios';
import _ from 'lodash';
import utils from './utils.js';


function unwrapAxios(response) {
    return response.data;
}

export default {
    getCurrentUser() {
        return axios.get('/api/user').then(unwrapAxios).catch(err => {
            return null;
        });
    },

    createProject(project) {
        return axios.post('/api/projects', project).then(unwrapAxios);
    },

    login(login, password) {
        return axios.post('/api/login', {login, password}).then(unwrapAxios);
    },

    createArt(art) {
        return axios.post('/api/art', art).then(unwrapAxios);
    },

    getAllArt() {
        return axios.get('/api/art').then(unwrapAxios);
    },

    loadScheme(schemeId) {
        return axios.get(`/api/schemes/${schemeId}`).then(unwrapAxios);
    },

    createNewScheme(scheme) {
        return axios.post(`/api/schemes`, scheme).then(unwrapAxios);
    },

    saveScheme(schemeId, scheme) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.put(`/api/schemes/${schemeId}`, utils.sanitizeScheme(scheme)).then(response => {
                return 'saved';
            });
        } else {
            return Promise.resolve(null);
        }
    },

    deleteScheme(schemeId) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.delete(`/api/schemes/${schemeId}`).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    findSchemes(filters) {
        let encodedQuery = encodeURIComponent(filters.query || '');
        let url = `/api/schemes?offset=${filters.offset || 0}&q=${encodedQuery}`;
        if (filters.categoryId) {
            url = `${url}&category=${encodeURIComponent(filters.categoryId)}`;
        }
        if (filters.includeSubcategories) {
            url = `${url}&includeSubcategories=true`;
        }

        return axios.get(url).then(unwrapAxios);
    },

    getTags() {
        return axios.get('/api/tags').then(unwrapAxios);
    },

    getCategory(parentCategoryId) {
        var id = parentCategoryId ? parentCategoryId : '';
        return axios.get(`/api/categories/${id}`).then(unwrapAxios);
    },

    getCategoryTree() {
        return axios.get(`/api/category-tree`).then(unwrapAxios);
    },

    ensureCategoryStructure(categories) {
        if (categories && categories.length > 0) {
            return axios.put(`/api/category-structure`, categories).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    uploadSchemeThumbnail(schemeId, data) {
        return axios.post(`/api/scheme-thumnbails/${schemeId}`, {image: data}).then(unwrapAxios);
    }
}
