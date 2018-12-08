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
    }
}
