import fs from 'fs-extra';
import _ from 'lodash';

const schemioExtension = '.schemio.json';


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

export function fsCreateDirectory(config) {
    return (req, res) => {
        const dirBody = req.body;
        if (!validateFileName(dirBody.name)) {
            res.status(400);
            res.json({
                error: 'BAD_REQUEST',
                message: 'Invalid request'
            })
        }
        
        let path = dirBody.path;
        if (!path) {
            path = '.';
        }
        path = path.replace(/\/\.\.\//g, '/./');

        const realPath = config.fs.rootPath + path + '/' + dirBody.name;

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
            res.status(500);
            res.json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create directory'
            });
        });
    };
}
export function fsListFilesRoute(config) {
    return (req, res) => {
        let path = req.query.path;
        if (!path) {
            path = '.';
        }
        path = path.replace(/\/\.\.\//g, '/./');

        const realPath = config.fs.rootPath + path;

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
                        path: entryPath + file
                    });
                } else if (file.endsWith(schemioExtension)) {
                    entries.push({
                        kind: 'scheme',
                        name: file.substring(0, file.length - schemioExtension.length),
                        path: entryPath + file
                    })
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
            res.status = 404;
            res.json({error: 'NOT_FOUND'});
        });
    }
}