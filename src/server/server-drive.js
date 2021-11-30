/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import express  from  'express';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import bodyParser  from 'body-parser';

import { loadConfig } from './config.js';

const cwd = process.cwd();
const config = loadConfig();

const globalArt = [];
// Loading global art from config
fs.readdir('conf/art', function (err, files) {
    files.forEach(function (file) {
        const artContent = yaml.load(fs.readFileSync(`conf/art/${file}`, 'utf8'));
        globalArt.push(artContent);
    });
});


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/assets', express.static('assets'));

app.get('/v1/art', (req, res) => {
    res.json(globalArt);
});

app.get('*', (req, res) => {
    res.sendFile(`${cwd}/html/index-drive.html`)
});


app.listen(config.serverPort, () => {
    console.log(`Example app listening at http://localhost:${config.serverPort}`)
});

