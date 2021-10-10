import fs from 'fs-extra';
import _ from 'lodash';

const schemioExtension = '.schemio.json';

export function fsListFilesRoute(req, res) {
    let fsPath = req.query.path;
    if (!fsPath) {
        fsPath = '.';
    }
    fsPath = fsPath.replace(/\/\.\.\//g, '/./');

    fs.readdir(fsPath).then(files => {

        const entries = [];

        _.forEach(files, file => {
            const stat = fs.statSync(`${fsPath}/${file}`);

            let path = fsPath + '/';
            if (path === './') {
                path = '';
            }
            if (stat.isDirectory()) {
                entries.push({
                    kind: 'dir',
                    name: file,
                    path: path + file
                });
            } else if (file.endsWith(schemioExtension)) {
                entries.push({
                    kind: 'scheme',
                    name: file.substring(0, file.length - schemioExtension.length),
                    path: path + file
                })
            }
        });

        if (fsPath !== '.') {
            const pathDirs = fsPath.split('/');
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
            path: fsPath,
            entries 
        });
    }).catch(err => {
        console.error('Could not find files in ', fsPath, err);
        res.status = 404;
        res.json({error: 'NOT_FOUND'});
    });
}