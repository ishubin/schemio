import axios from 'axios';

function unwrapAxios(response) {
    return response.data;
}

export default {
    listEntries(path) {
        let url = '/v1/fs/list';
        if (path) {
            url = url + '?path=' + encodeURIComponent(path);
        }
        return axios.get(url).then(unwrapAxios);
    }
}