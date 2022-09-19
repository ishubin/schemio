/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { fileNameFromPath, mediaFolder, schemioExtension } from "./fsUtils.js";
import { walk } from "./walk";
import fs from 'fs-extra';
import path from 'path'
import forEach from 'lodash/forEach';
import archiver from 'archiver';


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
    const absoluteDstFilePath = path.join(config.fs.rootPath, exporterFolder, 'data', 'media', relativeFilePath);

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

function referencesOtherScheme(url) {
    return typeof url === 'string' && url.startsWith('/docs/');
}

function fixSchemeLinks(scheme) {
    traverseItems(scheme.items, item => {
        if (item.shape === 'link' && referencesOtherScheme(item.shapeProps.url)) {
            item.shapeProps.url = '#' + item.shapeProps.url;
        }

        if (item.links) {
            forEach(item.links, link => {
                if (referencesOtherScheme(link.url)) {
                    link.url = '#' + link.url;
                }
            });
        }
    });

    return Promise.resolve(scheme);
}

const assetFiles = [
    {file: 'index-static.html', src: 'index.html'},
    {file: 'schemio.app.static.js'},
    {file: 'main.css'},
    {file: 'schemio-standalone.html'},
    {file: 'schemio-standalone.js'},
    {file: 'schemio-standalone.css'},
    {file: 'css', isDir: true},
    {file: 'images', isDir: true},
    {file: 'art', isDir: true},
    {file: 'webfonts', isDir: true},
];

function copyStaticAssets(config) {
    return () => {
        const exporterPath = path.join(config.fs.rootPath, exporterFolder);
        return fs.ensureDir(path.join(exporterPath, 'assets')).then(() => {
            return Promise.all(assetFiles.map(assetFile => {
                const src = assetFile.src ? path.join(exporterPath, assetFile.src) : path.join(exporterPath, 'assets', assetFile.file);

                if (assetFile.isDir) {
                    return fs.copy(path.join('assets', assetFile.file), src, {recursive: true});
                } else {
                    return fs.copyFile(path.join('assets', assetFile.file), src);
                }
            }));
        });
    };
}

function startExporter(config) {
    const exporterPath = path.join(config.fs.rootPath, exporterFolder, 'data');
    const exporterIndexPath = path.join(exporterPath, 'fs.index.json');

    currentExporter = {
        startedAt: new Date(),
        finishedAt: null,
        entries: [],
        schemeIndex: {}
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

                return fs.readFile(absoluteFilePath)
                .then(JSON.parse)
                .then(fixSchemeLinks)
                .then(scheme => {
                    if (!scheme.id) {
                        const idx = filePath.lastIndexOf('/') + 1;
                        scheme.id = filePath.substring(idx, filePath.length - schemioExtension.length);
                    }
                    const entry = {
                        kind: 'scheme',
                        id: scheme.id,
                        name: scheme.name,
                        path: filePath.substring(0, filePath.length - schemioExtension.length),
                        modifiedTime: scheme.modifiedTime,
                    }
                    return fs.stat(path.join(config.fs.rootPath, mediaFolder, 'previews', `${scheme.id}.svg`))
                    .then(stat => {
                        if (stat.isFile()) {
                            entry.previewURL = `media/previews/${scheme.id}.svg`;
                        }
                        return {entry, scheme};
                    });
                }).then(({entry, scheme}) => {
                    parentDir.entries.push(entry);
                    return fs.writeFile(path.join(exporterPath, filePath), JSON.stringify(scheme)).then(() => scheme);
                })
                .then(scheme => {
                    currentExporter.schemeIndex[scheme.id] = {
                        path: filePath,
                        name: scheme.name,
                        modifiedTime: scheme.modifiedTime
                    };
                    return scheme;
                })
                .then(scheme => exportMediaForScheme(config, scheme, scheme.id))
            }
        });
    })
    .then(copyStaticAssets(config))
    .then(() => {
        return fs.writeFile(exporterIndexPath, JSON.stringify(currentExporter));
    })
    .then(archiveExportedDocs(config))
    .then((archiveVersion) => {
        lastExporter = currentExporter;
        lastExporter.finishedAt = new Date();
        lastExporter.archiveVersion = archiveVersion;
        currentExporter = null;
        console.log('Exporter finished');
    }).catch(err => {
        console.error('Exporter failed', err);
    });
}

function createArchiveName(version) {
    return `schemio-export-${version}.zip`;
}

function archiveExportedDocs(config) {
    return () => {
        return new Promise((resolve, reject) => {
            const version = new Date().getTime();
            const folderPath = path.join(config.fs.rootPath, exporterFolder);
            const archivePath = path.join(config.fs.rootPath, createArchiveName(version));
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            output.on('close', () => {
                resolve(version);
            });

            output.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(folderPath, false);
            archive.finalize();
        });
    }
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

export function fsExportStatus(config) {
    return (req, res) => {
        if (currentExporter) {
            res.json({
                status: 'running',
                startedAt: currentExporter.startedAt
            });
        } else if (lastExporter) {
            res.json({
                status: 'finished',
                startedAt: lastExporter.startedAt,
                finishedAt: lastExporter.finishedAt,
                archiveVersion: lastExporter.archiveVersion
            });
        } else {
            res.json({
                status: 'unknown'
            })
        }
    }
}

export function fsExportDownloadArchive(config) {
    return (req, res) => {
        const version = parseInt(req.params.archiveVersion);
        const archivePath = path.join(config.fs.rootPath, createArchiveName(version));

        fs.stat(archivePath).then(stat => {
            if (!stat.isFile()) {
                throw new Error('Not a file');
            }
            res.download(archivePath);
        })
        .catch(err => {
            res.status(404);
            res.send('Not found');
        })
    };
}