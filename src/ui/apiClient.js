import axios from 'axios';
import _ from 'lodash';
import shortid from 'shortid';

export default {
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
            return axios.put(`/api/schemes/${schemeId}`, scheme).then(response => {
                return 'saved';
            });
        } else {
            return Promise.resolve(null);
        }
    },

    findSchemes(query, offset) {
        var encodedQuery = encodeURIComponent(query);
        return axios.get(`/api/schemes?offset=${offset}&q=${encodedQuery}`).then(response => {
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
    }
}
