import { schemioExtension } from '../../common/fs/fsUtils';
import { ContextHolder } from './context';

const path = require('path');
const fs = require('fs-extra');
const { dialog } = require('electron');
const _ = require('lodash');


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function openProject(contextHolder) {
    return (event) => {
        return dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        })
        .then( ({canceled, filePaths}) => {
            if (canceled) {
                return;
            } else {
                const projectPath = filePaths[0];
                const fileIndex = contextHolder.from(event).fileIndex;
                return fileIndex.reindex(projectPath)
                .then(() => {
                    return {
                        path: projectPath,
                        name: path.basename(projectPath),
                        fileTree: fileIndex.fileTree
                    };
                });
            }
        })
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function readProjectFile(contextHolder) {
    return (event, filePath) => {
        const fileIndex = contextHolder.from(event).fileIndex;

        return fs.readFile(path.join(fileIndex.rootPath, filePath), {encoding: 'utf-8'}).then(content => {
            let name = path.basename(filePath);
            let kind = 'file';
            if (name.endsWith(schemioExtension)) {
                name = name.substring(0, name.length - schemioExtension.length);
                kind = 'schemio:doc';
            }
            return {
                path: filePath,
                kind,
                name,
                content
            };
        });
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function writeProjectFile(contextHolder) {
    return (event, filePath, content) => {
        return writeProjectFileInFolder(contextHolder)(event, null, filePath, content);
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function writeProjectFileInFolder(contextHolder) {
    return (event, folderPath, filePath, content) => {
        const fileIndex = contextHolder.from(event).fileIndex;

        const relativePath = folderPath ? path.join(folderPath, filePath) : filePath;
        const fullPath = path.join(fileIndex.rootPath, relativePath);
        return fs.writeFile(fullPath, content, {encoding: 'utf-8'})
        .then(() => {
            let name = path.basename(filePath);
            let kind = 'file';
            if (name.endsWith(schemioExtension)) {
                name = name.substring(0, name.length - schemioExtension.length);
                kind = 'schemio:doc';
            }
            return {
                name,
                kind,
                path: relativePath,
                parent: path.dirname(relativePath)
            };
        });
    }
}


/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createNewDiagram(contextHolder) {
    return (event, folderPath, scheme) => {
        const fileIndex = contextHolder.from(event).fileIndex;

        const id = fileIndex.genereateDocId(scheme.name);
        scheme.id = id;
        scheme.modifiedTime = new Date();

        return Promise.resolve()
        .then(() => {
            return JSON.stringify(scheme)
        })
        .then(content => {
            return writeProjectFileInFolder(contextHolder)(event, folderPath, id + schemioExtension, content);
        })
        .then(entry => {
            fileIndex.indexScheme(scheme.id, scheme, entry.path, null);
            entry.name = scheme.name;
            entry.id = scheme.id;
            return entry;
        });
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function renameFolder(contextHolder) {
    return (event, filePath, newName) => {
        if (!verifyFileName(newName)) {
            return Promise.reject(`Invalid name: "${newName}"`);
        }
        const fileIndex = contextHolder.from(event).fileIndex;
        return fileIndex.renameFile(filePath, newName);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function renameDiagram(contextHolder) {
    return (event, filePath, newName) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        if (!newName.trim()) {
            return Promise.reject('Name should not be empty');
        }

        const fullPath = path.join(fileIndex.rootPath, filePath);
        return fs.readFile(fullPath)
        .then(content => {
            return JSON.parse(content);
        })
        .then(diagram => {
            diagram.name = newName;
            const content = JSON.stringify(diagram);
            return fs.writeFile(fullPath, content, {encoding: 'utf-8'})
            .then(() => {
                return diagram;
            });
        })
        .then(diagram => {
            fileIndex.updateScheme(diagram.id, diagram);
            fileIndex.renameDiagramInTree(filePath, diagram.name);
        });
    }
}
/**
 *
 * @param {String} name
 * @returns
 */
function verifyFileName(name) {
    name = name.trim();
    if (!name) {
        return false;
    }

    if (name === '.') {
        return false;
    }

    for (let i = 0; i < name.length; i++) {
        const s = name.charAt(i);
        if (s === '/' || s === '\\') {
            return false;
        }
    }
    return true;
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createNewFolder(contextHolder) {
    return (event, parentPath, name) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        if (!verifyFileName(name)) {
            return Promise.reject('Incorrect file name');
        }

        const relativePath = parentPath ? path.join(parentPath, name) : name;
        return fs.mkdir(path.join(fileIndex.rootPath, relativePath))
        .then(() => {
            fileIndex.indexFolder(relativePath, name, parentPath);
            return {
                kind: 'dir',
                name: name,
                path: relativePath
            };
        });
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function moveFile(contextHolder) {
    return (event, filePath, newParentPath) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return fileIndex.moveFile(filePath, newParentPath);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function projectFileTree(contextHolder) {
    return (event) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return fileIndex.fileTree;
    };
}


const resultsPerPage = 25;
function toPageNumber(text) {
    const page = parseInt(text);
    if (!isNaN(page) && page !== undefined) {
        return Math.max(1, page);
    }
    return 1;
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function findDiagrams(contextHolder) {
    return (event, query, page) => {
        const fileIndex = contextHolder.from(event).fileIndex;

        const entities = fileIndex.searchIndexDocuments(query || '');
        page = toPageNumber(page);

        let start = (page - 1) * resultsPerPage;
        let end = start + resultsPerPage;
        start = Math.max(0, Math.min(start, entities.length));
        end = Math.max(start, Math.min(end, entities.length));

        const totalResults = entities.length;
        const results = entities.slice(start, end);

        return Promise.resolve({
            kind: 'page',
            totalResults: totalResults,
            results,
            totalPages: Math.ceil(totalResults / resultsPerPage),
            page: page
        });
    }
}


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function getDiagram(contextHolder) {
    return (event, docId) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        const doc = fileIndex.getDocumentFromIndex(docId);
        if (!doc) {
            return Promise.reject(`Diagram with id "${docId}" does not exist`);
        }
        const fullPath = path.join(fileIndex.rootPath, doc.fsPath);

        let folderPath = path.basename(doc.fsPath);
        if (folderPath === '.') {
            folderPath = null
        }

        return fs.readFile(fullPath, 'utf-8').then(content => {
            const diagram = JSON.parse(content);
            diagram.projectLink = '/';
            return {
                scheme: diagram,
                folderPath: folderPath,
                viewOnly: false
            };
        });
    }
}