/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export const schemioExtension = '.schemio.json';
export const mediaFolder = '.media';

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

export function getFileExtension(name) {
    const idx = name.lastIndexOf('.');
    if (idx > 0) {
        return name.substring(idx + 1);
    }
    return '';
}

export function leftZeroPad(number) {
    if (number >= 0 && number < 10) {
        return '0' + number;
    }
    return '' + number;
}