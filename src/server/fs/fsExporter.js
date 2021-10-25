import { fileNameFromPath, schemioExtension } from "./fsUtils.js";
import { walk } from "./walk";
import fs from 'fs-extra';
import path from 'path'


let currentExporter = null;
let lastExporter = null;

function startExporter(config) {
    const exporterPath = path.join(config.fs.rootPath, '.exporter');
    const exporterIndexPath = path.join(exporterPath, 'fs.index.json');

    currentExporter = {
        dirs: [],
        schemeIndex: new Map()
    };

    const relativePath = filePath => {
        if (filePath.startsWith(config.fs.rootPath)) {
            const p = filePath.substring(config.fs.rootPath.length);
            if (p.charAt(0) === '/') {
                return p.substring(1);
            }
            return p;
        }
        return filePath;
    }
    
    const directoryLookup = new Map();

    fs.ensureDir(exporterPath).then(() => {
        return walk(config.fs.rootPath, (absoluteFilePath, isDirectory, absoluteParentPath) => {
            const filePath = relativePath(absoluteFilePath);
            const parentPath = relativePath(absoluteParentPath);

            let parentDir = currentExporter;

            if (directoryLookup.has(parentPath)) {
                parentDir = directoryLookup.get(parentPath);
            }


            if (isDirectory) {
                const newDir = {
                    kind: 'dir',
                    name: fileNameFromPath(filePath),
                    path: filePath,
                    dirs: []
                };
                directoryLookup.set(filePath, newDir);
                parentDir.dirs.push(newDir);

                return fs.ensureDir(path.join(exporterPath, filePath));
            } else if (filePath.endsWith(schemioExtension)) {
                return fs.readFile(absoluteFilePath)
                .then(JSON.parse)
                .then(scheme => {
                    if (scheme.name) {
                        parentDir.dirs.push({
                            kind: 'scheme',
                            name: scheme.name,
                            path: filePath.substring(0, filePath.length - schemioExtension.length),
                            modifiedDate: scheme.modifiedDate
                        })
                    }
                    return fs.copyFile(absoluteFilePath, path.join(exporterPath, filePath));
                })
            }
        });
    }).then(() => {
        lastExporter = currentExporter;
        currentExporter = null;
        fs.writeFile(exporterIndexPath, JSON.stringify(lastExporter));
    }).catch(err => {
        console.error('Exporter failed', err);
    });
}

export function fsExportStatic(config) {
    return (req, res) => {
        if (currentExporter !== null) {
            res.status(400);
            res.json({
                status: 'failed',
                message: 'previous exporter is still running'
            });
        }
        startExporter(config);

        res.json({
            status: 'ok',
            message: 'Started exporter',
        });
    };
}