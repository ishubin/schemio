/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "./myMath";

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
        if (text.length >= 8) {
            a = parseInt(text.substring(6, 8), 16) / 255;
        }
    }

    return {r,g,b,a};
}

function hexByte(value) {
    const str = Math.floor(value).toString(16).toUpperCase();
    if (str.length === 1) {
        return '0' + str;
    }
    return str;
}

/**
 *
 * @param {ColorRGBA} color structure of {r,g,b,a}
 */
export function encodeColor(c) {
    const r = hexByte(c.r);
    const g = hexByte(c.g);
    const b = hexByte(c.b);
    const a = hexByte(myMath.clamp(c.a * 256, 0, 255));

    return `#${r}${g}${b}${a}`;
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

export function rgb2hsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const m1 = Math.min(r, g, b);
    const m2 = Math.max(r, g, b);

    const md = m2 - m1;
    const l = (m1 + m2) / 2;

    if (myMath.tooSmall(md)) {
        return {h: 0, s: 0, l};
    }

    const s = l >= 0.5 ? ((m2 - m1)/(m2 + m1)) : ((m2 - m1)/(2.0 - m2 - m1));

    let h = 0;
    if (m2 === r) {
        h = (g - b) / md;
    } else if (m2 === g) {
        h = 2 + (b - r) / md;
    } else if (m2 === b) {
        h = 4 + (r - g) / md;
    }

    h *= 60;
    if (h < 0) {
        h += 360;
    }

    return {
        h, s, l
    };
}

export function hsl2rgb(h, s, l) {
    const c = (1 - Math.abs(2*l - 1)) * s;
    const h1 = h / 60;
    const x = c * (1 - Math.abs(h1 % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

    if (h1 < 1) {
        r = c; g = x; b = 0;
    } else if (h1 < 2) {
        r = x; g = c; b = 0;
    } else if (h1 < 3) {
        r = 0; g = c; b = x;
    } else if (h1 < 4) {
        r = 0; g = x; b = c;
    } else if (h1 < 5) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    r = Math.min(Math.floor((r + m) * 256), 255);
    g = Math.min(Math.floor((g + m) * 256), 255);
    b = Math.min(Math.floor((b + m) * 256), 255);
    return {r, g, b};
}


export function isValidColor(text) {
    try {
        _parseColor(text);
        return true;
    } catch(ex) {
        return false;
    }
}