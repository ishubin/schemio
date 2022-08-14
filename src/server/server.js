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
import { createIndex } from './fs/searchIndex.js';


const jsonBodyParser        = bodyParser.json({limit: 1000000, extended: true});

const cwd = process.cwd();
const config = loadConfig();

createIndex(config);

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

app.get('/v1/fs/list',   fsListFilesRoute(config));
app.get('/v1/fs/list/*', fsListFilesRoute(config));
app.get('/v1/fs/docs/:docId', jsonBodyParser, fsGetScheme(config));
app.get('/v1/fs/docs', jsonBodyParser, fsSearchSchemes(config));

if (!config.viewOnlyMode) {
    app.post('/v1/fs/dir', jsonBodyParser, fsCreateDirectory(config));
    app.delete('/v1/fs/dir', jsonBodyParser, fsDeleteDirectory(config));
    app.patch('/v1/fs/dir', jsonBodyParser, fsPatchDirectory(config));

    app.post('/v1/fs/movedir', jsonBodyParser, fsMoveDirectory(config));
    app.post('/v1/fs/movescheme', jsonBodyParser, fsMoveScheme(config));

    app.post('/v1/fs/docs', jsonBodyParser, fsCreateScheme(config));
    app.patch('/v1/fs/docs/:schemeId', jsonBodyParser, fsPatchScheme(config));
    app.delete('/v1/fs/docs/:schemeId', jsonBodyParser, fsDeleteScheme(config));
    app.put('/v1/fs/docs/:schemeId', jsonBodyParser, fsSaveScheme(config));
    app.post('/v1/fs/doc-preview', jsonBodyParser, fsCreateSchemePreview(config));
    app.post('/v1/media', jsonBodyParser, fsUploadMediaFile(config));

    app.post('/v1/fs/art', jsonBodyParser, fsCreateArt(config));
    app.get('/v1/fs/art', jsonBodyParser, fsGetArt(config));

    app.put('/v1/fs/art/:artId', jsonBodyParser, fsSaveDeleteArt(config, modification));
    app.delete('/v1/fs/art/:artId', jsonBodyParser, fsSaveDeleteArt(config, deletion));

    app.post('/v1/fs/styles', jsonBodyParser, fsSaveStyle(config));
    app.delete('/v1/fs/styles/:styleId', jsonBodyParser, fsDeleteStyle(config));
    app.get('/v1/fs/styles', jsonBodyParser, fsGetStyles(config));

    app.post('/v1/static-export/start', jsonBodyParser, fsExportStatic(config));
    app.get('/v1/static-export/status', jsonBodyParser, fsExportStatus(config));
    app.get('/v1/static-export/download/:archiveVersion', fsExportDownloadArchive(config));
}

app.get('/media/*', fsDownloadMediaFile(config));


app.get('*', (req, res) => {
    res.sendFile(`${cwd}/html/index.html`)
});


app.listen(config.serverPort, () => {
    console.log(`Example app listening at http://localhost:${config.serverPort}`)
});
