import fs from 'fs-extra';
import _ from 'lodash';
import { nanoid } from 'nanoid'
import {schemioExtension, supportedMediaExtensions} from './fsConsts';
import { indexScheme, reindex, searchSchemes, unindexScheme } from './searchIndex';


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
        const path = safePath(req.query.path);
        let schemeId = req.query.id;
        if (!schemeId) {
            schemeId = '';
        }

        schemeId = schemeId.replace(/\//g, '');
        if (schemeId.length === 0) {
            res.$apiBadRequest('Invalid request: scheme id is empty');
            return;
        }

        const realPath = rightFilePad(config.fs.rootPath) + path;
        const fileName = schemeId + schemioExtension;
        const fullPath = realPath + schemioExtension;

        const dst = safePath(req.query.dst);
        const realDst = rightFilePad(config.fs.rootPath) + dst;

        Promise.all([fs.stat(fullPath), fs.stat(realDst)])
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
            return fs.move(fullPath, rightFilePad(realDst) + fileName).then(() => {
                return scheme;
            });
        })
        .then(scheme => {
            unindexScheme(path);
            const newPath = rightFilePad(dst) + schemeId;
            indexScheme(newPath, realDst, scheme);

            res.json({ satus: 'ok' });
        })
        .catch(err => {
            console.error(err);
            res.$serverError('Failed to move directory');
        })
    };
}

function getPathDetailsToScheme(config, req) {
    const pathPrefix = '/v1/fs/schemes/';
    const path = safePath(decodeURI(req.path.substring(pathPrefix.length)));

    const realPath = rightFilePad(config.fs.rootPath) + path;

    const idx = path.lastIndexOf('/');
    let schemeId = path;
    if (idx >= 0) {
        schemeId = path.substring(idx);
    }
    return {
        fsPath: realPath + schemioExtension,
        path: path,
        schemeId: schemeId
    };
}

export function fsPatchScheme(config) {
    return (req, res) => {
        const {fsPath, path, schemeId} = getPathDetailsToScheme(config, req);

        const patchRequest = req.body;
        
        fs.readFile(fsPath).then(content => {
            const scheme = JSON.parse(content);

            if (patchRequest.hasOwnProperty('name')) {
                const newName = patchRequest.name.trim();
                if (newName.length === 0) {
                    throw new Error('Empty name');
                }

                scheme.name = newName;
                return fs.writeFile(fsPath, JSON.stringify(scheme)).then(() => {
                    indexScheme(path, fsPath, scheme);
                });
            }
        })
        .then(() => {
            res.json({
                status: 'ok'
            });
        })
        .catch(err => {
            console.error('Failed to patch scheme', fsPath, err);
            res.$serverError('Failed to patch scheme')
        })
    };
}

export function fsDeleteScheme(config) {
    return (req, res) => {
        const {fsPath, path, schemeId} = getPathDetailsToScheme(config, req);
        
        fs.stat(fsPath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file '+ fsPath);
            }
        })
        .then(() => {
            return fs.unlink(fsPath);
        })
        .then(() => {
            unindexScheme(path);
            res.$success('Removed scheme ' + schemeId);
        })
        .catch(err => {
            console.error('Failed to delete scheme file', fsPath, err);
            res.$serverError('Failed to delete scheme')
        })
    };
}

export function fsSearchSchemes(config) {
    return (req, res) => {
        const schemes = searchSchemes(req.query.q || '');
        res.json({
            totalResults: schemes.length,
            results: schemes
        });
    };
}

export function fsGetScheme(config) {
    return (req, res) => {
        const {fsPath, path, schemeId} = getPathDetailsToScheme(config, req);

        fs.readFile(fsPath, 'utf-8').then(content => {
            const scheme = JSON.parse(content);
            scheme.projectLink = '/';
            res.json({
                scheme: scheme,
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
        const {fsPath, path, schemeId} = getPathDetailsToScheme(config, req);

        const scheme = req.body;
        scheme.id = schemeId;
        scheme.publicLink = `/schemes/${path}`;

        fs.stat(fsPath)
        .then(stat => {
            if (!stat.isFile()) {
                return Promise.reject('Not a file: ' + fsPath);
            }
            return fs.writeFile(fsPath, JSON.stringify(scheme));
        })
        .then(() => {
            indexScheme(path, fullPath, scheme);
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
        const path = safePath(req.query.path);
        const realPath = rightFilePad(config.fs.rootPath) + path;
        
        const scheme = req.body;

        if (!validateFileName(scheme.name)) {
            res.$apiBadRequest('Invalid request: scheme name contains illegal characters');
            return;
        }
        const id = nanoid();
        const fullPath = rightFilePad(realPath) + id + schemioExtension;
        scheme.id = id;
        
        const schemePath = path + '/' + id;
        scheme.publicLink = `/schemes/${schemePath}`;

        fs.writeFile(fullPath, JSON.stringify(scheme)).then(() => {
            indexScheme(schemePath, fullPath, scheme);
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

        const realSrc = rightFilePad(config.fs.rootPath) + src;
        const realDst = rightFilePad(config.fs.rootPath) + dst;

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
        const path = safePath(req.query.path);
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

        const realPath = rightFilePad(rightFilePad(config.fs.rootPath) + path) + req.query.name;
        fs.stat(realPath).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error('Not a directory');
            }
        })
        .then(() => {
            const newPath = rightFilePad(rightFilePad(config.fs.rootPath) + path) + newName;
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
        const path = safePath(req.query.path);
        if (!validateFileName(req.query.name)) {
            res.$apiBadRequest('Invalid request: scheme name contains illegal characters');
            return;
        }

        const realPath = rightFilePad(rightFilePad(config.fs.rootPath) + path) + req.query.name;

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
                message: `Removed directory: ${path}/${req.query.name}`
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

        const path = safePath(decodeURI(dirBody.path));

        const realPath = rightFilePad(rightFilePad(config.fs.rootPath) + path) + dirBody.name;

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
        
        let path = safePath(decodeURI(req.path.substring(pathPrefix.length)));
        if (path.charAt(0) === '/') {
            path = path.substring(1);
        }

        const realPath = rightFilePad(config.fs.rootPath) + path;

        fs.readdir(realPath).then(files => {
            
            const entries = [];

            _.forEach(files, file => {
                if (file.startsWith('.')) {
                    return;
                }
                const stat = fs.statSync(`${realPath}/${file}`);

                let entryPath = file;
                if (path) {
                    entryPath = rightFilePad(path) + file;
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

                        entries.push({
                            kind: 'scheme',
                            id: file.substring(0, file.length - schemioExtension.length),
                            name: scheme.name,
                            path: entryPath.substring(0, entryPath.length - schemioExtension.length),
                            modifiedTime: stat.mtime,
                        });
                    } catch(err) {
                        console.error('Failed to parse scheme file', entryPath, err);
                    }
                }
            });

            if (path.length > 0) {
                const pathDirs = path.split('/');
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
                path: path,
                viewOnly: config.viewOnlyMode,
                entries 
            });
        }).catch(err => {
            console.error('Could not find files in ', path, err);
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

        const folderPath = rightFilePad(config.fs.rootPath) + '.media/previews/';
        fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory) {
                throw new Error('Not a directory: ' + folderPath);
            }
        })
        .catch(err => {
            return fs.mkdirs(folderPath);
        })
        .then(() => {
            return fs.writeFile(`${folderPath}/${schemeId}`, svg);
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

export function fsDownloadSchemePreview(config) {
    return (req, res) => {
        const schemeId = req.params.schemeId;

        const fullFilePath = `${rightFilePad(config.fs.rootPath)}.media/previews/${schemeId}`;
        fs.stat(fullFilePath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file: ' + fullFilePath);
            }
            res.setHeader('content-type', 'image/svg+xml');
            res.download(fullFilePath);
        })
        .catch(err => {
            res.status(404);
            res.send('Not found');
        })
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

        const firstPart = `${date.getFullYear()}-${leftZeroPad(date.getMonth())}-${leftZeroPad(date.getDate())}`
        const id = nanoid(30);
        const fileName = `${id}.${extension}`;

        const mediaStoragePath = rightFilePad(config.fs.rootPath) + '.media/';
        const folderPath = mediaStoragePath +  firstPart.replace(/\-/g, '/');
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
                url: `/media/${firstPart}-${id}.${extension}`
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
        const objectId = req.params.objectId;

        if (objectId.length < 11) {
            res.status(404);
            res.send('Not found');
            return;
        }

        const mediaStoragePath = rightFilePad(config.fs.rootPath) + '.media/';
        const folderPart = safePath(objectId.substring(0, 10).replace(/\-/g, '/'));
        const fileName = objectId.substring(11).replace(/\//g, '');
        const fullFilePath = mediaStoragePath + folderPart + '/' + fileName;
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

        const artFile = rightFilePad(config.fs.rootPath) + '.art.json';

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

        const artFile = rightFilePad(config.fs.rootPath) + '.art.json';
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
        const artFile = rightFilePad(config.fs.rootPath) + '.art.json';
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

        const stylesFile = rightFilePad(config.fs.rootPath) + '.styles.json';
        
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

        const stylesFile = rightFilePad(config.fs.rootPath) + '.styles.json';
        
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
        const stylesFile = rightFilePad(config.fs.rootPath) + '.styles.json';
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

function rightFilePad(path) {
    if (path.charAt(path.length - 1) !== '/') {
        return path + '/';
    }
    return path;
}