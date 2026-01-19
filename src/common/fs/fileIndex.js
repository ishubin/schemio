/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import path from 'path';
import { DocumentIndex } from './documentIndex';
import { addEntryToFileTree, deleteEntryFromFileTree, findEntryInFileTree, renameEntryInFileTree } from './fileTree';
import { folderPathFromPath, mediaFolder, schemioExtension } from './fsUtils';
import { walk } from './walk';

/**
 * @typedef {Object} IndexEntity
 * @property {String} id - entity id
 * @property {String} fsPath - path to entity on file system
 * @property {String} name - name of entity
 * @property {String} lowerName - name of entity but lower cased
 *
 */

/**
 * @typedef {Object} FileEntry
 * @property {String} kind
 * @property {String} name
 * @property {String} path
 * @property {Array<FileEntry>} children
 */


export class FileIndex {
    constructor(rootPath, isElectron, fileReader) {
        this.rootPath = rootPath;
        this.fileTree = null;
        this.index = new DocumentIndex();
        this.isElectron = isElectron;
        this.fileReader = fileReader;
    }

    indexScheme(schemeId, scheme, fsPath, previewURL) {
        _indexScheme(this.index, schemeId, scheme, fsPath, previewURL)
        const entry = findEntryInFileTree(this.fileTree, fsPath);
        if (!entry) {
            addEntryToFileTree(this.fileTree, path.dirname(fsPath), {
                id: scheme.id,
                name: scheme.name,
                path: fsPath,
                kind: 'schemio:doc',
                modifiedTime: scheme.modifiedTime
            });
        }
    }


    deleteFile(filePath) {
        const docId = this.index.getDocumentIdByPath(filePath);
        if (docId) {
            this.index.deleteDocument(docId);
        }
        deleteEntryFromFileTree(this.fileTree, filePath);
    }

    deleteFolder(folderPath) {
        deleteEntryFromFileTree(this.fileTree, folderPath);
    }

    renameFile(filePath, newName) {
        return renameEntryInFileTree(this.fileTree, filePath, newName, (oldPath, changedEntry) => {
            if (changedEntry.kind === 'schemio:doc') {
                this.index.updateDocument(changedEntry.id, {fsPath: changedEntry.path});
            }
        });
    }

    renameDiagramInTree(filePath, newName) {
        const diagramEntry = findEntryInFileTree(this.fileTree, filePath);
        if (!diagramEntry) {
            return;
        }
        diagramEntry.name = newName;
    }

    /**
     *
     * @param {*} id
     */
    unindexScheme(id) {
        this.index.deleteDocument(id);
    }

    updateScheme(id, scheme) {
        this.index.updateDocument(id, {
            name: scheme.name,
            lowerName: scheme.name.toLowerCase(),
            modifiedTime: scheme.modifiedTime,
        });
    }

    updatePreviewURL(id, previewURL) {
        const doc = this.index.getDocument(id);
        if (doc) {
            const entry = findEntryInFileTree(this.fileTree, doc.fsPath);
            if (entry) {
                entry.previewURL = previewURL;
            }
        }
        this.index.updateDocument(id, { previewURL });
    }

    indexFolder(folder, name, parentFolder) {
        const folderEntry = findEntryInFileTree(this.fileTree, folder);
        if (!folderEntry) {
            addEntryToFileTree(this.fileTree, parentFolder, {
                kind: 'dir',
                name,
                path: folder,
                children: []
            });
        }
    }

    moveSchemeToFolder(id, fsPath, newFolder) {
        this.index.moveDocument(id, fsPath, newFolder);
    }
    /**
     *
     * @param {String} id
     * @returns {IndexEntity} entity in index
     */
    getDocumentFromIndex(id) {
        return this.index.getDocument(id);
    }

    getDocumentFromIndexByPath(filePath) {
        const id = this.index.docIdsByPath.get(filePath);
        return this.index.getDocument(id);
    }

    searchIndexDocuments(query) {
        const lowerQuery = query.toLowerCase();
        const indexResults = this.index.search(doc => doc.lowerName.indexOf(lowerQuery) >= 0);
        return indexResults;
    }

    listFilesInFolder(folderPath) {
        if (!folderPath) {
            return this.fileTree;
        }

        const folderEntry = findEntryInFileTree(this.fileTree, folderPath);
        if (folderEntry) {
            return folderEntry.children;
        }
        return [];
    }

    /**
     *
     * @param {String} rootPath
     * @returns {Promise}
     */
    reindex() {
        console.log('Starting reindex in ', this.rootPath);
        return createIndexFromScratch(new DocumentIndex(), this.rootPath, this.isElectron, this.fileReader)
        .then(({index, fileTree}) => {
            this.index = index;
            this.fileTree = fileTree;
            console.log('Finished indexing');
        });
    }

    genereateDocId(name) {
        let id = name.trim();
        if (id.length > 6) {
            id = name.replace(/[\W_]+/g, '-').toLowerCase();
        }
        if (!this.getDocumentFromIndex(id)) {
            return id;
        }

        id = nanoid();
        if (id.charAt(0) === '-'){
            //doing this so that we don't get files that start with dash symbol
            id = '_' + id.substr(1);
        }
        return id;
    }

}

/**
 *
 * @param {DocumentIndex} index
 * @param {*} schemeId
 * @param {*} scheme
 * @param {*} fsPath
 * @param {*} previewURL
 */
function _indexScheme(index, schemeId, scheme, fsPath, previewURL) {
    if (!scheme.name) {
        scheme.name = '';
    }
    index.indexDocument(schemeId, {
        id: schemeId,
        fsPath,
        name: scheme.name || path.basename(fsPath),
        lowerName: scheme.name.toLowerCase(),
        modifiedTime: scheme.modifiedTime,
        link: `/docs/${schemeId}`,
        previewURL
    }, folderPathFromPath(fsPath));
}


/**
 *
 * @param {DocumentIndex} index
 * @param {String} rootPath
 * @returns
 */
function createIndexFromScratch(index, rootPath, isElectron, fileReader) {
    const fileTree = [];
    const allDirs = new Map();

    const findParentList = (filePath) => {
        const parentDir = allDirs.get(path.dirname(filePath));
        if (parentDir) {
            return parentDir.children;
        }
        return fileTree;
    };


    return walk(rootPath, (filePath, isDirectory) => {
        let relativeFilePath = path.relative(rootPath, filePath);
        if (relativeFilePath.charAt(0) === '/') {
            relativeFilePath = relativeFilePath.substring(1);
        }
        const fsPath = path.relative(rootPath, filePath);
        if (isDirectory) {
            const dirEntry = {
                kind: 'dir',
                path: relativeFilePath,
                name: path.basename(filePath),
                children: []
            };
            findParentList(relativeFilePath).push(dirEntry);
            allDirs.set(relativeFilePath, dirEntry);

        } else if (filePath.endsWith(schemioExtension)) {
            return fileReader(fsPath).then(file => {
                const scheme = file.content;

                let schemeId = scheme.id;

                if (!schemeId) {
                    schemeId = fsPath.substring(0, fsPath.length - schemioExtension.length).replace(/[\W_]+/g,"-");
                    if (schemeId.charAt(0) === '-') {
                        schemeId = schemeId.substring(1);
                    }
                }

                let previewURL = null;
                if (fs.existsSync(path.join(rootPath, mediaFolder, 'previews', `${schemeId}.png`))) {
                    if (isElectron) {
                        previewURL = `media://local/previews/${schemeId}.png`;
                    } else {
                        previewURL = `/media/previews/${schemeId}.png`;
                    }
                }

                findParentList(relativeFilePath).push({
                    id: scheme.id,
                    kind: 'schemio:doc',
                    path: path.relative(rootPath, filePath),
                    name: scheme.name || path.basename(filePath),
                    previewURL,
                    modifiedTime: scheme.modifiedTime
                });

                if (!index.hasDocument(schemeId)) {
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
        return {
            index,
            fileTree
        };
    });
}
