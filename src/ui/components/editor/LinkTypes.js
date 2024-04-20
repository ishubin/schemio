/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { find } from "../../collections";

const _knownTypes = [{
    name: 'default',
    fontAwesomeSymbol: '\uf0c1',
    cssClass: 'fas fa-link'
}, {
    name: 'doc',
    fontAwesomeSymbol: '\uf542',
    cssClass: 'fas fa-project-diagram'
}, {
    name: 'logs',
    fontAwesomeSymbol: '\uf550',
    cssClass: 'fas fa-stream'
}, {
    name: 'graphs',
    fontAwesomeSymbol: '\uf201',
    cssClass: 'fas fa-chart-line'
}, {
    name: 'video',
    fontAwesomeSymbol: '\uf03d',
    cssClass: 'fas fa-video'
}, {
    name: 'file',
    fontAwesomeSymbol: '\uf15b',
    cssClass: 'fa-solid fa-file'
}];

const imageFileIcon = {
    fontAwesomeSymbol: '\uf1c5',
    cssClass: 'fa-regular fa-file-image'
};
const wordFileIcon = {
    fontAwesomeSymbol: '\uf1c2',
    cssClass: 'fa-solid fa-file'
};
const excelFileIcon = {
    fontAwesomeSymbol: '\uf1c3',
    cssClass: 'fa-solid fa-file-excel'
};
const archiveFileIcon = {
    fontAwesomeSymbol: '\uf1c6',
    cssClass: 'fa-solid fa-file-zipper'
};

const _knownFileExtensions = {
    default: {
        fontAwesomeSymbol: '\uf15b',
        cssClass: 'fa-solid fa-file'
    },
    pdf: {
        fontAwesomeSymbol: '\uf1c1',
        cssClass: 'fa-solid fa-file-pdf'
    }
};

function setFileIconForExtensions(icon, extensions) {
    extensions.forEach(ext => _knownFileExtensions[ext] = icon);
}

setFileIconForExtensions(imageFileIcon, ['jpg', 'png', 'bmp', 'gif', 'tiff']);
setFileIconForExtensions(wordFileIcon, ['doc', 'docx', 'odt', 'rtf']);
setFileIconForExtensions(excelFileIcon, ['xls', 'xlsx']);
setFileIconForExtensions(archiveFileIcon, ['zip', 'gz', 'bz2', 'iso']);

export default {
    knownTypes: _knownTypes,
    findTypeByNameOrDefault(name) {
        var linkType = find(_knownTypes, t => t.name === name);
        if (linkType) {
            return linkType;
        } else {
            return _knownTypes[0];
        }
    },

    findFileIcon(extension) {
        if (_knownFileExtensions.hasOwnProperty(extension)) {
            return _knownFileExtensions[extension];
        }

        return _knownFileExtensions.default;
    }
}
