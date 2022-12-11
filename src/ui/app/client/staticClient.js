import axios from "axios";
import { getExportHTMLResources, unwrapAxios } from "./clientCommons";


export const staticClientProvider = {
    type: 'static',

    create() {
        const currentTimestamp = new Date().getTime();

        let cachedIndex = null;

        function traverseEntries(entries, callback, parentEntry) {
            for (let i = 0; i < entries.length; i++) {
                callback(entries[i], parentEntry);
                if (entries[i] && entries[i].kind === 'dir' && entries[i].name !== '..' && entries[i].entries) {
                    traverseEntries(entries[i].entries, callback, entries[i]);
                }
            }
        }

        function prepareIndex(index) {
            const dirLookup = new Map();

            dirLookup.set('', {
                path: '',
                viewOnly: true,
                entries: index.entries || []
            });

            traverseEntries(index.entries, (entry, parentEntry) => {
                if (entry.kind === 'dir') {
                    dirLookup.set(entry.path, {
                        path: entry.path,
                        viewOnly: true,
                        entries: entry.entries || [],
                        parentPath: parentEntry ? parentEntry.path : ''
                    });
                }
            });

            index.dirLookup = dirLookup;
            cachedIndex = index;
            return index;
        }

        function getIndex() {
            if (cachedIndex) {
                return Promise.resolve(cachedIndex);
            } else {
                return axios.get(`data/fs.index.json?v=${currentTimestamp}`).then(unwrapAxios)
                .then(prepareIndex)
                .catch(err => {
                    console.error('Failed to build index', err);
                    throw err;
                });
            }
        }

        return Promise.resolve({
            listEntries(path) {
                return getIndex().then(index => {
                    const dirEntry = index.dirLookup.get(path);
                    if (dirEntry) {
                        let entries = [];
                        if (dirEntry.hasOwnProperty('parentPath') && dirEntry.parentPath !== null) {
                            entries.push({
                                kind: 'dir',
                                name: '..',
                                path: dirEntry.parentPath
                            });
                        }
                        return {
                            path: path,
                            viewOnly: true,
                            entries: entries.concat(dirEntry.entries)
                        }
                    } else {
                        return Promise.reject({
                            message: 'Not found',
                            path: path
                        });
                    }
                });
            },

            getSchemeInfo(schemeId) {
                if (!schemeId) {
                    return Promise.reject('Invalid empty document ID');
                }
                return getIndex().then(index => {
                    const schemeEntry = index.schemeIndex[schemeId];
                    if (!schemeEntry) {
                        throw new Error('Scheme was not found');
                    }

                    return {
                        id: schemeId,
                        name: schemeEntry.name
                    };
                });
            },

            getScheme(schemeId) {
                if (!schemeId) {
                    return Promise.reject('Invalid empty document ID');
                }
                return getIndex().then(index => {
                    const schemeEntry = index.schemeIndex[schemeId];
                    if (!schemeEntry) {
                        throw new Error('Scheme was not found');
                    }
                    return axios.get(`data/${schemeEntry.path}?v=${encodeURIComponent(schemeEntry.modifiedTime)}`).then(unwrapAxios).then(scheme => {
                        return [scheme, schemeEntry];
                    });
                })
                .then(values => {
                    const scheme = values[0];
                    const schemeEntry = values[1]
                    const schemePath = schemeEntry.path;
                    let idx = schemePath.lastIndexOf('/');
                    if (idx < 0) {
                        idx = 0;
                    }
                    const folderPath = schemePath.substring(0, idx);

                    return {
                        viewOnly: schemeEntry.viewOnly || false,
                        folderPath: folderPath,
                        scheme: scheme
                    };
                });
            },

            getExportHTMLResources,
        });
    }
}