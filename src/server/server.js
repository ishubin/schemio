/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import express  from  'express';
import bodyParser  from 'body-parser';

import {
    fsCreateArt, fsCreateDirectory, fsCreateScheme,
    fsCreateSchemePreview, fsDeleteDirectory, fsDeleteScheme,
    fsDeleteStyle,
    fsDownloadMediaFile, fsGetArt,
    fsGetScheme, fsGetStyles, fsListFilesRoute,
    fsMoveDirectory, fsMoveScheme, fsPatchDirectory,
    fsPatchScheme, fsSaveDeleteArt, fsSaveScheme,
    fsSaveStyle, fsSearchSchemes, fsUploadMediaFile
} from './fs/fs.js';

import {fsExportDownloadArchive, fsExportStatic, fsExportStatus} from './fs/fsExporter';

import { loadConfig } from './config.js';
import { apiMiddleware } from './middleware.js';
import fileUpload from 'express-fileupload';
import { FileIndex } from './backend/fs/fileIndex.js';


const jsonBodyParser        = bodyParser.json({limit: 1000000, extended: true});

const cwd = process.cwd();
const config = loadConfig();

const fileIndex = new FileIndex();
fileIndex.reindex(config.fs.rootPath).then(() => {
    const app = express();
    const modification = false;
    const deletion = true;

    app.use(fileUpload({
        limits: {
            fileSize: config.fileUploadMaxSize,
            safeFileNames: true
        },
    }));

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use('/assets', express.static('assets'));
    app.use('/v1', apiMiddleware);

    app.get('/v1/fs/list',   fsListFilesRoute(config, fileIndex));
    app.get('/v1/fs/list/*', fsListFilesRoute(config, fileIndex));
    app.get('/v1/fs/docs/:docId', jsonBodyParser, fsGetScheme(config, fileIndex));
    app.get('/v1/fs/docs', jsonBodyParser, fsSearchSchemes(config, fileIndex));

    if (!config.viewOnlyMode) {
        app.post('/v1/fs/dir', jsonBodyParser, fsCreateDirectory(config, fileIndex));
        app.delete('/v1/fs/dir', jsonBodyParser, fsDeleteDirectory(config, fileIndex));
        app.patch('/v1/fs/dir', jsonBodyParser, fsPatchDirectory(config, fileIndex));

        app.post('/v1/fs/movedir', jsonBodyParser, fsMoveDirectory(config, fileIndex));
        app.post('/v1/fs/movescheme', jsonBodyParser, fsMoveScheme(config, fileIndex));

        app.post('/v1/fs/docs', jsonBodyParser, fsCreateScheme(config, fileIndex));
        app.patch('/v1/fs/docs/:schemeId', jsonBodyParser, fsPatchScheme(config, fileIndex));
        app.delete('/v1/fs/docs/:schemeId', jsonBodyParser, fsDeleteScheme(config, fileIndex));
        app.put('/v1/fs/docs/:schemeId', jsonBodyParser, fsSaveScheme(config, fileIndex));
        app.post('/v1/fs/doc-preview', jsonBodyParser, fsCreateSchemePreview(config, fileIndex));
        app.post('/v1/media', jsonBodyParser, fsUploadMediaFile(config, fileIndex));

        app.post('/v1/fs/art', jsonBodyParser, fsCreateArt(config, fileIndex));
        app.get('/v1/fs/art', jsonBodyParser, fsGetArt(config, fileIndex));

        app.put('/v1/fs/art/:artId', jsonBodyParser, fsSaveDeleteArt(config, modification, fileIndex));
        app.delete('/v1/fs/art/:artId', jsonBodyParser, fsSaveDeleteArt(config, deletion, fileIndex));

        app.post('/v1/fs/styles', jsonBodyParser, fsSaveStyle(config, fileIndex));
        app.delete('/v1/fs/styles/:styleId', jsonBodyParser, fsDeleteStyle(config, fileIndex));
        app.get('/v1/fs/styles', jsonBodyParser, fsGetStyles(config, fileIndex));

        app.post('/v1/static-export/start', jsonBodyParser, fsExportStatic(config, fileIndex));
        app.get('/v1/static-export/status', jsonBodyParser, fsExportStatus(config, fileIndex));
        app.get('/v1/static-export/download/:archiveVersion', fsExportDownloadArchive(config, fileIndex));
    }

    app.get('/media/*', fsDownloadMediaFile(config, fileIndex));


    app.get('*', (req, res) => {
        res.sendFile(`${cwd}/html/index.html`)
    });

    app.listen(config.serverPort, () => {
        console.log(`Listening at http://localhost:${config.serverPort}`)
    });

}).catch(err => {
    console.error('Failed to create index for all documents', err);
});

