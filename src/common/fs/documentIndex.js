import _ from 'lodash';

export class DocumentIndex {
    constructor() {
        this.docs = new Map();
        this.docIdsByPath = new Map();
    }

    indexDocument(id, doc, folder) {
        this.docs.set(id, {
            doc,
            folder
        });
        this.docIdsByPath.set(doc.fsPath, id);
    }

    hasDocument(id) {
        return this.docs.has(id);
    }

    deleteDocument(id) {
        const doc = this.docs.get(id);
        if (!doc) {
            return;
        }
        this.docIdsByPath.delete(doc.doc.fsPath);
        this.docs.delete(id);
    }

    updateDocument(id, fields) {
        const doc = this.getDocument(id);
        if (!doc) {
            return;
        }
        _.forEach(fields, (value, key) => {
            if (key === 'fsPath') {
                this.docIdsByPath.delete(doc.fsPath);
                this.docIdsByPath.set(value, id);
            }
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

    search(conditionCallback) {
        const searchResults = [];
        this.docs.forEach((doc, id) => {
            if (conditionCallback(doc.doc, id)) {
                searchResults.push(doc.doc);
            }
        });
        return searchResults;
    }
}