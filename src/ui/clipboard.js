/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


// Used to store clipboard content so that it can be used in case it failed to copy to clipboard
let fallbackCopyBuffer = null;


export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).catch(err => {
        fallbackCopyBuffer = text;
    });
}

/**
 * Returns promise with text as a first argument
 */
export function getTextFromClipboard() {
    return navigator.clipboard.readText().catch(err => {
        return fallbackCopyBuffer;
    });
}

/**
 *
 * @param {String} kind
 * @param {Object} data
 * @returns {Promise}
 */
export function copyObjectToClipboard(kind, data) {
    return copyToClipboard(JSON.stringify({kind, data}));
}

/**
 *
 * @param {String} kind
 * @returns {Promise}
 */
export function getObjectFromClipboard(kind) {
    return getTextFromClipboard().then(text => {
        try {
            const obj = JSON.parse(text);
            if (obj && obj.kind === kind && obj.hasOwnProperty('data')) {
                return obj.data;
            }
        }
        catch(err) {
            return null;
        }
    });
}