import _ from 'lodash';

export default {
    encodeURLHash(params) {
        let result = '';
        let isFirst = true;
        _.forEach(params, (value, key) => {
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
        _.forEach(keyValues, keyValue => {
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