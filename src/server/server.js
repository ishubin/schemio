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
    fsGetScheme, fsGetSchemeInfo, fsGetStyles, fsGetTemplates, fsListFilesRoute,
    fsMoveDirectory, fsMoveScheme, fsPatchDirectory,
    fsPatchScheme, fsSaveDeleteArt, fsSaveScheme,
    fsSaveStyle, fsSearchSchemes, fsUploadMediaFile
} from './fs/fs.js';

import {fsExportDownloadArchive, fsExportStatic, fsExportStatus} from './fs/fsExporter';

import { loadConfig } from './config.js';
import { apiMiddleware } from './middleware.js';
import fileUpload from 'express-fileupload';
import { ProjectService } from '../common/fs/projectService.js';
const { readFile } = require('node:fs/promises');
import Handlebars from 'handlebars';


const jsonBodyParser        = bodyParser.json({limit: 1000000, extended: true});

const cwd = process.cwd();
const config = loadConfig();


if (config.routePrefix && !config.routePrefix.startsWith('/')) {
    throw new Error(`"${config.routePrefix}" is invalid value for ROUTE_PREFIX config parameter. It should begin with "/" symbol.`);
}

const projectService = new ProjectService(config.fs.rootPath, false, {
    'media://local/': '/media/',
    '../assets/': '/assets/'
});

projectService.load()
.then(() => {
    return readFile(`${cwd}/html/index-server.tpl.html`, { encoding: 'utf8' })
})
.then((templateFile) => {
    const indexTemplate = Handlebars.compile(templateFile);

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
    app.use(`${config.routePrefix}/assets`, express.static('assets'));
    app.use(`${config.routePrefix}/v1`, apiMiddleware);

    app.get(`${config.routePrefix}/v1/fs/list`,   fsListFilesRoute(config, projectService));
    app.get(`${config.routePrefix}/v1/fs/list/*`, fsListFilesRoute(config, projectService));
    app.get(`${config.routePrefix}/v1/fs/docs/:docId`, jsonBodyParser, fsGetScheme(config, projectService));
    app.get(`${config.routePrefix}/v1/fs/docs/:docId/info`, jsonBodyParser, fsGetSchemeInfo(config, projectService));
    app.get(`${config.routePrefix}/v1/fs/docs`, jsonBodyParser, fsSearchSchemes(config, projectService));

    if (!config.viewOnlyMode) {
        app.post(`${config.routePrefix}/v1/fs/dir`, jsonBodyParser, fsCreateDirectory(config, projectService));
        app.delete(`${config.routePrefix}/v1/fs/dir`, jsonBodyParser, fsDeleteDirectory(config, projectService));
        app.patch(`${config.routePrefix}/v1/fs/dir`, jsonBodyParser, fsPatchDirectory(config, projectService));

        app.post(`${config.routePrefix}/v1/fs/movedir`, jsonBodyParser, fsMoveDirectory(config, projectService));
        app.post(`${config.routePrefix}/v1/fs/movescheme`, jsonBodyParser, fsMoveScheme(config, projectService));

        app.post(`${config.routePrefix}/v1/fs/docs`, jsonBodyParser, fsCreateScheme(config, projectService));
        app.patch(`${config.routePrefix}/v1/fs/docs/:schemeId`, jsonBodyParser, fsPatchScheme(config, projectService));
        app.delete(`${config.routePrefix}/v1/fs/docs/:schemeId`, jsonBodyParser, fsDeleteScheme(config, projectService));
        app.put(`${config.routePrefix}/v1/fs/docs/:schemeId`, jsonBodyParser, fsSaveScheme(config, projectService));
        app.post(`${config.routePrefix}/v1/fs/doc-preview`, jsonBodyParser, fsCreateSchemePreview(config, projectService));
        app.post(`${config.routePrefix}/v1/media`, jsonBodyParser, fsUploadMediaFile(config));

        app.post(`${config.routePrefix}/v1/fs/art`, jsonBodyParser, fsCreateArt(config));
        app.get(`${config.routePrefix}/v1/fs/art`, jsonBodyParser, fsGetArt(config));

        app.put(`${config.routePrefix}/v1/fs/art/:artId`, jsonBodyParser, fsSaveDeleteArt(config, modification));
        app.delete(`${config.routePrefix}/v1/fs/art/:artId`, jsonBodyParser, fsSaveDeleteArt(config, deletion));

        app.post(`${config.routePrefix}/v1/fs/styles`, jsonBodyParser, fsSaveStyle(config));
        app.delete(`${config.routePrefix}/v1/fs/styles/:styleId`, jsonBodyParser, fsDeleteStyle(config));
        app.get(`${config.routePrefix}/v1/fs/styles`, jsonBodyParser, fsGetStyles(config));

        app.post(`${config.routePrefix}/v1/static-export/start`, jsonBodyParser, fsExportStatic(config));
        app.get(`${config.routePrefix}/v1/static-export/status`, jsonBodyParser, fsExportStatus(config));
        app.get(`${config.routePrefix}/v1/static-export/download/:version`, fsExportDownloadArchive(config));
    }

    app.get(`${config.routePrefix}/media/*`, fsDownloadMediaFile(config));

    app.get('*', (req, res) => {
        res.send(indexTemplate({routePrefix: config.routePrefix}));
    });

    app.listen(config.serverPort, () => {
        console.log(`Listening at http://localhost:${config.serverPort}`)
    });

}).catch(err => {
    console.error('Failed to create index for all documents', err);
});

