/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import path from 'path';
import { DocumentIndex } from './documentIndex';
import { fileNameFromPath, folderPathFromPath, mediaFolder, removePrefix, schemioExtension } from './fsUtils';
import { walk } from './walk';

/**
 * @typedef {Object} IndexEntity
 * @property {String} id - entity id
 * @property {String} fsPath - path to entity on file system
 * @property {String} name - name of entity
 * @property {String} lowerName - name of entity but lower cased
 * 
 */

let currentIndex = new DocumentIndex();

function _indexScheme(index, schemeId, scheme, fsPath, previewURL) {
    if (!scheme.name) {
        scheme.name = '';
    }
    index.indexDocument(schemeId, {
        id: schemeId,
        fsPath,
        name: scheme.name,
        lowerName: scheme.name.toLowerCase(),
        modifiedTime: scheme.modifiedTime,
        previewURL
    }, folderPathFromPath(fsPath));
}

/**
 * 
 * @param {DocumentIndex} index 
 * @param {*} id 
 */
function _unindexScheme(index, id) {
    index.deleteDocument(id);
}

export function indexScheme(id, scheme, fsPath, previewURL) {
    _indexScheme(currentIndex, id, scheme, fsPath, previewURL);
}

export function unindexScheme(id) {
    _unindexScheme(currentIndex, id);
}

export function indexUpdateScheme(id, scheme) {
    currentIndex.updateDocument(id, {
        name: scheme.name,
        lowerName: scheme.name.toLowerCase(),
        modifiedTime: scheme.modifiedTime,
    });
}

export function indexUpdatePreviewURL(id, previewURL) {
    currentIndex.updateDocument(id, { previewURL });
}

export function indexFolder(folder, name, parentFolder) {
    currentIndex.indexFolder(folder, name, parentFolder);
}

export function indexMoveSchemeToFolder(id, fsPath, newFolder) {
    currentIndex.moveDocument(id, newFolder);
    currentIndex.updateDocument(id, {fsPath});
}
/**
 * 
 * @param {String} id 
 * @returns {IndexEntity} entity in index
 */
export function getDocumentFromIndex(id) {
    return currentIndex.getDocument(id);
}

export function searchIndexDocuments(query) {
    const lowerQuery = query.toLowerCase();
    const indexResults = currentIndex.search(doc => doc.lowerName.indexOf(lowerQuery) >= 0);
    return indexResults;  
}

export function listIndexDocumentsByFolder(folderPath) {
    return currentIndex.getDocumentsInFolder(folderPath);
}

export function listIndexFoldersByParent(parentFolder) {
    return currentIndex.getFoldersByParent(parentFolder);
}

/**
 * 
 * @param {DocumentIndex} index 
 * @param {*} config 
 * @returns 
 */
function _createIndexFromScratch(index, config) {
    const rootPath = config.fs.rootPath;

    console.log('Starting reindex in ', config.fs.rootPath);

    return walk(config.fs.rootPath, (filePath, isDirectory) => {
        let relativeFilePath = removePrefix(filePath, config.fs.rootPath);
        if (relativeFilePath.charAt(0) === '/') {
            relativeFilePath = relativeFilePath.substring(1);
        }

        if (isDirectory) {
            index.indexFolder(relativeFilePath, fileNameFromPath(relativeFilePath), folderPathFromPath(relativeFilePath));
        } else if (filePath.endsWith(schemioExtension)) {
            return fs.readFile(filePath).then(content => {
                const scheme = JSON.parse(content);
                let fsPath = filePath.substring(rootPath.length);
                if (fsPath.charAt(0) === '/') {
                    fsPath = fsPath.substring(1);
                }
                let schemeId = scheme.id;

                if (!schemeId) {
                    schemeId = fsPath.substring(0, fsPath.length - schemioExtension.length).replace(/[\W_]+/g,"-");
                    if (schemeId.charAt(0) === '-') {
                        schemeId = schemeId.substring(1);
                    }
                }

                if (!index.hasDocument(schemeId)) {
                    let previewURL = null;
                    if (fs.existsSync(path.join(config.fs.rootPath, mediaFolder, 'previews', `${schemeId}.svg`))) {
                        previewURL = `/media/previews/${schemeId}.svg`;
                    }
                    _indexScheme(index, schemeId, scheme, fsPath, previewURL);
                } else {
                    const existingDocument = index.getDocument(schemeId);
                    console.warn(`WARNING: Could not index document "${fsPath}" since its id is clashing with "${existingDocument.fsPath}"`);
                }

            })
            .catch(err => {
                console.error('Failed to index scheme file:' + filePath, err);
            });
        }
    }).then(() => {
        console.log('Finished indexing');
        return index;
    });
}

export function createIndex(config) {
    return _createIndexFromScratch(currentIndex, config);
}


/**
 * Searches through all sub-folders in given folder and collects documen ids
 * @param {*} folderPath 
 * @returns {Array<String>} document ids in specified folderPath
 */
export function getAllDocumentIdsInFolder(folderPath) {
    const ids = [];
    currentIndex.traverseDocumentsInFolder(folderPath, (doc, docId) => {
        ids.push(docId);
    });
    return ids;
}

//TODO implement a better version of indexing and do only partial reindex of changed items (e.g. when renaming directories or moving schemes)
export function reindex(config) {
    const newIndex = new DocumentIndex();
    return _createIndexFromScratch(newIndex, config).then(() => {
        currentIndex = newIndex;
        return newIndex;
    });
}

