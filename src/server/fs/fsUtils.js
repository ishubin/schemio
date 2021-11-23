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
