import { fileNameFromPath } from "./fsUtils";
import _ from 'lodash';

export class DocumentIndex {
    constructor() {
        this.docs = new Map();
        this.docIdsByPath = new Map();
        this.folders = new Map();
        this.folders.set('', {
            docs: new Set(),
            folders: new Set()
        });
    }

    indexDocument(id, doc, folder) {
        if (!folder) {
            folder = '';
        }
        this.docs.set(id, {
            doc,
            folder
        });
        this.docIdsByPath.set(doc.fsPath, id);

        if (!this.folders.has(folder)) {
            this.indexFolder(folder, fileNameFromPath(folder));
        }
        this.folders.get(folder).docs.add(id);
    }

    hasDocument(id) {
        return this.docs.has(id);
    }

    moveDocument(id, fsPath, newFolderPath) {
        const docEntry = this.docs.get(id);
        if (!docEntry) {
            return;
        }
        const oldFolder = this.folders.get(docEntry.folder);
        if (oldFolder) {
            oldFolder.docs.delete(id);
        }

        const newFolder = this.folders.get(newFolderPath);
        if (newFolder) {
            newFolder.docs.add(id);
        }
        this.updateDocument(id, {fsPath});
        this.docIdsByPath.set(id, fsPath);
    }

    traverseDocumentsInFolder(folderPath, callback) {
        const folder = this.folders.get(folderPath);
        if (!folder) {
            return;
        }

        folder.docs.forEach(docId => {
            const doc = this.getDocument(docId);
            if (doc) {
                callback(doc, docId);
            }
        });

        folder.folders.forEach(subFolderPath => {
            this.traverseFolder(subFolderPath, callback);
        });
    }

    deleteDocument(id) {
        const doc = this.docs.get(id);
        if (!doc) {
            return;
        }
        const folder = this.folders.get(doc.folder);
        if (folder) {
            folder.docs.delete(id);
        }
        this.docIdsByPath.delete(doc.doc.fsPath);
        this.docs.delete(id);
    }

    deleteFolder(folderPath) {
        const folder = this.folders.get(folderPath);
        if (!folder) {
            return;
        }
        folder.docs.forEach(docId => this.deleteDocument(docId));
        folder.folders.forEach(subFolderPath => this.deleteFolder(subFolderPath));
        this.folders.delete(folderPath);
    }

    updateDocument(id, fields) {
        const doc = this.getDocument(id);
        if (!doc) {
            return;
        }
        _.forEach(fields, (value, key) => {
            doc[key] = value;
        });
    }

    getDocument(id) {
        const doc = this.docs.get(id);
        if (!doc) {
            return null;
        }
        return doc.doc;
    }

    getDocumentIdByPath(fsPath) {
        return this.docIdsByPath.get(fsPath);
    }

    indexFolder(folder, name, parentFolder) {
        if (!parentFolder) {
            parentFolder = '';
        }
        if (!this.folders.has(folder)) {
            this.folders.set(folder, {
                name,
                docs: new Set(),
                folders: new Set()
            });
        } else {
            this.folders.get(folder).name = name;
        }
        const parentFolderEntry = this.folders.get(parentFolder);
        if (parentFolderEntry) {
            parentFolderEntry.folders.add(folder);
        }
    }

    search(conditionCallback) {
        const searchResults = [];
        this.docs.forEach((doc, id) => {
            if (conditionCallback(doc.doc, id)) {
                searchResults.push(doc.doc);
            }
        });
        return searchResults;
    }

    getDocumentsInFolder(folderPath) {
        const folder = this.folders.get(folderPath);
        if (!folder) {
            return [];
        }

        const docs = [];

        folder.docs.forEach(id => {
            const doc = this.getDocument(id);
            if (doc) {
                docs.push(doc);
            }
        });
        return docs;
    }

    getFoldersByParent(parentFolderPath) {
        const parentFolder = this.folders.get(parentFolderPath);
        if (!parentFolder) {
            return [];
        }

        return Array.from(parentFolder.folders);
    }
}