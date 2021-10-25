import fs from 'fs-extra';
import map from 'lodash/map';
import { schemioExtension } from './fsUtils.js';
import { walk } from './walk';


class Index {
    constructor() {
        this.entries = new Map();
    }

    register(path, entry) {
        this.entries.set(path, entry);
    }

    deregister(path) {
        if (this.entries.has(path)) {
            this.entries.delete(path);
        }
    }

    search(conditionCallback) {
        const searchResults = [];
        this.entries.forEach((entry, path) => {
            if (conditionCallback(entry, path)) {
                searchResults.push({
                    path: path,
                    entry
                });
            }
        });
        return searchResults;
    }
}

let currentIndex = new Index();

function _indexScheme(index, path, fsPath, scheme) {
    if (scheme.name) {
        index.register(path, {fsPath, name: scheme.name, lowerName: scheme.name.toLowerCase() });
    }
}

function _unindexScheme(index, path) {
    index.deregister(path);
}

export function indexScheme(path, fsPath, scheme) {
    _indexScheme(currentIndex, path, fsPath, scheme);
}

export function unindexScheme(path) {
    _unindexScheme(currentIndex, path);
}

export function searchSchemes(query) {
    const lowerQuery = query.toLowerCase();
    const indexResults = currentIndex.search((entry, path) => entry.name.indexOf(lowerQuery) >= 0 || path.toLowerCase().indexOf(query) >= 0);
    
    return map(indexResults, item => {
        return {
            name: item.entry.name,
            publicLink: `/schemes/${item.path}`
        };
    });
}

function _createIndexFromScratch(index, config) {
    const rootPath = config.fs.rootPath;

    console.log('Starting reindex...');

    return walk(config.fs.rootPath, (filePath, isDirectory) => {
        if (isDirectory) {
            return;
        }

        if (filePath.endsWith(schemioExtension)) {
            return fs.readFile(filePath).then(content => {
                const scheme = JSON.parse(content);
                const fsPath = filePath.substring(rootPath.length);
                const path = fsPath.substring(0, fsPath.length - schemioExtension.length);

                _indexScheme(index, path, fsPath, scheme);
            })
            .catch(err => {
                console.error('Failed to index scheme file:' + filePath, err);
            });
        }
    }).then(() => {
        console.log('Finished indexing');
    });
}

export function createIndex(config) {
    _createIndexFromScratch(currentIndex, config);
}

export function reindex(config) {
    const newIndex = new Index();
    _createIndexFromScratch(newIndex, config).then(() => {
        currentIndex = newIndex;
    })
}

