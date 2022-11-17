/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import path from 'path';
import { DocumentIndex } from './documentIndex';
import { addEntryToFileTree, deleteEntryFromFileTree, findEntryInFileTree, moveEntryInFileTree, renameEntryInFileTree, traverseFileTree } from './fileTree';
import { fileNameFromPath, folderPathFromPath, mediaFolder, schemioExtension } from './fsUtils';
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
    constructor() {
        this.rootPath = null;
        this.fileTree = null;
        this.index = new DocumentIndex();
        this.isElectron = false;
    }

    indexScheme(schemeId, scheme, fsPath, previewURL) {
        _indexScheme(this.index, schemeId, scheme, fsPath, previewURL)
        const entry = findEntryInFileTree(this.fileTree, fsPath);
        if (!entry) {
            addEntryToFileTree(this.fileTree, path.dirname(fsPath), {
                name: scheme.name,
                path: fsPath,
                kind: 'schemio-doc'
            });
        }
    }


    deleteFile(filePath) {
        return fs.rm(path.join(this.rootPath, filePath))
        .then(() => {
            const docId = this.index.getDocumentIdByPath(filePath);
            this.index.deleteDocument(docId);
            deleteEntryFromFileTree(this.fileTree, filePath);
        });
    }

    deleteFolder(folderPath) {
        return fs.rm(path.join(this.rootPath, folderPath), {recursive: true, force: true})
        .then(() => {
            this.index.deleteFolder(folderPath);

            deleteEntryFromFileTree(this.fileTree, folderPath);
        });
    }

    renameFile(filePath, newName) {
        const srcPath = path.join(this.rootPath, filePath);
        const dstPath = path.join(path.dirname(srcPath), newName);
        return fs.move(srcPath, dstPath)
        .then(() => {
            renameEntryInFileTree(this.fileTree, filePath, newName);
        });
    }

    renameDiagramInTree(filePath, newName) {
        const diagramEntry = findEntryInFileTree(this.fileTree, filePath);
        if (!diagramEntry) {
            return;
        }
        diagramEntry.name = newName;
    }

    moveFile(filePath, newParentPath) {
        const srcPath = path.join(this.rootPath, filePath);
        const baseName = path.basename(filePath);
        const newRelativePath = newParentPath ? path.join(newParentPath, baseName) : baseName;
        const dstPath = path.join(this.rootPath, newRelativePath);

        // generating records of all affected files and folder
        // this will be used by the client to correct any open files
        const movedEntries = [{
            src: filePath,
            dst: newRelativePath
        }];

        console.log('Searching of rentry: ', filePath);
        const fileEntry = findEntryInFileTree(this.fileTree, filePath);
        if (!fileEntry) {
            return Promise.reject(`Could not find entry: ${filePath}`);
        }
        if (fileEntry.kind === 'dir') {
            traverseFileTree(fileEntry.children, entry => {
                movedEntries.push({
                    src: entry.path,
                    dst: newRelativePath + entry.path.substring(filePath.length)
                });
            });
        }

        return fs.move(srcPath, dstPath)
        .then(() => {
            //TODO find a way to rebuild the tree without running a full reindex
            // The reason I didn't implement that in the first place is because of the fact that fileTree.js is being also used on the client side
            // But, in order to move entries within file trees we have to know the right file separator.
            // But I don't want to bring "path" module dependency to the client side.
            return this.reindex(this.rootPath).then(() => {
                return { movedEntries };
            });
        });
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
        this.index.updateDocument(id, { previewURL });
    }

    indexFolder(folder, name, parentFolder) {
        this.index.indexFolder(folder, name, parentFolder);
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

    searchIndexDocuments(query) {
        const lowerQuery = query.toLowerCase();
        const indexResults = this.index.search(doc => doc.lowerName.indexOf(lowerQuery) >= 0);
        return indexResults;
    }

    listIndexDocumentsByFolder(folderPath) {
        return this.index.getDocumentsInFolder(folderPath);
    }

    listIndexFoldersByParent(parentFolder) {
        return this.index.getFoldersByParent(parentFolder);
    }

    /**
     *
     * @param {String} rootPath
     * @returns {Promise}
     */
    reindex(rootPath) {
        console.log('Starting reindex in ', rootPath);
        this.rootPath = rootPath;
        return createIndexFromScratch(new DocumentIndex(), rootPath, this.isElectron)
        .then(({index, fileTree}) => {
            this.index = index;
            this.fileTree = fileTree;
            console.log('Finished indexing');
        });
    }

    /**
     * Searches through all sub-folders in given folder and collects document ids
     * @param {*} folderPath
     * @returns {Array<String>} document ids in specified folderPath
     */
    getAllDocumentIdsInFolder(folderPath) {
        const ids = [];
        this.index.traverseDocumentsInFolder(folderPath, (doc, docId) => {
            ids.push(docId);
        });
        return ids;
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
        name: scheme.name,
        lowerName: scheme.name.toLowerCase(),
        modifiedTime: scheme.modifiedTime,
        previewURL
    }, folderPathFromPath(fsPath));
}


/**
 *
 * @param {DocumentIndex} index
 * @param {String} rootPath
 * @returns
 */
function createIndexFromScratch(index, rootPath, isElectron) {
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

        if (isDirectory) {
            index.indexFolder(relativeFilePath, fileNameFromPath(relativeFilePath), folderPathFromPath(relativeFilePath));

            const dirEntry = {
                kind: 'dir',
                path: relativeFilePath,
                name: path.basename(filePath),
                children: []
            };
            findParentList(relativeFilePath).push(dirEntry);
            allDirs.set(relativeFilePath, dirEntry);

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

                let previewURL = null;
                if (fs.existsSync(path.join(rootPath, mediaFolder, 'previews', `${schemeId}.svg`))) {
                    if (isElectron) {
                        previewURL = `media://local/previews/${schemeId}.svg`;
                    } else {
                        previewURL = `/media/previews/${schemeId}.svg`;
                    }
                }

                findParentList(relativeFilePath).push({
                    kind: 'schemio-doc',
                    path: path.relative(rootPath, filePath),
                    name: scheme.name,
                    previewURL
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
