import { FileIndex } from '../../common/fs/fileIndex';
import { schemioExtension } from '../../common/fs/fsUtils';

const path = require('path');
const fs = require('fs-extra');
const { dialog } = require('electron');


/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function openProject(fileIndex) {
    return () => {
        return dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        })
        .then( ({canceled, filePaths}) => {
            if (canceled) {
                return;
            } else {
                const projectPath = filePaths[0];
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

export function readProjectFile(event, projectPath, filePath) {
    return fs.readFile(path.join(projectPath, filePath), {encoding: 'utf-8'}).then(content => {
        let name = path.basename(filePath);
        let kind = 'file';
        if (name.endsWith(schemioExtension)) {
            name = name.substring(0, name.length - schemioExtension.length);
            kind = 'schemio-doc';
        }
        return {
            path: filePath,
            kind,
            name,
            content
        };
    });
}

export function writeProjectFile(fileIndex) {
    return (event, projectPath, filePath, content) => {
        return writeProjectFileInFolder(fileIndex)(event, projectPath, null, filePath, content);
    }
}

/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function writeProjectFileInFolder(fileIndex) {
    return (event, projectPath, folderPath, filePath, content) => {
        const relativePath = folderPath ? path.join(folderPath, filePath) : filePath;
        const fullPath = path.join(projectPath, relativePath);
        return fs.writeFile(fullPath, content, {encoding: 'utf-8'})
        .then(() => {
            let name = path.basename(filePath);
            let kind = 'file';
            if (name.endsWith(schemioExtension)) {
                name = name.substring(0, name.length - schemioExtension.length);
                kind = 'schemio-doc';
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
 * @param {FileIndex} fileIndex
 */
export function createNewDiagram(fileIndex) {
    return (event, projectPath, folderPath, scheme) => {
        const id = fileIndex.genereateDocId(scheme.name);
        scheme.id = id;
        scheme.modifiedTime = new Date();

        return Promise.resolve()
        .then(() => {
            return JSON.stringify(scheme)
        })
        .then(content => {
            return writeProjectFileInFolder(fileIndex)(event, projectPath, folderPath, id + schemioExtension, content);
        });
    };
}

/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function renameFolder(fileIndex) {
    return (event, projectPath, filePath, newName) => {
        if (!verifyFileName(newName)) {
            return Promise.reject(`Invalid name: "${newName}"`);
        }
        return fileIndex.renameFile(filePath, newName);
    };
}

/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function renameDiagram(fileIndex) {
    return (event, projectPath, filePath, newName) => {
        if (!newName.trim()) {
            return Promise.reject('Name should not be empty');
        }

        const fullPath = path.join(projectPath, filePath);
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
 * @param {FileIndex} fileIndex
 */
export function createNewFolder(fileIndex) {
    return (event, projectPath, parentPath, name) => {
        if (!verifyFileName(name)) {
            return Promise.reject('Incorrect file name');
        }

        const relativePath = parentPath ? path.join(parentPath, name) : name;
        return fs.mkdir(path.join(projectPath, relativePath))
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
 * @param {FileIndex} fileIndex
 * @returns
 */
export function moveFile(fileIndex) {
    return (event, projectPath, filePath, newParentPath) => {
        return fileIndex.moveFile(filePath, newParentPath);
    };
}

/**
 *
 * @param {FileIndex} fileIndex
 * @returns
 */
export function projectFileTree(fileIndex) {
    return (event, projectPath) => {
        return fileIndex.fileTree;
    };
}