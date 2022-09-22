/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const schemioExtension = '.schemio.json';
export const mediaFolder = '.media';
export const supportedMediaExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'tiff',
    'bmp',
    'svg'
]);

export function fileNameFromPath(filePath) {
    const idx = filePath.lastIndexOf('/');
    if (idx >= 0) {
        return filePath.substring(idx + 1);
    }
    return filePath;
}

export function folderPathFromPath(filePath) {
    const idx = filePath.lastIndexOf('/');
    if (idx >= 0) {
        return filePath.substring(0, idx);
    } else if (idx === 0) {
        return '/';
    }
    return null;
}

export function removePrefix(text, prefix) {
    let i = 0;
    for (i = 0; i < text.length && i < prefix.length; i++) {
        if (text.charAt(i) !== prefix.charAt(i)) {
            break;
        }
    }
    return text.substring(i);
}