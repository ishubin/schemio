/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const FONTS_ENCODED = [
    'Arial, Helvetica, sans-serif',
    '"Arial Black", Gadget, sans-serif',
    '"Book Antiqua", Palatino, serif',
    '"Comic Sans MS", cursive, sans-serif',
    '"Courier New", Courier, monospace',
    'Georgia, serif',
    'Helvetica, sans-serif',
    'Impact, Charcoal, sans-serif',
    '"Lucida Grande", sans-serif',
    '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
    '"Lucida Console", Monaco, monospace',
    'Monaco, monospace',
    '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    'Tahoma, Geneva, sans-serif',
    '"Times New Roman", Times, serif',
    '"Trebuchet MS", Helvetica, sans-serif',
    'Verdana, Geneva, sans-serif',
    'Alfa Slab One',
    'Cherry Swash',
    'Caveat Brush',
    'Heebo',
    'Carter One',
    'Permanent Marker',
    'Josefin Sans',
    'Cherry Swash',
    'Josefin Sans',
    'Knewave'
];

function loadFonts() {
    const fonts = {};
    for (let i = 0; i < FONTS_ENCODED.length; i++) {
        let commaIdx = FONTS_ENCODED[i].indexOf(',');
        let fontName = FONTS_ENCODED[i].trim();
        if (commaIdx > 0) {
            fontName = FONTS_ENCODED[i].substring(0, commaIdx).trim();
        }
        if (fontName.charAt(0) === '"' && fontName.charAt(fontName.length - 1) === '"') {
            fontName = fontName.substring(1, fontName.length - 1);
        }
        fonts[fontName] = FONTS_ENCODED[i];
    }

    return fonts;    
}

function createFontsList(fonts) {
    const fontsList = [];
    for (let fontName in fonts) {
        if (fonts.hasOwnProperty(fontName)) {
            fontsList.push({name: fontName, family: fonts[fontName]});
        }
    }
    
    fontsList.sort((a,b) => {
        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    return fontsList;
}

const FONTS = loadFonts();
const FONTS_LIST = createFontsList(FONTS);

export function getDefaultFont() {
    return 'Arial';
}

export function getFontFamilyFor(fontName) {
    const family = FONTS[fontName];
    if (family) {
        return family;
    }
    return 'Arial, Helvetica, sans-serif';
}

export function getAllFonts() {
    return FONTS_LIST;
}