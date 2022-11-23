/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { nanoid } from 'nanoid'
import { folderPathFromPath, mediaFolder, supportedMediaExtensions, getFileExtension, leftZeroPad} from '../../common/fs/fsUtils.js';
import { FileIndex } from '../../common/fs/fileIndex';
import artService from '../../common/fs/artService.js';
import styleService from '../../common/fs/styleService.js';
import { ProjectService } from '../../common/fs/projectService.js';

const electronMediaPrefix = 'media://local/';

function serverErrorHandler(res, message) {
    return (err) => {
        console.error(message, err);
        res.$serverError(message);
    }
}

function isValidCharCode(code) {
    return (code >= 48 && code <= 57)
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

function validateFileName(name) {
    name = name.trim();
    if (name.length === 0) {
        return false;
    }
    for (let i = 0; i < name.length; i++) {
        if (!isValidCharCode(name.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

function safePath(path) {
    if (!path) {
        path = '';
    }
    path = path.replace(/\/\.\.\//g, '/./');
    return path;
}

function pathToSchemePreview(config, schemeId) {
    return path.join(config.fs.rootPath, mediaFolder, 'previews', `${schemeId}.svg`);
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsMoveScheme(config, projectService) {
    return (req, res) => {
        let schemeId = req.query.id;
        if (!schemeId) {
            res.$apiBadRequest();
            return;
        }

        const parentPath = req.query.parent;

        projectService.moveDiagramById(schemeId, parentPath)
        .then(() => {
            res.json({ satus: 'ok' });
        })
        .catch(serverErrorHandler(res, 'Failed to move diagram'));
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsPatchScheme(config, projectService) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const filePath = projectService.getDiagramPath(schemeId);
        if (!filePath) {
            res.$apiNotFound('Scheme was not found');
            return;
        }
        const patchRequest = req.body;

        let chain = Promise.resolve();

        if (patchRequest.hasOwnProperty('name')) {
            const newName = patchRequest.name.trim();
            if (newName.length === 0) {
                res.$apiBadRequest('Invalid name');
                return;
            }
            chain = projectService.renameDiagram(filePath, newName);
        }

        chain.then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(serverErrorHandler(res, 'Failed to rename diagram'));
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsDeleteScheme(config, projectService) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const filePath = projectService.getDiagramPath(schemeId);
        if (!filePath) {
            res.$apiNotFound('Scheme was not found');
            return;
        }

        projectService.deleteFile(filePath)
        .then(() => {
            res.$success('Removed document ' + schemeId);
        })
        .catch(serverErrorHandler(res, 'Failed to delete diagram'));
    };
}

const resultsPerPage = 25;

function toPageNumber(text) {
    const page = parseInt(text);
    if (!isNaN(page) && page !== undefined) {
        return Math.max(1, page);
    }
    return 1;
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsSearchSchemes(config, projectService) {
    return (req, res) => {
        const query = req.query.q;
        const page = req.query.page;

        projectService.findDiagrams(query, page)
        .then(result => {
            res.json(result);
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to search for diagrams');
        });
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsGetScheme(config, projectService) {
    return (req, res) => {
        const schemeId = req.params.docId;

        projectService.getDiagram(schemeId)
        .then(({scheme, folderPath}) => {
            res.json({
                scheme: scheme,
                folderPath: folderPath,
                viewOnly: config.viewOnlyMode
            });
        })
        .catch(err => {
            console.error(err);
            res.$apiNotFound('Scheme was not found');
        });
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsSaveScheme(config, projectService) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const filePath = projectService.getDiagramPath(schemeId);
        if (!filePath) {
            res.$apiNotFound('Scheme was not found');
        }

        const scheme = req.body;
        scheme.id = schemeId;
        scheme.modifiedTime = new Date();
        scheme.publicLink = `/docs/${schemeId}`;

        projectService.writeFile(null, filePath, JSON.stringify(scheme))
        .then(() => {
            res.json(scheme);
        })
        .catch(serverErrorHandler(res, 'Failed to save diagram'));
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsCreateScheme(config, projectService) {
    return (req, res) => {
        const folderPath = safePath(req.query.path);

        const scheme = req.body;

        if (!validateFileName(scheme.name)) {
            res.$apiBadRequest('Invalid request: document name contains illegal characters');
            return;
        }

        projectService.createNewDiagram(folderPath, scheme)
        .then(() => {
            res.json(scheme);
        })
        .catch(serverErrorHandler(res, 'Failed to create new diagram'));
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsMoveDirectory(config, projectService) {
    return (req, res) => {
        const src = safePath(req.query.src);
        const parentPath = safePath(req.query.parent);


        projectService.moveFile(src, parentPath)
        .then(() => {
            res.json({ satus: 'ok' });
        })
        .catch(serverErrorHandler(res, 'Failed to move directory'));
    };
}


/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsPatchDirectory(config, projectService) {
    return (req, res) => {
        const publicPath = safePath(req.query.path);

        const patchRequest = req.body;

        let chain = Promise.resolve();

        if (patchRequest.hasOwnProperty('name')) {
            const newName = patchRequest.name.trim();
            if (newName.length === 0) {
                res.$apiBadRequest('Invalid name');
                return;
            }
            chain = projectService.renameFolder(publicPath, newName);

        }

        chain.then(entry => {
            res.json(entry);
        })
        .catch(serverErrorHandler(res, 'Failed to rename folder'));
    };
}

/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsDeleteDirectory(config, projectService) {
    return (req, res) => {
        const publicPath = safePath(req.query.path);

        console.log('Deleting folder', publicPath);
        projectService.deleteFolder(publicPath)
        .then(() => {
            res.json({
                status: 'ok',
                message: `Removed directory: ${publicPath}`
            });
        })
        .catch(err => {
            console.error('Failed to delete a dir', publicPath, err);
            res.$serverError('Failed to delete directory');
        });
    };
}


/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsCreateDirectory(config, projectService) {
    return (req, res) => {
        const dirBody = req.body;
        if (!validateFileName(dirBody.name)) {
            res.$apiBadRequest('Invalid request: directory name contains illegal characters');
            return;
        }

        const parentPath = safePath(decodeURI(dirBody.path));

        projectService.createFolder(parentPath, dirBody.name)
        .then(entry => {
            res.json(entry);
        })
        .catch(serverErrorHandler(res, 'Failed to create directory'));
    };
}


/**
 *
 * @param {*} config
 * @param {ProjectService} projectService
 * @returns
 */
export function fsListFilesRoute(config, projectService) {
    return (req, res) => {
        const pathPrefix = '/v1/fs/list';
        if (req.path.indexOf(pathPrefix) !== 0) {
            res.$apiBadRequest();
            return;
        }

        let publicPath = safePath(decodeURI(req.path.substring(pathPrefix.length)));
        if (publicPath.charAt(0) === '/') {
            publicPath = publicPath.substring(1);
        }

        let entries = projectService.listFilesInFolder(publicPath);

        if (publicPath) {
            let parentFolder = folderPathFromPath(publicPath);
            if (!parentFolder) {
                parentFolder = '';
            }

            entries =  [{
                kind: 'dir',
                name: '..',
                path: parentFolder
            }].concat(entries);
        }
        res.json({
            path: publicPath,
            viewOnly: config.viewOnlyMode,
            entries
        });
    }
}

/**
 *
 * @param {*} config
 * @param {FileIndex} fileIndex
 * @returns
 */
export function fsCreateSchemePreview(config, fileIndex) {
    return (req, res) => {
        const svg = req.body.svg;
        if (!svg) {
            res.$apiBadRequest('Missing svg code');
            return;
        }

        let schemeId = req.query.id;
        if (!schemeId) {
            res.$apiBadRequest('Missing id paramter');
            return;
        }

        schemeId = schemeId.replace(/(\/|\\)/g, '');

        const doc = fileIndex.getDocumentFromIndex(schemeId);
        if (!doc) {
            res.$apiNotFound('Such document does not exist');
            return;
        }

        const fullPathToPreview = pathToSchemePreview(config, schemeId);
        const folderPath = folderPathFromPath(fullPathToPreview);
        fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory) {
                throw new Error('Not a directory: ' + folderPath);
            }
        })
        .catch(err => {
            return fs.mkdirs(folderPath);
        })
        .then(() => {
            return fs.writeFile(fullPathToPreview, svg);
        })
        .then(() => {
            fileIndex.updatePreviewURL(schemeId, `/media/previews/${schemeId}.svg`);
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to save document preview', err);
            res.$serverError('Failed to save document preview');
        });
    };
}

export function fsUploadMediaFile(config) {
    return (req, res) => {
        const file = req.files.file;
        if (!file) {
            res.$apiBadRequest();
            return;
        }

        const extension = getFileExtension(file.name).toLowerCase();
        if (!supportedMediaExtensions.has(extension)) {
            res.$apiBadRequest('Unsupported file type');
            return;
        }

        const date = new Date();

        const firstPart = `${date.getFullYear()}/${leftZeroPad(date.getMonth())}/${leftZeroPad(date.getDate())}`
        const id = nanoid(30);
        const fileName = `${id}.${extension}`;

        const mediaStoragePath = path.join(config.fs.rootPath, '.media/');
        const folderPath = mediaStoragePath +  firstPart;
        const fullFilePath = folderPath + '/' + fileName;

        fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error('media storage is not a directory' + folderPath)
            }
        })
        .catch(() => {
            return fs.mkdirs(folderPath);
        })
        .then(() => file.mv(fullFilePath))
        .then(() => {
            res.json({
                url: `/media/${firstPart}/${id}.${extension}`
            })
        })
        .catch(err => {
            console.error('Failed to store media file in ' + fullFilePath, err);
            res.$serverError('Failed to upload file');
        });
    };
}

export function fsDownloadMediaFile(config) {
    return (req, res) => {
        const pathPrefix = '/media/';
        if (!req.path.startsWith(pathPrefix)) {
            res.status(400);
            res.send('Bad request');
            return;
        }

        let mediaPath = safePath(decodeURI(req.path.substring(pathPrefix.length)));

        const mediaStoragePath = path.join(config.fs.rootPath, '.media');
        const fullFilePath = path.join(mediaStoragePath, mediaPath);
        fs.stat(fullFilePath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file');
            }
            res.download(fullFilePath);
        })
        .catch(err => {
            res.status(404);
            res.send('Not found');
        })
    };
}

export function fsCreateArt(fileIndex) {
    return (req, res) => {
        const art = req.body;
        if (!art.name || !art.url) {
            res.$apiBadRequest('Invalid payload');
            return;
        }

        return artService.create(fileIndex, art.name, art.url)
        .then(newArt => {
            res.json(newArt);
        })
        .catch(err => {
            console.error('Failed to create an art', err);
            res.$serverError('Failed to create art');
        });
    };
}

export function fsSaveDeleteArt(fileIndex, isDeletion) {
    return (req, res) => {
        const artId = req.params.artId;
        let art = null;

        if (!isDeletion) {
            art = req.body;
            if (!art.name || !art.url) {
                res.$apiBadRequest('Invalid payload');
                return;
            }
        }

        let chain = null;

        if (isDeletion) {
            chain = artService.delete(fileIndex, artId);
        } else {
            chain = artService.save(fileIndex, art.name, art.url);
        }

        return chain
        .then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to save art', err);
            res.$serverError('Failed to save art');
        })
    };
}

export function fsGetArt(fileIndex) {
    return (req, res) => {
        return artService.getAll(fileIndex)
        .then(art => {
            if (Array.isArray(art)) {
                art.forEach(artEntry => {
                    if (artEntry.url && artEntry.url.startsWith(electronMediaPrefix)) {
                        artEntry.url = '/media/' + artEntry.url.substring(electronMediaPrefix.length);
                    }
                });
            }
            res.json(art);
        })
        .catch(err => {
            res.json([]);
        });
    };
}

export function fsSaveStyle(fileIndex) {
    return (req, res) => {
        const style = req.body;
        if (!style || !style.fill || !style.strokeColor || !style.textColor) {
            res.$apiBadRequest('Invalid payload');
            return;
        }

        styleService.create(fileIndex, style.fill, style.strokeColor, style.textColor)
        .then(style => {
            res.json(style);
        })
        .catch(err => {
            console.error('Failed to save style', err);
            res.$serverError('Failed to save style');
        });
    }
}

export function fsDeleteStyle(fileIndex) {
    return (req, res) => {
        const styleId = req.params.styleId;

        styleService.delete(fileIndex, styleId)
        .then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to save style', err);
            res.$serverError('Failed to save style');
        });

    }
}

export function fsGetStyles(fileIndex) {
    return (req, res) => {
        styleService.getAll(fileIndex)
        .then(styles => {
            res.json(styles);
        })
        .catch(err => {
            res.json([]);
        })
    }
}

