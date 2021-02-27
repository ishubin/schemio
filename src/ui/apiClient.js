/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import axios from 'axios';
import utils from './utils.js';
import { defaultifyScheme } from './scheme/Scheme';


function unwrapAxios(response) {
    return response.data;
}

function unwrapAxiosError(err) {
    return Promise.reject({
        statusCode: err.response.status,
        data: err.response.data
    });
}

const XSRF_TOKEN_HEADER = 'xsrf-token';

let xsrfToken = window.localStorage.getItem(XSRF_TOKEN_HEADER);


const _axiosInstance = axios.create({
    timeout: 10000,
});

_axiosInstance.interceptors.request.use(config => {
    if (xsrfToken && config.method !== 'get') {
        config.headers[XSRF_TOKEN_HEADER] = xsrfToken;
    }
    return config;
});

_axiosInstance.interceptors.response.use(response => {
    // renew xsrf token with each request
    if (response.headers[XSRF_TOKEN_HEADER]) {
        xsrfToken = response.headers[XSRF_TOKEN_HEADER];
        window.localStorage.setItem(XSRF_TOKEN_HEADER, xsrfToken);
    }
    return response;
});


function $axios() {
    return _axiosInstance;
}

export default {
    getUserById(userId) {
        return $axios().get(`/v1/users/${userId}`).then(unwrapAxios).catch(unwrapAxiosError);
    },

    getCurrentUser() {
        return $axios().get('/v1/user').then(unwrapAxios);
    },

    saveUserProfile(user) {
        return $axios().put('/v1/user', user).then(unwrapAxios);
    },

    createProject(project) {
        return $axios().post('/v1/projects', project).then(unwrapAxios).catch(unwrapAxiosError);
    },

    patchProject(projectId, {name, description, isPublic}) {
        const payload = [];
        if (name) {
            payload.push({ op: 'update', field: 'name', value: name });
        }
        if (description) {
            payload.push({ op: 'update', field: 'description', value: description });
        }
        if (typeof isPublic !== 'undefined') {
            payload.push({ op: 'update', field: 'isPublic', value: isPublic });
        }

        return $axios().patch(`/v1/projects/${projectId}`, payload).then(unwrapAxios).catch(unwrapAxiosError);
    },

    findProjects({userId, query, offset}) {
        let encodedQuery = encodeURIComponent(query || '');
        let url = `/v1/projects?offset=${offset || 0}&q=${encodedQuery}`;
        if (userId) {
            url += `&userId=${userId}`;
        }
        return $axios().get(url).then(unwrapAxios);
    },

    getProject(projectId) {
        return $axios().get(`/v1/projects/${projectId}`).then(unwrapAxios);
    },

    deleteProject(projectId) {
        return $axios().delete(`/v1/projects/${projectId}`).then(unwrapAxios).catch(unwrapAxiosError);
    },

    login(login, password) {
        return $axios().post('/v1/login', {login, password}).then(unwrapAxios);
    },

    createArt(projectId, art) {
        return $axios().post(`/v1/projects/${projectId}/art`, art).then(unwrapAxios);
    },

    getAllArt(projectId) {
        return $axios().get(`/v1/projects/${projectId}/art`).then(unwrapAxios);
    },

    getGlobalArt() {
        return $axios().get(`/v1/art`).then(unwrapAxios);
    },

    saveArt(projectId, artId, art) {
        return $axios().put(`/v1/projects/${projectId}/art/${artId}`, art).then(unwrapAxios);
    },

    deleteArt(projectId, artId) {
        return $axios().delete(`/v1/projects/${projectId}/art/${artId}`).then(unwrapAxios);
    },

    loadScheme(projectId, schemeId) {
        return $axios().get(`/v1/projects/${projectId}/schemes/${schemeId}`).then(unwrapAxios).catch(unwrapAxiosError);
    },

    createNewScheme(projectId, scheme) {
        return $axios().post(`/v1/projects/${projectId}/schemes`, scheme).then(unwrapAxios);
    },

    saveScheme(projectId, schemeId, scheme) {
        if (schemeId && schemeId.trim().length > 0) {
            const sanitizedScheme = utils.sanitizeScheme(scheme);
            const defScheme = defaultifyScheme(sanitizedScheme);

            return $axios().put(`/v1/projects/${projectId}/schemes/${schemeId}`, defScheme).then(unwrapAxios).then(() => {
                return 'saved';
            });
        } else {
            return Promise.resolve(null);
        }
    },

    deleteScheme(projectId, schemeId) {
        if (schemeId && schemeId.trim().length > 0) {
            return $axios().delete(`/v1/projects/${projectId}/schemes/${schemeId}`).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    deleteMultipleSchemes(projectId, schemeIds) {
        return $axios().post(`/v1/projects/${projectId}/delete-schemes`, schemeIds).then(unwrapAxios);
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

        url =`${url}&_t=${Math.round(Math.random()*10000)}`;

        return $axios().get(url).then(unwrapAxios);
    },

    getTags(projectId) {
        return $axios().get(`/v1/projects/${projectId}/tags`).then(unwrapAxios);
    },

    createCategory(projectId, categoryName, parentCategoryId) {
        return $axios().post(`/v1/projects/${projectId}/categories`, {
            name: categoryName,
            parentId: parentCategoryId
        }).then(unwrapAxios);
    },

    deleteCategory(projectId, categoryId) {
        return $axios().delete(`/v1/projects/${projectId}/categories/${categoryId}`).then(unwrapAxios);
    },

    updateCategory(projectId, categoryId, category) {
        if (category && category.name) {
            return $axios().put(`/v1/projects/${projectId}/categories/${categoryId}`, {
                name: category.name
            }).then(unwrapAxios);
        } else {
            return Promise.reject('Incorrect category');
        }
    },

    moveCategory(projectId, categoryId, newParentCategoryId) {
        return $axios().post(`/v1/projects/${projectId}/move-category`, {
            categoryId: categoryId,
            destinationCategoryId: newParentCategoryId
        }).then(unwrapAxios);
    },

    getCategoryTree(projectId) {
        return $axios().get(`/v1/projects/${projectId}/category-tree`).then(unwrapAxios);
    },

    ensureCategoryStructure(projectId, categories) {
        if (categories && categories.length > 0) {
            return $axios().put(`/v1/projects/${projectId}/category-structure`, categories).then(unwrapAxios);
        } else {
            return Promise.resolve(null);
        }
    },

    uploadSchemeSvgPreview(projectId, schemeId, svgCode) {
        return $axios().post(`/v1/projects/${projectId}/schemes/${schemeId}/preview`, {svg: svgCode}).then(unwrapAxios);
    },

    uploadFile(projectId, file) {
        var form = new FormData();
        form.append('file', file, file.name);
        this.errorUploading = false;
        return $axios().post(`/v1/projects/${projectId}/files`, form).then(unwrapAxios).then(data => {
            return data.url;
        });
    },

    styles: {
        saveStyle(fill, strokeColor, textColor) {
            return $axios().post(`/v1/user/styles`, { fill, strokeColor, textColor }).then(unwrapAxios);
        },

        getStyles() {
            return $axios().get('/v1/user/styles/').then(unwrapAxios);
        },

        deleteStyle(styleId) {
            return $axios().delete(`/v1/user/styles/${styleId}`).then(unwrapAxios);
        }
    }
}
