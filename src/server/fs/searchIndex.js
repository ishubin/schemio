import fs from 'fs-extra';
import path from 'path';
import {schemioExtension} from './fsConsts';
import map from 'lodash/map';


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
            if (conditionCallback(entry)) {
                searchResults.push({
                    path: path,
                    entry
                });
            }
        });
        return searchResults;
    }
}

const index = new Index();

export function indexScheme(path, fsPath, scheme) {
    if (scheme.name) {
        index.register(path, {fsPath, name: scheme.name, lowerName: scheme.name.toLowerCase() });
    }
}

export function unindexScheme(path) {
    index.deregister(path);
}

export function searchSchemes(query) {
    const lowerQuery = query.toLowerCase();
    const indexResults = index.search(entry => entry.name.indexOf(lowerQuery) >= 0);
    
    return map(indexResults, item => {
        return {
            name: item.entry.name,
            publicLink: `/schemes/${item.path}`
        };
    });
}


function walk(dirPath, callback) {
    fs.readdir(dirPath).then(files => {
        files.forEach(fileName => {
            const filePath = path.join(dirPath, fileName);
            fs.stat(filePath).then(stat => {
                if (stat.isDirectory()) {
                    walk(filePath, callback);
                } else if (stat.isFile()) {
                    callback(filePath);
                }
            })
            .catch(err => {
                console.error('Failed to stat file: ' + filePath, err);
            });
        });
    })
    .catch(err => {
        console.error('Failed to walk dir: ', dirPath, err);
    });
}

export function createIndex(config) {
    const rootPath = config.fs.rootPath;

    walk(config.fs.rootPath, filePath => {
        if (filePath.endsWith(schemioExtension)) {
            fs.readFile(filePath).then(content => {
                const scheme = JSON.parse(content);
                const fsPath = filePath.substring(rootPath.length);
                const path = fsPath.substring(0, fsPath.length - schemioExtension.length);
                indexScheme(path, fsPath, scheme);
            })
            .catch(err => {
                console.error('Failed to index scheme file:' + filePath, err);
            });
        }
    });
}