import { getExportHTMLResources } from "./clientCommons";
import forEach from "lodash/forEach";

export const googleDriveClientProvider = {
    type: 'drive',
    create() {
        const schemioExtension = '.schemio.json';

        function escapeDriveQuery(text) {
            return text
                .replace(/[\']/g, "\\'")
                .replace(/[\"]/g, '\\"');
        }

        /**
         *
         * @param {String} title
         */
        function convertSchemioFileTitle(title) {
            if (title.endsWith(schemioExtension)) {
                return title.substring(0, title.length - schemioExtension.length);
            }
            return title;
        }

        return window.getGoogleAuth().then(() => {

            function buildFileBreadCrumbs(fileId, ancestors, counter) {
                if (!counter) {
                    counter = 0;
                }
                if (counter > 10) {
                    return Promise.resolve(ancestors);
                }
                if (!ancestors) {
                    ancestors = [];
                }

                if (fileId) {
                    return gapi.client.drive.files.get( { fileId: fileId, fields: 'id, title, parents(id,isRoot)'}).then(response => {

                        ancestors.splice(0, 0, {
                            path: response.result.id,
                            name: response.result.title
                        });

                        if (response.result.parents.length > 0) {
                            if (!response.result.parents[0].isRoot) {
                                return buildFileBreadCrumbs(response.result.parents[0].id, ancestors, counter + 1);
                            } else {
                                ancestors.splice(0, 0, {
                                    path: '',
                                    name: 'Home'
                                });
                            }
                        }
                        return Promise.resolve(ancestors);
                    });
                }
                return Promise.resolve(ancestors);
            }

            return {
                listEntries(path, filters) {

                    let query = "trashed = false";

                    if (path) {
                        query += ` and '${escapeDriveQuery(path)}' in parents`;
                    } else {
                        query += ` and 'root' in parents`;
                    }

                    const params = {
                        q: query,
                        fields: 'nextPageToken, items(id, title, mimeType, modifiedDate)'
                    };

                    if (filters && filters.nextPageToken) {
                        params.pageToken = filters.nextPageToken;
                    }

                    return buildFileBreadCrumbs(path).then(breadcrumbs => {
                        return gapi.client.drive.files.list(params).then(results => {
                            const entries = [  ];

                            if (breadcrumbs.length > 1) {
                                entries.push({
                                    kind: 'dir',
                                    path: breadcrumbs[breadcrumbs.length - 2].path,
                                    name: '..',
                                });
                            }

                            forEach(results.result.items, file => {
                                if (file.mimeType === 'application/vnd.google-apps.folder') {
                                    entries.push({
                                        kind: 'dir',
                                        path: file.id,
                                        name: file.title,
                                        modifiedTime: file.modifiedDate
                                    });
                                } else if (file.mimeType === 'application/json' && file.title.endsWith(schemioExtension)) {
                                    entries.push({
                                        kind: 'schemio:doc',
                                        id: file.id,
                                        name: convertSchemioFileTitle(file.title),
                                        modifiedTime: file.modifiedDate
                                    });
                                }
                            });
                            return {
                                breadcrumbs: breadcrumbs,
                                path: path,
                                viewOnly: false,
                                entries,
                                nextPageToken: results.result.nextPageToken
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

                renameDirectory(path, newName) {
                    return this.renameGoogleFile(path, newName);
                },

                renameGoogleFile(fileId, newName) {
                    return gapi.client.drive.files.patch({
                        fileId: fileId,
                        resource: {
                            title: newName
                        }
                    }).then(() => {
                        return {
                            kind: 'dir',
                            path: fileId,
                            name: newName
                        };
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
                        title:  `${scheme.name}${schemioExtension}`,
                        mimeType: 'application/json'
                    };

                    if (parentId) {
                        metadata.parents = [{id: parentId}];
                    }

                    const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(scheme))))
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
                        scheme.id = response.result.id;
                        return scheme;
                    });
                },

                getScheme(schemeId) {
                    if (!schemeId) {
                        return Promise.reject('Invalid empty document ID');
                    }
                    return gapi.client.drive.files.get({
                        fileId: schemeId
                    }).then(response => {
                        const file = response.result;
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
                    var base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(scheme))))

                    const metadata = {
                        title:  `${scheme.name}${schemioExtension}`,
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
                },

                findSchemes(filters) {
                    let query = "trashed = false and mimeType = 'application/json'";

                    if (filters.query) {
                        query += ` and title contains '${escapeDriveQuery(filters.query)}'`;
                    }

                    const params = {
                        q: query,
                        maxResults: 100,
                        fields: 'nextPageToken, items(mimeType, title, id, modifiedDate)'
                    };

                    if (filters.nextPageToken) {
                        params.pageToken = filters.nextPageToken;
                    }

                    return gapi.client.drive.files.list(params).then(response => {
                        return {
                            kind: 'chunk',
                            nextPageToken: response.result.nextPageToken,
                            results: map(response.result.items, file => {
                                return {
                                    id: file.id,
                                    name: convertSchemioFileTitle(file.title),
                                    modifiedTime: file.modifiedDate,
                                    publicLink: `/docs/${file.id}`
                                };
                            })
                        };
                    });

                },
                getExportHTMLResources,
            };
        })
        .catch(err => {
            console.error('Failed to build api client', err);
            throw err;
        });
    }
}