import fs from 'fs-extra';
import map from 'lodash/map';
import { schemioExtension } from './fsConsts';
import { walk } from './walk';

/**
 * @typedef {Object} IndexEntity
 * @property {String} id - entity id
 * @property {String} fsPath - path to entity on file system
 * @property {String} name - name of entity
 * @property {String} lowerName - name of entity but lower cased
 * 
 */


class Index {
    constructor() {
        this.entities = new Map();
    }

    register(id, entity) {
        this.entities.set(id, entity);
    }

    deregister(id) {
        if (this.entities.has(id)) {
            this.entities.delete(id);
        }
    }

    search(conditionCallback) {
        const searchResults = [];
        this.entities.forEach((entity, id) => {
            if (conditionCallback(entity, id)) {
                searchResults.push(entity);
            }
        });
        return searchResults;
    }
}

let currentIndex = new Index();

function _indexScheme(index, schemeId, scheme, fsPath) {
    if (scheme.name) {
        index.register(schemeId, {
            id: schemeId,
            fsPath,
            name: scheme.name,
            lowerName: scheme.name.toLowerCase()
        });
    }
}

function _unindexScheme(index, id) {
    index.deregister(id);
}

export function indexScheme(id, scheme, fsPath) {
    _indexScheme(currentIndex, id, scheme, fsPath);
}

export function unindexScheme(id) {
    _unindexScheme(currentIndex, id);
}

/**
 * 
 * @param {String} id 
 * @returns {IndexEntity} entity in index
 */
export function getEntityFromIndex(id) {
    return currentIndex.entities.get(id);
}

export function searchIndexEntities(query) {
    const lowerQuery = query.toLowerCase();
    const indexResults = currentIndex.search(entity => entity.lowerName.indexOf(lowerQuery) >= 0);
    return indexResults;  
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
                const idx = fsPath.lastIndexOf('/') + 1;
                const schemeId = fsPath.substring(idx, fsPath.length - schemioExtension.length);

                _indexScheme(index, schemeId, scheme, fsPath);
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

