/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import axios from 'axios';
import forEach from 'lodash/forEach';

function unwrapAxios(response) {
    return response.data;
}

function getExportHTMLResources() {
    return Promise.all([
        axios.get('/assets/schemio-standalone.css'),
        axios.get('/assets/schemio-standalone.html'),
        axios.get('/assets/schemio-standalone.js')
    ]).then(values => {
        const css  = values[0].data;
        const html = values[1].data;
        const js   = values[2].data;
        return {
            css, html, js
        };
    })
}

function createApiClient() {
    return {
        _getSchemeUrl(schemeId) {
            return `/v1/fs/docs/${schemeId}?_v=${new Date().getTime()}`;
        },

        listEntries(path) {
            let url = '/v1/fs/list';
            if (path) {
                url = url + '/' + path;
            }
            return axios.get(url).then(unwrapAxios);
        },

        moveDir(oldPath, newPath) {
            return axios.post(`/v1/fs/movedir?src=${encodeURIComponent(oldPath)}&dst=${encodeURIComponent(newPath)}`).then(unwrapAxios);
        },

        deleteDir(path, name) {
            return axios.delete(`/v1/fs/dir?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`).then(unwrapAxios);
        },

        createDirectory(path, name) {
            return axios.post('/v1/fs/dir', { name, path }).then(unwrapAxios);
        },

        renameDirectory(path, oldName, newName) {
            return axios.patch(`/v1/fs/dir?path=${encodeURIComponent(path)}&name=${encodeURIComponent(oldName)}`, {name: newName}).then(unwrapAxios);
        },

        getScheme(schemeId) {
            return axios.get(this._getSchemeUrl(schemeId)).then(unwrapAxios);
        },

        renameScheme(schemeId, newName) {
            return axios.patch(this._getSchemeUrl(schemeId), {name: newName}).then(unwrapAxios);
        },

        moveScheme(schemeId, newFolder) {
            return axios.post(`/v1/fs/movescheme?id=${encodeURIComponent(schemeId)}&dst=${encodeURIComponent(newFolder)}`).then(unwrapAxios);
        },

        createNewScheme(path, scheme) {
            return axios.post(`/v1/fs/docs?path=${encodeURIComponent(path)}`, scheme).then(unwrapAxios);
        },


        /************* Below are the functions that are used by SchemeEditor component *************/

        createArt(art) {
            return axios.post('/v1/fs/art', art).then(unwrapAxios);
        },

        getAllArt() {
            return axios.get('/v1/fs/art').then(unwrapAxios);
        },

        getGlobalArt() {
            return axios.get('/v1/art').then(unwrapAxios);
        },

        saveArt(artId, art) {
            return axios.put(`/v1/fs/art/${artId}`, art).then(unwrapAxios);
        },

        deleteArt(artId) {
            return axios.delete(`/v1/fs/art/${artId}`).then(unwrapAxios);
        },

        saveScheme(scheme) {
            return axios.put(this._getSchemeUrl(scheme.id), scheme).then(unwrapAxios);
        },

        deleteScheme(schemeId) {
            return axios.delete(this._getSchemeUrl(schemeId)).then(unwrapAxios);
        },

        loadScheme(schemeId) {
            return this.getScheme(schemeId).then(schemeDetails => schemeDetails.scheme);
        },

        findSchemes(filters) {
            let url = '/v1/fs/docs';
            let params = {};

            if (filters.query) {
                params.q = filters.query;
            }
            if (filters.page) {
                params.page = filters.page;
            }

            let isFirst = true;
            forEach(params, (value, name) => {
                url += isFirst ? '?' : '&';
                url += name + '=';
                url += encodeURIComponent(value);
                
                isFirst = false;
            });

            return axios.get(url).then(unwrapAxios);
        },

        getTags() {
            return Promise.resolve([]);
        },

        uploadSchemeSvgPreview(schemeId, svgCode) {
            let url = '/v1/fs/doc-preview?id=' + encodeURIComponent(schemeId);
            if (path) {
                url = url + '&path=' + encodeURIComponent(path);
            }
            return axios.post(url, {svg: svgCode}).then(unwrapAxios);
        },

        uploadFile(file) {
            const form = new FormData();
            form.append('file', file, file.name);
            return axios.post(`/v1/media`, form).then(unwrapAxios).then(data => {
                return data.url;
            });
        },

        saveStyle(fill, strokeColor, textColor) {
            return axios.post('/v1/fs/styles', { fill, strokeColor, textColor }).then(unwrapAxios);
        },

        getStyles() {
            return axios.get('/v1/fs/styles').then(unwrapAxios);
        },

        deleteStyle(styleId) {
            return axios.delete(`/v1/fs/styles/${styleId}`).then(unwrapAxios);
        },

        /**
         * Returns static resources (html, css, js) for scheme exporting
         */
        getExportHTMLResources
    };
}


function createStaticClient() {
    const currentTimestamp = new Date().getTime();

    let cachedIndex = null;

    function traverseEntries(entries, callback) {
        for (let i = 0; i < entries.length; i++) {
            callback(entries[i]);
            if (entries[i].kind === 'dir' && entries[i].entries) {
                traverseEntries(entries[i].entries, callback);
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

        traverseEntries(index.entries, entry => {
            if (entry.kind === 'dir') {
                dirLookup.set(entry.path, {
                    path: entry.path,
                    viewOnly: true,
                    entries: entry.entries || []
                });
               dirLookup.set(entry.path, entry);
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
            return axios.get(`fs.index.json?v=${currentTimestamp}`).then(unwrapAxios)
            .then(prepareIndex)
            .catch(err => {
                console.error('Failed to build index', err);
                throw err;
            });
        }
    }

    return {
        listEntries(path) {
            return getIndex().then(index => {
                if (index.dirLookup.has(path)) {
                    return {
                        path: path,
                        viewOnly: true,
                        entries: index.dirLookup.get(path).entries
                    }
                } else {
                    return Promise.reject({
                        message: 'Not found',
                        path: path
                    });
                }
            });
        },

        getScheme(schemeId) {
            return getIndex().then(index => {
                const schemeEntry = index.schemeIndex[schemeId];
                if (!schemeEntry) {
                    throw new Error('Scheme was not found');
                }
                return axios.get(`${schemeEntry.path}?v=${encodeURIComponent(schemeEntry.modifiedTime)}`).then(unwrapAxios).then(scheme => {
                    return [scheme, schemeEntry.path];
                });
            })
            .then(values => {
                const scheme = values[0];
                const schemePath = values[1];
                let idx = schemePath.lastIndexOf('/');
                if (idx < 0) {
                    idx = 0;
                }
                const folderPath = schemePath.substring(0, idx);

                return {
                    viewOnly: true,
                    folderPath: folderPath,
                    scheme: scheme
                };
            });
        },

        getExportHTMLResources
    };
}

function createGoogleDriveClient() {
    return window.getGoogleAuth().then(() => {
        return {
            listEntries(path) {
                let query = "trashed = false";
                let chain = null;

                if (path) {
                    query += ` and '${escape(path)}' in parents`;
                    chain = gapi.client.drive.parents.list({ fileId: path }).then(response => {
                        if (response.result.items.length > 0) {
                            if (!response.result.items[0].isRoot) {
                                return {
                                    kind: 'dir',
                                    name: '..',
                                    path: response.result.items[0].id
                                };
                            }
                        }
                        return {
                            kind: 'dir',
                            name: '..',
                            path: ''
                        };
                    });
                } else {
                    query += ` and 'root' in parents`;
                    chain = Promise.resolve(null);
                }

                return chain.then(parentEntry => {
                    return gapi.client.drive.files.list( { q: query}).then(results => {
                        console.log('Got drive files', JSON.stringify(results));
                        const entries = [  ];

                        if (parentEntry) {
                            entries.push(parentEntry);
                        }

                        forEach(results.result.items, file => {
                            if (file.mimeType === 'application/vnd.google-apps.folder') {
                                entries.push({
                                    kind: 'dir',
                                    path: file.id,
                                    name: file.title,
                                    modifiedTime: file.modifiedDate
                                });
                            } else if (file.mimeType === 'application/json' && file.title.endsWith('.schemio.json')) {
                                entries.push({
                                    kind: 'scheme',
                                    id: file.id,
                                    name: file.title,
                                    modifiedTime: file.modifiedDate
                                });
                            }
                        });
                        return {
                            path: path,
                            viewOnly: false,
                            entries
                        };
                    });
                });
            },

            createDirectory(parentId, name) {
                const resource = {
                    title: name,
                    mimeType: 'application/vnd.google-apps.folder'
                };

                if (parentId) {
                    resource.parents = [{id: parentId}];
                }

                return gapi.client.drive.files.insert({ resource }).then(() => {
                    return {
                        kind: 'dir',
                        name: name,
                        path: parentId
                    }
                });
            },

            moveDir(oldPath, newPath) {
                return this.moveGoogleFile(oldPath, newPath);
            },

            moveGoogleFile(fileId, parentId) {
                const parents = [];
                if (parentId && parentId.length > 0) {
                    parents.push({ id: parentId });
                } else {
                    parents.push({ id: 'root' });
                }

                return gapi.client.drive.files.patch({
                    fileId: fileId,
                    resource: { parents }
                });
            },

            deleteDir(path, name) {
                return this.deleteGoogleFile(path);
            },

            renameDirectory(path, oldName, newName) {
                return this.renameGoogleFile(path, newName);
            },

            renameGoogleFile(fileId, newName) {
                return gapi.client.drive.files.patch({
                    fileId: fileId,
                    resource: {
                        title: newName
                    }
                });
            },

            deleteGoogleFile(fileId) {
                return gapi.client.drive.files.delete({
                    'fileId': fileId
                }).then(() => {
                    return {
                        status: 'ok'
                    };
                });
            },

            renameScheme(schemeId, newName) {
                return this.renameGoogleFile(schemeId, newName);
            },

            deleteScheme(schemeId) {
                return this.deleteGoogleFile(schemeId);
            },

            moveScheme(schemeId, newFolder) {
                return this.moveGoogleFile(schemeId, newFolder);
            },

            createNewScheme(parentId, scheme) {
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const contentType = 'application/json';
                const metadata = {
                    title:  `${scheme.name}.schemio.json`,
                    mimeType: 'application/json'
                };

                if (parentId) {
                    metadata.parents = [{id: parentId}];
                }

                const base64Data = btoa(JSON.stringify(scheme));
                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: base64\r\n' +
                    '\r\n' +
                    base64Data +
                    close_delim;

                const request = gapi.client.request({
                    'path': '/upload/drive/v2/files',
                    'method': 'POST',
                    'params': {'uploadType': 'multipart'},
                    'headers': {
                        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody});

                return request.then(response => {
                    console.log('Created file', response.result);
                    scheme.id = response.result.id;
                    return scheme;
                });
            },

            getScheme(schemeId) {
                return gapi.client.drive.files.get({
                    fileId: schemeId
                }).then(response => {
                    const file = response.result;
                    console.log('Got file', file);

                    if (file.downloadUrl) {
                        var accessToken = gapi.auth.getToken().access_token;
                        var xhr = new XMLHttpRequest();
                        // For some reason google API returns a "lockedDomainCreationFailure" error even though the code is completelly copied from Google API documentation
                        // Followed the advice here https://stackoverflow.com/questions/68016649/google-drive-api-download-file-gives-lockeddomaincreationfailure-error
                        // and it worked. For some reason we need to replace "content" subdomain with "www"
                        xhr.open('GET', file.downloadUrl.replace('https://content.googleapis.com', 'https://www.googleapis.com'));
                        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
                        return new Promise((resolve, reject) => {
                            xhr.onload = function() {
                                resolve(xhr.responseText);
                            };
                            xhr.onerror = function() {
                                reject();
                            };
                            xhr.send();
                        });
                    } else {
                        throw new Error('File is missing downloadUrl');
                    }
                }).then(content => {
                    const scheme = JSON.parse(content);
                    scheme.id = schemeId;
                    return {
                        scheme: scheme,
                        folderPath: '',
                        viewOnly: false
                    };
                });
            },

            saveScheme(scheme) {
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                var contentType = 'application/json';
                var base64Data = btoa(JSON.stringify(scheme));
                
                const metadata = {
                    title:  `${scheme.name}.schemio.json`,
                    mimeType: 'application/json'
                };
                var multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: base64\r\n' +
                    '\r\n' +
                    base64Data +
                    close_delim;

                return gapi.client.request({
                    'path': '/upload/drive/v2/files/' + scheme.id,
                    'method': 'PUT',
                    'params': {'uploadType': 'multipart', 'alt': 'json'},
                    'headers': {
                        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody
                }).then(() => {
                    return scheme;
                });
            }
        }
    })
    .catch(err => {
        console.error('Failed to build api client', err);
        throw err;
    });
}


export function createApiClientForType(apiClientType) {
    if (apiClientType === 'fs') {
        return Promise.resolve(createApiClient());
    } else if (apiClientType === 'static') {
        return Promise.resolve(createStaticClient());
    } else if (apiClientType === 'drive') {
        return createGoogleDriveClient();
    } else {
        return Promise.reject(new Error('Unknown api client type: ' + apiClientType));
    }
}