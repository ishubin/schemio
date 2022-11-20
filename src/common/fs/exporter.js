import fs from 'fs-extra';
import path from 'path'
import forEach from 'lodash/forEach';
import os from 'os';
import { walk } from './walk';
import shortid from 'shortid';
import { mediaFolder, schemioExtension } from './fsUtils';

function traverseItems(items, callback) {
    forEach(items, item => {
        callback(item);
        if (item.childItems) {
            traverseItems(item.childItems, callback);
        }
    })
}
const fsMediaPrefix = '/media/';
const electronMediaPrefix = 'media://local/';

function doesReferenceMedia(prop) {
    return typeof prop === 'string' && (prop.startsWith(fsMediaPrefix) || prop.startsWith(electronMediaPrefix));
}

function exportMediaFile(rootPath, exporterPath, mediaURL) {
    let relativeFilePath = null;

    if (mediaURL.startsWith(fsMediaPrefix)) {
        relativeFilePath = mediaURL.substring(fsMediaPrefix.length);
    } else if (mediaURL.startsWith(electronMediaPrefix)) {
        relativeFilePath = mediaURL.substring(electronMediaPrefix.length);
        return Promise.resolve(null);
    }

    const absoluteFilePath = path.join(rootPath, '.media', relativeFilePath);
    const absoluteDstFilePath = path.join(exporterPath, 'media', relativeFilePath);

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
    }).then(() => {
        return '.' + mediaURL;
    });
}

function exportMediaForScheme(rootPath, exporterPath, scheme, schemeId) {
    let chain = Promise.resolve(null);

    const mediaFailCatcher = err => {
        console.error('Failed to export media', err);
    };

    traverseItems(scheme.items, item => {
        if (item.shapeProps) {
            if (item.shape === 'image' && doesReferenceMedia(item.shapeProps.image)) {
                chain = chain.then(() => exportMediaFile(rootPath, exporterPath, item.shapeProps.image))
                .catch(mediaFailCatcher);
            } else if (item.shapeProps.fill && typeof item.shapeProps.fill === 'object' && doesReferenceMedia(item.shapeProps.fill.image)) {
                chain = chain.then(() => exportMediaFile(rootPath, exporterPath, item.shapeProps.fill.image))
                .catch(mediaFailCatcher);
            }
        }
        if (item.behavior && item.behavior.events) {
            forEach(item.behavior.events, behaviorEvent => {
                forEach(behaviorEvent.actions, action => {
                    forEach(action.args, (arg, argName) => {
                        if (argName === 'fill' && typeof arg === 'object' && doesReferenceMedia(arg.image)) {
                            chain = chain.then(() => exportMediaFile(rootPath, exporterPath, arg.image))
                            .catch(mediaFailCatcher);
                        }
                    });
                });
            });
        }
    });

    return chain.then(() => {
        const fileName =  `${schemeId}.svg`;
        const src = path.join(rootPath, '.media', 'previews', fileName);
        const dstPreviewDir = path.join(exporterPath, 'media', 'previews');
        const dst = path.join(dstPreviewDir, fileName);

        return fs.ensureDir(dstPreviewDir)
        .then(() => {
            return fs.copyFile(src, dst);
        })
        .catch(err => {
            console.error('Could not cope scheme preview', err);
        })
        .then(() => {
            return scheme;
        });
    });
}

function referencesOtherScheme(url) {
    return typeof url === 'string' && url.startsWith('/docs/');
}

/**
 * Fixes scheme links and image urls
 * @param {*} scheme
 * @returns
 */
function fixSchemeURLs(scheme) {
    const fixURLs = (props) => {
        forEach(props, (prop, propName) => {
            if (propName === 'image' && typeof prop === 'string' && prop.startsWith('/')) {
                props[propName] = '.' + props[propName];
            } else if (typeof prop === 'object') {
                fixURLs(prop);
            }
        });
    };

    traverseItems(scheme.items, item => {
        if (item.shape === 'link' && referencesOtherScheme(item.shapeProps.url)) {
            item.shapeProps.url = '#' + item.shapeProps.url;
        }

        if (item.links) {
            forEach(item.links, link => {
                //TODO convert electron based document links (project://diagram/...)
                if (referencesOtherScheme(link.url)) {
                    link.url = '#' + link.url;
                }
            });
        }
        fixURLs(item.shapeProps);

        if (item.behavior && item.behavior.events) {
            forEach(item.behavior.events, behaviorEvent => {
                if (behaviorEvent.actions) {
                    forEach(behaviorEvent.actions, action => {
                        fixURLs(action.args);
                    });
                }
            });
        }
    });

    return Promise.resolve(scheme);
}

const assetFiles = [
    {file: 'index-static.html', src: 'index.html'},
    {file: 'schemio.app.static.js'},
    {file: 'schemio-standalone.html'},
    {file: 'schemio-standalone.js'},
    {file: 'schemio-standalone.css'},
    {file: 'css', isDir: true},
    {file: 'js', isDir: true},
    {file: 'images', isDir: true},
    {file: 'art', isDir: true},
    {file: 'custom-fonts', isDir: true},
    {file: 'shapes', isDir: true},
    {file: 'webfonts', isDir: true},
];

function copyStaticAssets(exporterPath) {
    return () => {
        return fs.ensureDir(path.join(exporterPath, 'assets')).then(() => {
            return Promise.all(assetFiles.map(assetFile => {
                const dst = assetFile.src ? path.join(exporterPath, assetFile.src) : path.join(exporterPath, 'assets', assetFile.file);

                if (assetFile.isDir) {
                    return fs.copy(path.join('assets', assetFile.file), dst, {recursive: true});
                } else {
                    return fs.copyFile(path.join('assets', assetFile.file), dst);
                }
            }));
        });
    };
}

export function startStaticExporter(rootPath) {
    const exporterPath = path.join(os.tmpdir(), `schemio-exporter/exporter-${shortid.generate()}`);
    const exporterDataPath = path.join(exporterPath, 'data');
    const exporterIndexPath = path.join(exporterDataPath, 'fs.index.json');

    console.log(`Started static exporter for: ${rootPath}. Export location: ${exporterPath}`);

    const currentExporter = {
        startedAt: new Date(),
        finishedAt: null,
        entries: [],
        schemeIndex: {}
    };
    const relativePath = filePath => path.relative(rootPath, filePath);

    const directoryLookup = new Map();

    return fs.ensureDir(exporterDataPath).then(() => {
        return walk(rootPath, (absoluteFilePath, isDirectory, absoluteParentPath) => {
            const filePath = relativePath(absoluteFilePath);
            const parentPath = relativePath(absoluteParentPath);

            let parentDir = currentExporter;

            if (directoryLookup.has(parentPath)) {
                parentDir = directoryLookup.get(parentPath);
            }

            if (isDirectory) {
                const newDir = {
                    kind: 'dir',
                    name: path.basename(filePath),
                    path: filePath,
                    entries: []
                };
                directoryLookup.set(filePath, newDir);
                parentDir.entries.push(newDir);

                return fs.ensureDir(path.join(exporterDataPath, filePath));

            } else if (filePath.endsWith(schemioExtension)) {
                return fs.readFile(absoluteFilePath)
                .then(JSON.parse)
                .then(scheme => exportMediaForScheme(rootPath, exporterPath, scheme, scheme.id))
                .then(fixSchemeURLs)
                .then(scheme => {
                    if (!scheme.id) {
                        const idx = filePath.lastIndexOf('/') + 1;
                        scheme.id = filePath.substring(idx, filePath.length - schemioExtension.length);
                    }
                    const entry = {
                        kind: 'schemio:doc',
                        id: scheme.id,
                        name: scheme.name,
                        path: filePath.substring(0, filePath.length - schemioExtension.length),
                        modifiedTime: scheme.modifiedTime,
                    }
                    return fs.stat(path.join(rootPath, mediaFolder, 'previews', `${scheme.id}.svg`))
                    .then(stat => {
                        if (stat.isFile()) {
                            entry.previewURL = `media/previews/${scheme.id}.svg`;
                        }
                        return {entry, scheme};
                    });
                }).then(({entry, scheme}) => {
                    parentDir.entries.push(entry);
                    return fs.writeFile(path.join(exporterDataPath, filePath), JSON.stringify(scheme)).then(() => scheme);
                })
                .then(scheme => {
                    currentExporter.schemeIndex[scheme.id] = {
                        path: filePath,
                        name: scheme.name,
                        modifiedTime: scheme.modifiedTime
                    };
                    return scheme;
                })
            }
        });
    })
    .then(copyStaticAssets(exporterPath))
    .then(() => {
        currentExporter.finishedAt = new Date();
        return fs.writeFile(exporterIndexPath, JSON.stringify(currentExporter));
    })
    .then(() => {
        return exporterPath;
    });
}