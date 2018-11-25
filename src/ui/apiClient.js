import axios from 'axios';

export default {
    loadScheme(schemeId) {
        return axios.get(`/api/schemes/${schemeId}`).then(response => {
            return response.data;
        });
    }
}
