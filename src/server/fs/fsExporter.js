/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import path from 'path'
import archiver from 'archiver';
import { startStaticExporter } from '../../common/fs/exporter';

let currentExporter = null;
let lastExporter = null;

export function fsExportStatic(config) {
    return (req, res) => {
        if (currentExporter !== null) {
            res.status(400);
            res.json({
                status: 'failed',
                message: 'previous exporter is still running'
            });
        }

        const version = new Date().getTime();
        const startedAt = new Date();

        currentExporter = {
            status: 'running',
            startedAt,
            finishedAt: null,
            version
        };

        startStaticExporter(config.fs.rootPath)
        .then(archiveExportedFolder)
        .then(archivePath => {
            lastExporter = {
                status: 'running',
                startedAt,
                finishedAt: new Date(),
                version,
                archivePath
            };
            if (currentExporter && currentExporter.version === version) {
                currentExporter = null;
            }
        });

        res.json({
            status: 'ok',
            message: 'Started exporter',
        });
    };
}

function archiveExportedFolder(exporterPath) {
    return new Promise((resolve, reject) => {
        const folderPath = path.join(exporterPath);

        const baseName = path.basename(exporterPath);
        const parentPath = path.dirname(exporterPath);
        const archivePath = path.join(parentPath, `${baseName}.zip`);

        const output = fs.createWriteStream(archivePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            resolve(archivePath);
        });

        output.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.finalize();
    });
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
                version: lastExporter.version
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
        const version = parseInt(req.params.version);

        if (lastExporter && lastExporter.version === version) {
            const archivePath = lastExporter.archivePath;

            fs.stat(archivePath).then(stat => {
                if (!stat.isFile()) {
                    throw new Error('Not a file');
                }
                res.download(archivePath);
            })
            .catch(err => {
                res.status(404);
                res.send('Not found');
            });
        } else {
            res.status(404);
            res.send('Not found');
        }
    };
}

