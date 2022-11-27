import { FileIndex } from "./fileIndex";
import path from 'path';
import { schemioExtension } from "./fsUtils";
import { findEntryInFileTree, traverseFileTree } from "./fileTree";
import { convertDiagram } from "./diagramConverter";
const fs = require('fs-extra');


export class ProjectService {
    /**
     *
     * @param {string} projectPath
     * @param {boolean} isElectron
     * @param {Object} imagePrefixConversions
     * @param {Object} persistentImageConversions
     */
    constructor(projectPath, isElectron, imagePrefixConversions, persistentImageConversions) {
        this.fileIndex = new FileIndex(projectPath, isElectron, (filePath) => this.readFile(filePath));

        // uses the following map in order to convert all image references to project media
        // either from electron to fs or from fs to electron
        this.imagePrefixConversions = imagePrefixConversions;

        // the following image conversions are used when saving diagram.
        // This is needed so that a diagram is always saved in the same format
        // Only electron based version of Schemio will have this
        this.persistentImageConversions = persistentImageConversions;
        this.projectPath = projectPath;
    }

    load() {
        return this.fileIndex.reindex()
        .then(() => {
            return {
                path: this.projectPath,
                name: path.basename(this.projectPath),
                fileTree: this.fileIndex.fileTree
            };
        });
    }

    getDiagramPath(id) {
        const doc = this.fileIndex.getDocumentFromIndex(id);
        if (!doc) {
            return null;
        }
        return doc.fsPath;
    }

    readFile(filePath) {
        return fs.readFile(path.join(this.projectPath, filePath), {encoding: 'utf-8'}).then(content => {
            let name = path.basename(filePath);
            let kind = 'file';
            if (name.endsWith(schemioExtension)) {
                name = name.substring(0, name.length - schemioExtension.length);
                kind = 'schemio:doc';

                content = JSON.parse(content);

                if (this.imagePrefixConversions) {
                    content = convertDiagram(content, this.imagePrefixConversions);
                }
            }
            return {
                path: filePath,
                kind,
                name,
                content
            };
        });
    }

    listFilesInFolder(folderPath) {
        return this.fileIndex.listFilesInFolder(folderPath);
    }

    writeDiagram(filePath, diagram) {
        const fullPath = path.join(this.projectPath, filePath);
        return Promise.resolve()
        .then(() => {
            let updatedDiagram = diagram;
            if (this.persistentImageConversions) {
                updatedDiagram = convertDiagram(diagram, this.persistentImageConversions);
            }
            return JSON.stringify(updatedDiagram);
        })
        .then(content => fs.writeFile(fullPath, content, {encoding: 'utf-8'}))
        .then(() => {
            return {
                name: diagram.name,
                kind: 'schemio:doc',
                path: filePath,
                parent: path.dirname(filePath)
            };
        });
    }

    createNewDiagram(folderPath, diagram) {
        const id = this.fileIndex.genereateDocId(diagram.name);
        diagram.id = id;
        diagram.modifiedTime = new Date();

        const fileName = id + schemioExtension;
        let filePath = folderPath ? path.join(folderPath, fileName) : fileName;

        return this.writeDiagram(filePath, diagram)
        .then(entry => {
            this.fileIndex.indexScheme(diagram.id, diagram, entry.path, null);
            entry.name = diagram.name;
            entry.id = diagram.id;
            return entry;
        });
    }

    createFolder(parentPath, name) {
        if (!verifyFileName(name)) {
            return Promise.reject('Incorrect file name');
        }

        const relativePath = parentPath ? path.join(parentPath, name) : name;
        return fs.mkdir(path.join(this.projectPath, relativePath))
        .then(() => {
            this.fileIndex.indexFolder(relativePath, name, parentPath);
            return {
                kind: 'dir',
                name: name,
                path: relativePath
            };
        });
    }

    renameFolder(filePath, newName) {
        if (!verifyFileName(newName)) {
            return Promise.reject(`Invalid name: "${newName}"`);
        }

        const srcPath = path.join(this.projectPath, filePath);
        const dstPath = path.join(path.dirname(srcPath), newName);
        return fs.move(srcPath, dstPath)
        .then(() => this.fileIndex.renameFile(filePath, newName));
    }

    deleteFile(filePath) {
        //TODO delete diagram previews in media
        return fs.rm(path.join(this.projectPath, filePath))
        .then(() => this.fileIndex.deleteFile(filePath));
    }

    deleteFolder(folderPath) {
        return fs.rm(path.join(this.projectPath, folderPath), {recursive: true, force: true})
        .then(() => this.fileIndex.deleteFolder(folderPath));
    }

    renameDiagram(filePath, newName) {
        if (!newName.trim()) {
            return Promise.reject('Name should not be empty');
        }

        const fullPath = path.join(this.projectPath, filePath);
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
            this.fileIndex.updateScheme(diagram.id, diagram);
            this.fileIndex.renameDiagramInTree(filePath, diagram.name);
        });
    }

    findDiagrams(query, page) {
        const entities = this.fileIndex.searchIndexDocuments(query || '');
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

    moveDiagramById(id, newParentPath) {
        const doc = this.fileIndex.getDocumentFromIndex(id);
        if (!doc) {
            return Promise.reject(`Diagram does not exist: ${id}`);
        }

        return this.moveFile(doc.fsPath, newParentPath);
    }

    moveFile(filePath, newParentPath) {
        const srcPath = path.join(this.projectPath, filePath);
        const baseName = path.basename(filePath);
        const newRelativePath = newParentPath ? path.join(newParentPath, baseName) : baseName;
        const dstPath = path.join(this.projectPath, newRelativePath);

        // generating records of all affected files and folders
        // this will be used by the client to correct any open files
        const movedEntries = [{
            src: filePath,
            dst: newRelativePath
        }];

        const fileEntry = findEntryInFileTree(this.fileIndex.fileTree, filePath);
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

        //TODO find a way to rebuild the tree without running a full reindex
        // The reason I didn't implement that in the first place is because of the fact that fileTree.js is being also used on the client side
        // But, in order to move entries within file trees we have to know the right file separator.
        // But I don't want to bring "path" module dependency to the client side.

        return fs.move(srcPath, dstPath)
        .then(() => this.fileIndex.reindex())
        .then(() => {
            return {movedEntries};
        });
    }

    getFileTree() {
        return Promise.resolve(this.fileIndex.fileTree);
    }

    getDiagram(docId) {
        const doc = this.fileIndex.getDocumentFromIndex(docId);
        if (!doc) {
            return Promise.reject(`Diagram with id "${docId}" does not exist`);
        }
        let folderPath = path.dirname(doc.fsPath);
        if (folderPath === '.') {
            folderPath = null
        }
        return this.readFile(doc.fsPath).then(fileEntry => {
            return {
                scheme: fileEntry.content,
                folderPath: folderPath,
                viewOnly: false
            };
        });
    }

    updateDiagramPreview(docId, previewURL) {
        this.fileIndex.updatePreviewURL(docId, previewURL);
    }
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