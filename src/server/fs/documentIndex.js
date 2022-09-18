import { fileNameFromPath } from "./fsUtils";
import _ from 'lodash';

export class DocumentIndex {
    constructor() {
        this.docs = new Map();
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

        if (!this.folders.has(folder)) {
            this.indexFolder(folder, fileNameFromPath(folder));
        }
        this.folders.get(folder).docs.add(id);
    }

    hasDocument(id) {
        return this.docs.has(id);
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
        this.docs.delete(id);
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