import fs from 'fs-extra';
import _ from 'lodash';
import { nanoid } from 'nanoid'

const schemioExtension = '.schemio.json';

const supportedMediaExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'tiff',
    'bmp'
]);


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
        path = '.';
    }
    path = path.replace(/\/\.\.\//g, '/./');
    return path;
}

export function fsDeleteScheme(config) {
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
        const fullPath = realPath + '/' + schemeId + schemioExtension;
        
        fs.stat(fullPath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file '+ fullPath);
            }
        })
        .then(() => {
            return fs.unlink(fullPath);
        })
        .then(() => {
            res.$success('Removed scheme ' + schemeId);
        })
        .catch(err => {
            console.error('Failed to delete scheme file', fullPath, err);
            res.$serverError('Failed to delete scheme')
        })
    };
}

export function fsGetScheme(config) {
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
        const fullPath = realPath + '/' + schemeId + schemioExtension;
        
        fs.readFile(fullPath, 'utf-8').then(content => {
            res.json(JSON.parse(content));
        })
        .catch(err => {
            console.error('Failed to read scheme file', fullPath, err);
            res.$serverError('Failed to create scheme');
        });
    };
}

export function fsSaveScheme(config) {
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
        const fullPath = realPath + '/' + schemeId + schemioExtension;

        const scheme = req.body;
        scheme.id = schemeId;
        scheme.path = path;

        fs.stat(fullPath)
        .then(stat => {
            if (!stat.isFile()) {
                return Promise.reject();
            }
            return fs.writeFile(fullPath, JSON.stringify(scheme));
        })
        .then(() => {
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
        const fullPath = realPath + '/' + id + schemioExtension;
        scheme.id = id;
        scheme.path = path;

        fs.writeFile(fullPath, JSON.stringify(scheme)).then(() => {
            res.json(scheme);
        })
        .catch(err => {
            res.$serverError('Failed to create scheme');
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

        const realPath = rightFilePad(config.fs.rootPath) + path + '/' + req.query.name;

        fs.stat(realPath).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error('Not a directory');
            }
            return fs.rmdir(realPath, {recursive: true});
        })
        .then(() => {
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

        const path = safePath(dirBody.path);

        const realPath = rightFilePad(config.fs.rootPath) + path + '/' + dirBody.name;

        let entryPath = path + '/';
        if (entryPath === './') {
            entryPath = '';
        }
        fs.mkdir(realPath).then(() => {
            res.json({
                kind: 'dir',
                name: dirBody.name,
                path: entryPath + dirBody.name
            });
        })
        .catch(err => {
            res.$serverError('Failed to create directory');
        });
    };
}


export function fsListFilesRoute(config) {
    return (req, res) => {
        const path = safePath(req.query.path);
        const realPath = rightFilePad(config.fs.rootPath) + path;

        fs.readdir(realPath).then(files => {
            
            const entries = [];

            _.forEach(files, file => {
                const stat = fs.statSync(`${realPath}/${file}`);

                let entryPath = path + '/';
                if (entryPath === './') {
                    entryPath = '';
                }
                if (stat.isDirectory()) {
                    entries.push({
                        kind: 'dir',
                        name: file,
                        path: entryPath + file,
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
                            path: entryPath,
                            modifiedTime: stat.mtime,
                        });
                    } catch(err) {
                        console.error('Failed to parse scheme file', entryPath, err);
                    }
                }
            });

            if (path !== '.') {
                const pathDirs = path.split('/');
                if (pathDirs.length === 0) {
                    entries.splice(0, 0, {
                        kind: 'dir',
                        name: '..',
                        path: '.'
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