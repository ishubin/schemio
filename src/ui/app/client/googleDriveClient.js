import { getExportHTMLResources } from "./clientCommons";
import forEach from "lodash/forEach";
import map from "lodash/map";
import { getCachedSchemeInfo, schemeSearchCacher } from "./clientCache";
import { encode } from 'js-base64';
import { whenGAPILoaded } from "../../googleApi";

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

        return whenGAPILoaded().then(() => {
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
                    return gapi.client.drive.files.get( { fileId: fileId, fields: 'name, mimeType, parents'}).then(response => {
                        if (response.result.parents && response.result.parents.length > 0) {
                            // Skipping the root parent which is "My Drive"
                            ancestors.splice(0, 0, {
                                path: fileId,
                                name: response.result.name
                            });

                            return buildFileBreadCrumbs(response.result.parents[0], ancestors, counter + 1);
                        } else {
                            ancestors.splice(0, 0, {
                                path: '',
                                name: 'Home'
                            });
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
                        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)'
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

                            forEach(results.result.files, file => {
                                if (file.mimeType === 'application/vnd.google-apps.folder') {
                                    entries.push({
                                        kind: 'dir',
                                        path: file.id,
                                        name: file.name,
                                        modifiedTime: file.modifiedTime
                                    });
                                } else if (file.mimeType === 'application/json' && file.name.endsWith(schemioExtension)) {
                                    entries.push({
                                        kind: 'schemio:doc',
                                        id: file.id,
                                        name: convertSchemioFileTitle(file.name),
                                        modifiedTime: file.modifiedTime
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
                        name: name,
                        mimeType: 'application/vnd.google-apps.folder'
                    };

                    if (parentId) {
                        resource.parents = [parentId];
                    }

                    return gapi.client.drive.files.create({ resource }).then(() => {
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

                    return gapi.client.drive.files.update({
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
                    return gapi.client.drive.files.update({
                        fileId: fileId,
                        resource: {
                            name: newName
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
                        name:  `${scheme.name}${schemioExtension}`,
                        mimeType: 'application/json'
                    };

                    if (parentId) {
                        metadata.parents = [parentId];
                    }

                    const base64Data = encode(JSON.stringify(scheme))
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
                        'path': '/upload/drive/v3/files',
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

                getSchemeInfo(schemeId) {
                    if (!schemeId) {
                        return Promise.reject('Invalid empty document ID');
                    }

                    return getCachedSchemeInfo(schemeId, () => {
                        return gapi.client.drive.files.get({
                            fileId: schemeId
                        }).then(response => {
                            const file = response.result;
                            let title = file.name;
                            if (title.endsWith(schemioExtension)) {
                                title = title.substring(0, title.length - schemioExtension.length);
                            }
                            return {
                                id: schemeId,
                                name: title
                            };
                        });
                    });
                },

                getScheme(schemeId) {
                    if (!schemeId) {
                        return Promise.reject('Invalid empty document ID');
                    }
                    return gapi.client.drive.files.get({
                        fileId: schemeId,
                        alt: 'media'
                    }).then(response => {
                        const scheme = response.result;
                        scheme.id = schemeId;
                        return {
                            scheme: scheme,
                            folderPath: '',
                            viewOnly: false
                        };
                    });
                },

                saveScheme(scheme) {
                    return gapi.client.request({
                        path: '/upload/drive/v3/files/' + scheme.id,
                        method: 'PATCH',
                        params: {
                            uploadType: 'media'
                        },
                        body: JSON.stringify(scheme)
                    }).then(() =>{
                        return scheme;
                    });
                },

                findSchemes(filters) {
                    let query = "trashed = false and mimeType = 'application/json'";

                    if (filters.query) {
                        query += ` and name contains '${escapeDriveQuery(filters.query)}'`;
                    }

                    const params = {
                        q: query,
                        maxResults: 100,
                        fields: 'nextPageToken, files(mimeType, name, id, modifiedTime)'
                    };

                    if (filters.nextPageToken) {
                        params.pageToken = filters.nextPageToken;
                    }

                    return gapi.client.drive.files.list(params)
                    .then(response => {
                        return {
                            kind: 'chunk',
                            nextPageToken: response.result.nextPageToken,
                            results: map(response.result.files, file => {
                                return {
                                    id: file.id,
                                    name: convertSchemioFileTitle(file.name),
                                    modifiedTime: file.modifiedDate,
                                    publicLink: `/docs/${file.id}`
                                };
                            })
                        };
                    })
                    .then(schemeSearchCacher);

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