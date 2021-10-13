/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import express  from  'express';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import bodyParser  from 'body-parser';
import { fsCreateDirectory, fsCreateScheme, fsCreateSchemePreview, fsDeleteDirectory, fsDeleteScheme, fsDownloadMediaFile, fsDownloadSchemePreview, fsGetScheme, fsListFilesRoute, fsPatchDirectory, fsSaveScheme, fsUploadMediaFile } from './fs/fs.js';
import { loadConfig } from './config.js';
import { apiMiddleware } from './middleware.js';
import fileUpload from 'express-fileupload';


const jsonBodyParser        = bodyParser.json({limit: 1000000, extended: true});

const cwd = process.cwd();
const config = loadConfig();

const globalArt = [];
// Loading global art from config
fs.readdir('conf/art', function (err, files) {
    files.forEach(function (file) {
        const artContent = yaml.safeLoad(fs.readFileSync(`conf/art/${file}`, 'utf8'));
        globalArt.push(artContent);
    });
});

const app = express();

app.use(fileUpload({
    limits: {
        fileSize: config.fileUploadMaxSize,
        safeFileNames: true
    },
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/assets', express.static('assets'));
app.use('/v1', apiMiddleware);

app.get('/v1/fs/list', fsListFilesRoute(config));

app.post('/v1/fs/dir', jsonBodyParser, fsCreateDirectory(config));
app.delete('/v1/fs/dir', jsonBodyParser, fsDeleteDirectory(config));
app.patch('/v1/fs/dir', jsonBodyParser, fsPatchDirectory(config));

app.post('/v1/fs/scheme', jsonBodyParser, fsCreateScheme(config));
app.delete('/v1/fs/scheme', jsonBodyParser, fsDeleteScheme(config));
app.get('/v1/fs/scheme', jsonBodyParser, fsGetScheme(config));
app.put('/v1/fs/scheme', jsonBodyParser, fsSaveScheme(config));
app.post('/v1/fs/scheme-preview', jsonBodyParser, fsCreateSchemePreview(config));
app.post('/v1/media', jsonBodyParser, fsUploadMediaFile(config));

app.get('/media/:objectId', fsDownloadMediaFile(config));
app.get('/media/scheme-preview/:schemeId', jsonBodyParser, fsDownloadSchemePreview(config));

app.get('/v1/art', (req, res) => {
    res.json(globalArt);
});

app.get('*', (req, res) => {
    res.sendFile(`${cwd}/dist/assets/index.html`)
});


app.listen(config.serverPort, () => {
    console.log(`Example app listening at http://localhost:${config.serverPort}`)
});
