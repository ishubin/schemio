const path = require('path');
const fs = require('fs/promises');
// const fs = require('fs');
const walker = require('walker');
const { dialog } = require('electron');


const schemioExtension = '.schemio.json';

export async function openProject() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) {
        return;
    } else {
        return filePaths[0];
    }
}

export function scanProject(event, projectPath) {
    return new Promise((resolve, reject) => {
        const result = [];
        const allDirs = new Map();

        const findParentList = (filePath) => {
            const parentDir = allDirs.get(path.dirname(filePath));
            if (parentDir) {
                return parentDir.children;
            }
            return result;
        };

        walker(projectPath)
        .filterDir((dir, stat) => {
            const name = path.basename(dir);
            return !name.startsWith('.');
        })
        .on('dir', (dir, stat) => {
            const dirEntry = {
                kind: 'dir',
                path: path.relative(projectPath, dir),
                name: path.basename(dir),
                children: []
            };
            findParentList(dir).push(dirEntry);
            allDirs.set(dir, dirEntry);
        })
        .on('file', (file, stat) => {
            const name = path.basename(file);
            if (!name.startsWith('.')) {
                if (name.endsWith(schemioExtension)) {
                    findParentList(file).push({
                        kind: 'schemio-doc',
                        path: path.relative(projectPath, file),
                        name: name.substring(0, name.length - schemioExtension.length)
                    });
                }
            }
        })
        .on('end', () => {
            if (result.length > 0) {
                resolve(result[0].children);
            } else {
                resolve([]);
            }
        })
        .on('error', (err, entry, stat) => {
            //TODO handle error
            // reject(err);
        });
    });
}

export function readProjectFile(event, projectPath, filePath) {
    return fs.readFile(path.join(projectPath, filePath), {encoding: 'utf-8'}).then(content => {
        let name = path.basename(filePath);
        let kind = 'file';
        if (name.endsWith(schemioExtension)) {
            name = name.substring(0, name.length - schemioExtension.length);
            kind = 'schemio-doc';
        }
        return {
            path: filePath,
            kind,
            name,
            content
        };
    });
}
