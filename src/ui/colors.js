/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function parseCommaSeparateRgba(text) {
    const arr = text.split(',');

    let r = 0, g = 0, b = 0, a = 1.0;

    if (arr.length > 0) {
        r = parseInt(arr[0]);
    }
    if (arr.length > 1) {
        g = parseInt(arr[1]);
    }
    if (arr.length > 2) {
        b = parseInt(arr[2]);
    }
    if (arr.length > 3) {
        a = parseFloat(arr[3]);
    }
    return {r,g,b,a};
}

function parseHexColor(text) {
    let r = 0, g = 0, b = 0, a = 1.0;

    if (text.length === 3) {
        r = parseInt(`${text[0]}${text[0]}`, 16);
        g = parseInt(`${text[1]}${text[1]}`, 16);
        b = parseInt(`${text[2]}${text[2]}`, 16);
    } else {
        if (text.length >= 2) {
            r = parseInt(text.substring(0, 2), 16);
        }
        if (text.length >= 4) {
            g = parseInt(text.substring(2, 4), 16);
        }
        if (text.length >= 6) {
            b = parseInt(text.substring(4, 6), 16);
        }
    }

    return {r,g,b,a};
}

/**
 *
 * @param {ColorRGBA} color structure of {r,g,b,a}
 */
export function encodeColor(c) {
    return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

/**
 *
 * @param {String} text encoded color in rgb(), rgba(), or hex format
 * @returns {ColorRGBA} {r,g,b,a} structure
 */
export function parseColor(text) {
    try {
        return _parseColor(text);
    } catch(e) {
    }
    return {r: 0, g: 0, b: 0, a: 1.0};
}

function _parseColor(text) {
    text = text.toLowerCase();
    const bracketIdx = text.indexOf('(');
    const closeBracketIdx = text.indexOf(')');
    if (bracketIdx > 0 && closeBracketIdx > 0) {
        const firstWord = text.substring(0, bracketIdx).trim();
        if (firstWord === 'rgb' || firstWord === 'rgba') {
            return parseCommaSeparateRgba(text.substring(bracketIdx+1, closeBracketIdx));
        }
    }

    if (text.charAt(0) === '#') {
        return parseHexColor(text.substring(1));
    }

    throw new Error('Cannot parse color: ' + text);
}

export function isValidColor(text) {
    try {
        _parseColor(text);
        return true;
    } catch(ex) {
        return false;
    }
}