/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';

export function createHasher(mode) {

    return {
        encodeURLHash(params) {
            let result = '';
            let isFirst = true;
            forEach(params, (value, key) => {
                if (!isFirst) {
                    result += '&';
                }
                result += key + '=' + encodeURIComponent(value);
                isFirst = false;
            });
            return result;
        },

        decodeURLHash(urlHash) {
            if (urlHash.startsWith('#')) {
                urlHash = urlHash.substring(1);
            }

            if (!urlHash) {
                return {};
            }

            const result = {};

            let encodedParams = urlHash;
            if (mode === 'hash') {
                const idx = urlHash.indexOf('?');
                if (idx >= 0) {
                    encodedParams = urlHash.substring(idx + 1);
                } else {
                    return {};
                }
            }

            const keyValues = encodedParams.split('&');
            forEach(keyValues, keyValue => {
                const arr = keyValue.split('=')
                if (arr.length > 1) {
                    result[arr[0]] = decodeURIComponent(arr[1]);
                }
            })
            return result;
        },

        changeURLHash(params) {
            const hashValue = this.encodeURLHash(params);

            if (mode === 'hash') {
                let firstPart = location.hash;
                const idx = location.hash.indexOf('?');
                if (idx >= 0) {
                    firstPart = location.hash.substring(0, idx);
                }

                if (firstPart.length === 0 && firstPart.charAt(0) !== '#') {
                    firstPart = '#' + firstPart;
                }
                history.pushState(null, null, firstPart + '?' + hashValue);
            } else {
                history.pushState(null, null, '#' + hashValue);
            }
        }
    };
}
