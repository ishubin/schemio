import { fileNameFromPath, mediaFolder, schemioExtension } from "./fsUtils.js";
import { walk } from "./walk";
import fs from 'fs-extra';
import path from 'path'
import forEach from 'lodash/forEach';


let currentExporter = null;
let lastExporter = null;

const exporterFolder = '.exporter';

function traverseItems(items, callback) {
    forEach(items, item => {
        callback(item);
        if (item.childItems) {
            traverseItems(item.childItems, callback);
        }
    })
}
const mediaPrefix = '/media/';

function doesReferenceMedia(prop) {
    return typeof prop === 'string' && prop.startsWith(mediaPrefix);
}

function exportMediaFile(config, mediaURL) {
    if (!mediaURL.startsWith(mediaPrefix)) {
        return Promise.resolve(null);
    }

    const relativeFilePath = mediaURL.substring(mediaPrefix.length);

    const absoluteFilePath = path.join(config.fs.rootPath, '.media', relativeFilePath);
    const absoluteDstFilePath = path.join(config.fs.rootPath, '.exporter', 'media', relativeFilePath);

    return fs.stat(absoluteFilePath)
    .then(stat => {
        if (!stat.isFile) {
            throw new Error(`Not a file: ${relativeFilePath}`)
        }

        const idx = absoluteDstFilePath.lastIndexOf('/');
        if (idx > 0) {
            const dirPath = absoluteDstFilePath.substring(0, idx);
            return fs.ensureDir(dirPath);
        }
    })
    .then(() => {
        return fs.copyFile(absoluteFilePath, absoluteDstFilePath);
    });
}

function exportMediaForScheme(config, scheme, schemeId) {
    let chain = Promise.resolve(null);

    const mediaFailCatcher = err => {
        console.error('Failed to export media', err);
    };

    traverseItems(scheme.items, item => {
        if (item.shapeProps) {
            if (item.shape === 'image' && doesReferenceMedia(item.shapeProps.image)) {
                chain = chain.then(() => exportMediaFile(config, item.shapeProps.image))
                .then(mediaURL => {
                    item.shapeProps.image = mediaURL;
                })
                .catch(mediaFailCatcher);
            } else if (item.shapeProps.fill && typeof item.shapeProps.fill === 'object' && doesReferenceMedia(item.shapeProps.fill.image)) {
                chain = chain.then(() => exportMediaFile(config, item.shapeProps.fill.image))
                .then(mediaURL => {
                    item.shapeProps.fill.image = mediaURL;
                })
                .catch(mediaFailCatcher);
            }
        }
    });

    return chain.then(() => {
        const fileName =  `${schemeId}.svg`;
        const filePath = path.join('previews', fileName);
        const src = path.join(config.fs.rootPath, '.media', filePath);
        const dstPreviewDir = path.join(config.fs.rootPath, exporterFolder, 'media', 'previews');
        const dst = path.join(dstPreviewDir, fileName);

        return fs.ensureDir(dstPreviewDir)
        .then(() => {
            return fs.copyFile(src, dst);
        })
        .catch(err => {
            console.error('Could not cope scheme preview', err);
        })
    });
}


function startExporter(config) {
    const exporterPath = path.join(config.fs.rootPath, exporterFolder);
    const exporterIndexPath = path.join(exporterPath, 'fs.index.json');

    currentExporter = {
        entries: [],
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
                    entries: []
                };
                directoryLookup.set(filePath, newDir);
                parentDir.entries.push(newDir);

                return fs.ensureDir(path.join(exporterPath, filePath));
            } else if (filePath.endsWith(schemioExtension)) {

                const idx = filePath.lastIndexOf('/') + 1;
                const schemeId = filePath.substring(idx, filePath.length - schemioExtension.length);


                return fs.readFile(absoluteFilePath)
                .then(JSON.parse)
                .then(scheme => {
                    if (scheme.name) {
                        parentDir.entries.push({
                            kind: 'scheme',
                            name: scheme.name,
                            path: filePath.substring(0, filePath.length - schemioExtension.length),
                            modifiedDate: scheme.modifiedDate
                        })
                    }
                    return fs.copyFile(absoluteFilePath, path.join(exporterPath, filePath)).then(() => scheme);
                })
                .then(scheme => exportMediaForScheme(config, scheme, schemeId))
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