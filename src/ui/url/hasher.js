import {forEach} from 'lodash';

export default {
    encodeURLHash(params) {
        let result = '';
        let isFirst = true;
        forEach(params, (value, key) => {
            if (!isFirst) {
                result += ';';
            }
            result += key + ':' + encodeURIComponent(value);
            isFirst = false;
        });
        return result;
    },

    decodeURLHash(urlHash) {
        if (!urlHash) {
            return {};
        }

        const result = {};
        const keyValues = urlHash.split(';');
        forEach(keyValues, keyValue => {
            const arr = keyValue.split(':')
            if (arr.length > 1) {
                result[arr[0]] = decodeURIComponent(arr[1]);
            }
        })
        return result;
    },

    changeURLHash(hashValue) {
        if(history && history.pushState) {
            history.pushState(null, null, '#' + hashValue);
        }
        else {
            location.hash = '#' + hashValue;
        }
    }
}