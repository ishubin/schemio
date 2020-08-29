/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import axios from 'axios';
import utils from './utils.js';


function unwrapAxios(response) {
    return response.data;
}

function unwrapAxiosError(err) {
    return Promise.reject({
        statusCode: err.response.status,
        data: err.response.data
    });
}

export default {
    getCurrentUser() {
        return axios.get('/v1/user').then(unwrapAxios).catch(err => {
            return null;
        });
    },

    createProject(project) {
        return axios.post('/v1/projects', project).then(unwrapAxios).catch(unwrapAxiosError);
    },

    findProjects(filters) {
        let encodedQuery = encodeURIComponent(filters.query || '');
        let url = `/v1/projects?offset=${filters.offset || 0}&q=${encodedQuery}`;
        return axios.get(url).then(unwrapAxios);
    },

    getProject(projectId) {
        return axios.get(`/v1/projects/${projectId}`).then(unwrapAxios);
    },

    login(login, password) {
        return axios.post('/v1/login', {login, password}).then(unwrapAxios);
    },

    createArt(projectId, art) {
        return axios.post(`/v1/projects/${projectId}/art`, art).then(unwrapAxios);
    },

    getAllArt(projectId) {
        return axios.get(`/v1/projects/${projectId}/art`).then(unwrapAxios);
    },

    getGlobalArt() {
        return axios.get(`/v1/art`).then(unwrapAxios);
    },

    saveArt(projectId, artId, art) {
        return axios.put(`/v1/projects/${projectId}/art/${artId}`, art).then(unwrapAxios);
    },

    deleteArt(projectId, artId) {
        return axios.delete(`/v1/projects/${projectId}/art/${artId}`).then(unwrapAxios);
    },

    loadScheme(projectId, schemeId) {
        return axios.get(`/v1/projects/${projectId}/schemes/${schemeId}`).then(unwrapAxios).catch(unwrapAxiosError);
    },

    createNewScheme(projectId, scheme) {
        return axios.post(`/v1/projects/${projectId}/schemes`, scheme).then(unwrapAxios);
    },

    saveScheme(projectId, schemeId, scheme) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.put(`/v1/projects/${projectId}/schemes/${schemeId}`, utils.sanitizeScheme(scheme)).then(response => {
                return 'saved';
            });
        } else {
            return Promise.resolve(null);
        }
    },

    deleteScheme(projectId, schemeId) {
        if (schemeId && schemeId.trim().length > 0) {
            return axios.delete(`/v1/projects/${projectId}/schemes/${schemeId}`).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    findSchemes(projectId, filters) {
        let encodedQuery = encodeURIComponent(filters.query || '');
        let url = `/v1/projects/${projectId}/schemes?offset=${filters.offset || 0}&q=${encodedQuery}`;
        if (filters.categoryId) {
            url = `${url}&category=${encodeURIComponent(filters.categoryId)}`;
        }
        if (filters.includeSubcategories) {
            url = `${url}&includeSubcategories=true`;
        }
        if (filters.tag) {
            url = `${url}&tag=${encodeURIComponent(filters.tag)}`;
        }

        return axios.get(url).then(unwrapAxios);
    },

    getTags(projectId) {
        return axios.get(`/v1/projects/${projectId}/tags`).then(unwrapAxios);
    },

    createCategory(projectId, categoryName, parentCategoryId) {
        return axios.post(`/v1/projects/${projectId}/categories`, {
            name: categoryName,
            parentId: parentCategoryId
        }).then(unwrapAxios);
    },

    deleteCategory(projectId, categoryId) {
        return axios.delete(`/v1/projects/${projectId}/categories/${categoryId}`).then(unwrapAxios);
    },

    getCategory(projectId, parentCategoryId) {
        var id = parentCategoryId ? parentCategoryId : '';
        return axios.get(`/v1/projects/${projectId}/categories/${id}`).then(unwrapAxios);
    },

    updateCategory(projectId, categoryId, category) {
        if (category && category.name) {
            return axios.put(`/v1/projects/${projectId}/categories/${categoryId}`, {
                name: category.name
            }).then(unwrapAxios);
        } else {
            return Promise.reject('Incorrect category');
        }
    },

    moveCategory(projectId, categoryId, newParentCategoryId) {
        return axios.post(`/v1/projects/${projectId}/move-category`, {
            categoryId: categoryId,
            destinationCategoryId: newParentCategoryId
        }).then(unwrapAxios);
    },

    getCategoryTree(projectId) {
        return axios.get(`/v1/projects/${projectId}/category-tree`).then(unwrapAxios);
    },

    ensureCategoryStructure(projectId, categories) {
        if (categories && categories.length > 0) {
            return axios.put(`/v1/projects/${projectId}/category-structure`, categories).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    uploadSchemeSvgPreview(projectId, schemeId, svgCode) {
        return axios.post(`/v1/projects/${projectId}/scheme-preview/${schemeId}`, {svg: svgCode}).then(unwrapAxios);
    },

    uploadFile(projectId, file) {
        var form = new FormData();
        form.append('file', file, file.name);
        this.errorUploading = false;
        return axios.post(`/projects/${projectId}/files`, form).then(response => {
            return response.data.path;
        });
    },

    styles: {
        saveStyle(fill, strokeColor, textColor) {
            return axios.post(`/v1/user/styles`, { fill, strokeColor, textColor }).then(unwrapAxios);
        },

        getStyles() {
            return axios.get('/v1/user/styles/').then(unwrapAxios);
        },

        deleteStyle(styleId) {
            return axios.delete(`/v1/user/styles/${styleId}`).then(unwrapAxios);
        }
    }
}
