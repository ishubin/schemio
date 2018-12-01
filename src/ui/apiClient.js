import axios from 'axios';
import _ from 'lodash';
import shortid from 'shortid';

export default {
    loadScheme(schemeId) {
        return axios.get(`/api/schemes/${schemeId}`).then(response => {
            var scheme = response.data;

            _.forEach(scheme.items, item => {
                if (!item.hasOwnProperty('id')) {
                    item.id = shortid.generate();
                }
            });
            return scheme;
        });
    },

    createNewScheme(scheme) {
        return axios.post(`/api/schemes`, scheme).then(response => {
            return response.data;
        });
    }
}
