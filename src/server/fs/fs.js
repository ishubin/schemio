import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { nanoid } from 'nanoid'
import {schemioExtension, supportedMediaExtensions} from './fsUtils.js';
import { getEntityFromIndex, indexScheme, reindex, searchIndexEntities, unindexScheme } from './searchIndex';


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

export function fsMoveScheme(config) {
    return (req, res) => {
        let schemeId = req.query.id;
        if (!schemeId) {
            res.$apiBadRequest();
            return;
        }

        schemeId = schemeId.replace(/\//g, '');
        if (schemeId.length === 0) {
            res.$apiBadRequest('Invalid request: scheme id is empty');
            return;
        }

        const entity = getEntityFromIndex(schemeId);
        if (!entity) {
            res.$apiNotFound('Scheme was not found');
            return;
        }

        const fileName = schemeId + schemioExtension;
        const fullPath = path.join(config.fs.rootPath, entity.fsPath);

        const safeDst = safePath(req.query.dst);
        const relativeDstPath = path.join(safeDst, fileName);
        const realDstFolder = path.join(config.fs.rootPath, safeDst)
        const realDst = path.join(config.fs.rootPath, relativeDstPath);

        Promise.all([fs.stat(fullPath), fs.stat(realDstFolder)])
        .then(values => {
            const [srcStat, dstStat] = values;
            if (!srcStat.isFile) {
                throw new Error('Source is not a file');
            }
            if (!dstStat.isDirectory) {
                throw new Error('Destination is not a directory');
            }
        })
        .then(() => {
            return fs.readFile(fullPath).then(JSON.parse);
        })
        .then(scheme => {
            return fs.move(fullPath, realDst).then(() => {
                return scheme;
            });
        })
        .then(scheme => {
            indexScheme(schemeId, scheme, relativeDstPath);
            res.json({ satus: 'ok' });
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to move directory');
        })
    };
}

export function fsPatchScheme(config) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const entity = getEntityFromIndex(schemeId)
        if (!entity) {
            res.$apiNotFound('Scheme was not found');
        }
        const patchRequest = req.body;
        
        fs.readFile(entity.fsPath).then(content => {
            const scheme = JSON.parse(content);

            if (patchRequest.hasOwnProperty('name')) {
                const newName = patchRequest.name.trim();
                if (newName.length === 0) {
                    throw new Error('Empty name');
                }

                scheme.name = newName;
                return fs.writeFile(entity.fsPath, JSON.stringify(scheme)).then(() => {
                    indexScheme(schemeId, scheme, entity.fsPath);
                });
            }
        })
        .then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to patch scheme', entity.fsPath, err);
            res.$serverError('Failed to patch scheme')
        })
    };
}

export function fsDeleteScheme(config) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const entity = getEntityFromIndex(schemeId)
        if (!entity) {
            res.$apiNotFound('Scheme was not found');
        }
        
        const fullPath = path.join(config.fs.rootPath, entity.fsPath);

        fs.stat(fullPath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file '+ fullPath);
            }
        })
        .then(() => {
            return fs.unlink(fullPath);
        })
        .then(() => {
            unindexScheme(schemeId);
            res.$success('Removed scheme ' + schemeId);
        })
        .catch(err => {
            console.error('Failed to delete scheme file', fullPath, err);
            res.$serverError('Failed to delete scheme')
        })
    };
}

export function fsSearchSchemes(config) {
    return (req, res) => {
        const entities = searchIndexEntities(req.query.q || '');
        const schemes = _.map(entities, entity => {
            return {
                name: entity.name,
                publicLink: `/schemes/${entity.id}`
            };
        });
        res.json({
            totalResults: schemes.length,
            results: schemes
        });
    };
}

export function fsGetScheme(config) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const entity = getEntityFromIndex(schemeId)
        if (!entity) {
            res.$apiNotFound('Scheme was not found');
        }
        const fullPath = path.join(config.fs.rootPath, entity.fsPath);

        let idx = entity.fsPath.lastIndexOf('/');
        if (idx < 0) {
            idx = 0;
        }
        const folderPath = entity.fsPath.substring(0, idx);
        
        fs.readFile(fullPath, 'utf-8').then(content => {
            const scheme = JSON.parse(content);
            scheme.projectLink = '/';
            res.json({
                scheme: scheme,
                folderPath: folderPath,
                viewOnly: config.viewOnlyMode
            });
        })
        .catch(err => {
            if (err.code === 'ENOENT') {
                res.$apiNotFound('Such scheme does not exist');
            } else {
                console.error('Failed to read scheme file', fullPath, err);
                res.$serverError('Failed to create scheme');
            }
        });
    };
}

export function fsSaveScheme(config) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const entity = getEntityFromIndex(schemeId)
        if (!entity) {
            res.$apiNotFound('Scheme was not found');
        }

        const scheme = req.body;
        scheme.id = schemeId;
        scheme.modifiedTime = new Date();
        scheme.publicLink = `/schemes/${schemeId}`;

        const fullPath = path.join(config.fs.rootPath, entity.fsPath);

        fs.stat(fullPath)
        .then(stat => {
            if (!stat.isFile()) {
                return Promise.reject('Not a file: ' + fullPath);
            }
            return fs.writeFile(fullPath, JSON.stringify(scheme));
        })
        .then(() => {
            indexScheme(schemeId, scheme, entity.fsPath);
            res.json(scheme);
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to create scheme');
        });
    };
}

export function fsCreateScheme(config) {
    return (req, res) => {
        const publicPath = safePath(req.query.path);
        
        const scheme = req.body;

        if (!validateFileName(scheme.name)) {
            res.$apiBadRequest('Invalid request: scheme name contains illegal characters');
            return;
        }
        let id = nanoid();
        if (id.charAt(0) === '-'){
            //doing this so that we don't get files that start with dash symbol
            id = '_' + id.substr(1);
        }

        const indexPath = path.join(publicPath, id + schemioExtension)
        const fullPath = path.join(config.fs.rootPath, indexPath);
        scheme.id = id;
        scheme.modifiedTime = new Date();
        
        scheme.publicLink = `/schemes/${id}`;
        scheme.previewURL = null;

        fs.writeFile(fullPath, JSON.stringify(scheme)).then(() => {
            indexScheme(id, scheme, indexPath);
            res.json(scheme);
        })
        .catch(err => {
            res.$serverError('Failed to create scheme');
        });
    };
}

export function fsMoveDirectory(config) {
    return (req, res) => {
        const src = safePath(req.query.src);
        const dst = safePath(req.query.dst);

        const realSrc = path.join(config.fs.rootPath, src);
        const realDst = path.join(config.fs.rootPath, dst);

        Promise.all([fs.stat(realSrc), fs.stat(realDst)])
        .then(values => {
            const [srcStat, dstStat] = values;
            if (!srcStat.isDirectory) {
                throw new Error('Source is not a directory');
            }
            if (!dstStat.isDirectory) {
                throw new Error('Destination is not a directory');
            }
        })
        .then(() => {
            let name = src;
            const idx = src.lastIndexOf('/');
            if (idx >= 0)  {
                name = src.substring(idx + 1);
            }

            return fs.move(realSrc, `${realDst}/${name}`);
        })
        .then(() => {
            reindex(config);
            res.json({ satus: 'ok' });
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to move directory');
        })
    };
}


export function fsPatchDirectory(config) {
    return (req, res) => {
        const publicPath = safePath(req.query.path);
        if (!validateFileName(req.query.name)) {
            res.$apiBadRequest('Invalid request: scheme name contains illegal characters');
            return;
        }
        let newName = null;
        if (req.body.hasOwnProperty('name')) {
            newName = req.body.name.trim();
        }
        if (!validateFileName(newName)) {
            res.$apiBadRequest('Invalid directory name');
            return;
        }

        const realPath = path.join(config.fs.rootPath, publicPath, req.query.name);
        fs.stat(realPath).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error('Not a directory');
            }
        })
        .then(() => {
            const newPath = path.join(config.fs.rootPath, publicPath, newName);
            return fs.move(realPath, newPath);
        })
        .then(() => {
            reindex(config);
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to rename a directory');
        });
    };
}

export function fsDeleteDirectory(config) {
    return (req, res) => {
        const publicPath = safePath(req.query.path);
        if (!validateFileName(req.query.name)) {
            res.$apiBadRequest('Invalid request: scheme name contains illegal characters');
            return;
        }

        const realPath = path.join(config.fs.rootPath, publicPath, req.query.name);

        fs.stat(realPath).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error('Not a directory');
            }
        })
        .then(() => {
            return fs.rmdir(realPath, {recursive: true});
        })
        .then(() => {
            reindex(config);
            res.json({
                status: 'ok',
                message: `Removed directory: ${publicPath}/${req.query.name}`
            });
        })
        .catch(err => {
            console.error('Failed to delete a dir', realPath, err);
            res.$serverError('Failed to delete directory');
        });
    };
}

export function fsCreateDirectory(config) {
    return (req, res) => {
        const dirBody = req.body;
        if (!validateFileName(dirBody.name)) {
            res.$apiBadRequest('Invalid request: directory name contains illegal characters');
            return;
        }

        const publicPath = safePath(decodeURI(dirBody.path));

        const realPath = path.join(config.fs.rootPath, publicPath, dirBody.name);

        fs.mkdir(realPath).then(() => {
            res.json({
                kind: 'dir',
                name: dirBody.name,
                path: realPath
            });
        })
        .catch(err => {
            console.error('Failed to create directory', realPath, err);
            res.$serverError('Failed to create directory');
        });
    };
}


export function fsListFilesRoute(config) {
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

        const realPath = path.join(config.fs.rootPath, publicPath);

        fs.readdir(realPath).then(files => {
            
            const entries = [];

            _.forEach(files, file => {
                if (file.startsWith('.')) {
                    return;
                }
                const stat = fs.statSync(`${realPath}/${file}`);

                let entryPath = file;
                if (publicPath) {
                    entryPath = path.join(publicPath, file);
                }

                if (stat.isDirectory()) {
                    entries.push({
                        kind: 'dir',
                        name: file,
                        path: entryPath,
                        modifiedTime: stat.mtime,
                    });
                } else if (file.endsWith(schemioExtension)) {
                    try {
                        const content = fs.readFileSync(`${realPath}/${file}`, 'utf-8');
                        const scheme = JSON.parse(content);

                        let idx = entryPath.lastIndexOf('/');
                        if (idx < 0) {
                            idx = 0;
                        }

                        entries.push({
                            kind: 'scheme',
                            id: file.substring(0, file.length - schemioExtension.length),
                            name: scheme.name,
                            path: entryPath.substring(0, idx),
                            modifiedTime: scheme.modifiedTime,
                            previewURL: scheme.previewURL
                        });
                    } catch(err) {
                        console.error('Failed to parse scheme file', entryPath, err);
                    }
                }
            });

            if (publicPath.length > 0) {
                const pathDirs = publicPath.split('/');
                if (pathDirs.length === 0) {
                    entries.splice(0, 0, {
                        kind: 'dir',
                        name: '..',
                        path: ''
                    });
                } else {
                    pathDirs.pop();
                    entries.splice(0, 0, {
                        kind: 'dir',
                        name: '..',
                        path: pathDirs.join('/')
                    });
                }
            }
            res.json({
                path: publicPath,
                viewOnly: config.viewOnlyMode,
                entries 
            });
        }).catch(err => {
            console.error('Could not find files in ', publicPath, err);
            res.$apiNotFound('Such path does not exist');
        });
    }
}

export function fsCreateSchemePreview(config) {
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

        const entity = getEntityFromIndex(schemeId);
        if (!entity) {
            res.$apiNotFound('Such scheme does not exist');
            return;
        }

        const schemeFsPath = path.join(config.fs.rootPath, entity.fsPath);
        const folderPath = path.join(config.fs.rootPath, '.media', 'previews');
        fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory) {
                throw new Error('Not a directory: ' + folderPath);
            }
        })
        .catch(err => {
            return fs.mkdirs(folderPath);
        })
        .then(() => {
            return fs.writeFile(path.join(folderPath, `${schemeId}.svg`), svg);
        })
        .then(() => {
            return fs.readFile(schemeFsPath, 'utf-8').then(JSON.parse);
        })
        .then(scheme => {
            scheme.previewURL = `/media/previews/${schemeId}.svg`;
            console.log('writing to', schemeFsPath)
            return fs.writeFile(schemeFsPath, JSON.stringify(scheme));
        })
        .then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to save scheme preview', err);
            res.$serverError('Failed to save scheme preview');
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

export function fsCreateArt(config) {
    return (req, res) => {
        const art = req.body;
        if (!art.name || !art.url) {
            res.$apiBadRequest('Invalid payload');
            return;
        }

        const newArt = {
            id: nanoid(),
            name: art.name,
            url: art.url
        };

        const artFile = path.join(config.fs.rootPath, '.art.json');

        fs.stat(artFile)
        .catch(err => {
            return fs.writeFile(artFile, '[]');
        })
        .then(() => {
            return fs.readFile(artFile, 'utf-8');
        })
        .then(content => {
            try {
                return JSON.parse(content);
            } catch(err) {
                return [];
            }
        })
        .then(existingArt => {
            existingArt.push(newArt);
            return fs.writeFile(artFile, JSON.stringify(existingArt));
        })
        .then(() => {
            res.json(newArt);
        })
        .catch(err => {
            console.error('Failed to create an art', err);
        });
    };
}

export function fsSaveDeleteArt(config, isDeletion) {
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

        const artFile = path.join(config.fs.rootPath, '.art.json');
        fs.readFile(artFile, 'utf-8').then(content => {
            return JSON.parse(content);
        })
        .then(allArt => {
            for (let i = 0; i < allArt.length; i++) {
                if (allArt[i].id === artId) {
                    if (isDeletion) {
                        allArt.splice(i, 1);
                    } else {
                        allArt[i].name = art.name;
                        allArt[i].url = art.url;
                    }
                    return fs.writeFile(artFile, JSON.stringify(allArt));
                }
            }
            return null;
        })
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

export function fsGetArt(config) {
    return (req, res) => {
        const artFile = path.join(config.fs.rootPath, '.art.json');
        return fs.readFile(artFile).then(content => {
            res.json(JSON.parse(content));
        })
        .catch(err => {
            res.json([]);
        });
    };
}

export function fsSaveStyle(config) {
    return (req, res) => {
        const style = req.body;
        if (!style || !style.fill || !style.strokeColor || !style.textColor) {
            res.$apiBadRequest('Invalid payload');
            return;
        }

        const stylesFile = path.join(config.fs.rootPath, '.styles.json');
        
        fs.stat(stylesFile)
        .catch(err => {
            return fs.writeFile(stylesFile, '[]');
        })
        .then(() => {
            return fs.readFile(stylesFile, 'utf-8');
        })
        .then(content => {
            try {
                return JSON.parse(content);
            } catch(err) {
                return [];
            }
        })
        .then(styles => {
            const newStyle = {
                id: nanoid(),
                fill: style.fill,
                strokeColor: style.strokeColor,
                textColor: style.textColor
            }
            styles.push(newStyle);

            return fs.writeFile(stylesFile, JSON.stringify(styles)).then(() => newStyle);
        })
        .then(style => {
            res.json(style);
        })
        .catch(err => {
            console.error('Failed to save style', err);
            res.$serverError('Failed to save style');
        });
    }
}

export function fsDeleteStyle(config) {
    return (req, res) => {
        const styleId = req.params.styleId;

        const stylesFile = path.join(config.fs.rootPath, '.styles.json');
        
        fs.stat(stylesFile)
        .catch(err => {
            return fs.writeFile(stylesFile, '[]');
        })
        .then(() => {
            return fs.readFile(stylesFile, 'utf-8');
        })
        .then(content => {
            try {
                return JSON.parse(content);
            } catch(err) {
                return [];
            }
        })
        .then(styles => {
            for (let i = 0; i < styles.length; i++) {
                if (styles[i].id === styleId) {
                    styles.splice(i, 1);
                    return fs.writeFile(stylesFile, JSON.stringify(styles));
                }
            }
            return null;
        })
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

export function fsGetStyles(config) {
    return (req, res) => {
        const stylesFile = path.join(config.fs.rootPath, '.styles.json');
        fs.readFile(stylesFile, 'utf-8').then(content => {
            return JSON.parse(content);
        })
        .then(styles => {
            res.json(styles);
        })
        .catch(err => {
            res.json([]);
        })
    }
}


function leftZeroPad(number) {
    if (number >= 0 && number < 10) {
        return '0' + number;
    }
    return '' + number;
}

function getFileExtension(name) {
    const idx = name.lastIndexOf('.');
    if (idx > 0) {
        return name.substring(idx + 1);
    }
    return '';
}