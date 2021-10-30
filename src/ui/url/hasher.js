/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';

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