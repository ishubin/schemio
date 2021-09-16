/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const express               = require('express');
const fs            = require('fs-extra');
const yaml          = require('js-yaml');

const globalArt = [];
// Loading global art from config
fs.readdir('conf/art', function (err, files) {
    files.forEach(function (file) {
        const artContent = yaml.safeLoad(fs.readFileSync(`conf/art/${file}`, 'utf8'));
        globalArt.push(artContent);
    });
});

const app = express();

const port = 4010;

app.use('/assets', express.static('assets'));
app.use('/dist', express.static('dist'));
app.use('/test-data', express.static('test/data'));

app.get('/', (req, res) => {
    res.send('Hello World!')
});

const cwd = process.cwd();

app.get('/offline-scheme-editor', (req, res) => {
    res.sendFile(`${cwd}/src/html/offline-editor.html`)
});
app.get('/scheme-diff-example', (req, res) => {
    res.sendFile(`${cwd}/src/html/scheme-diff-example.html`)
});
app.get('/category-tree', (req, res) => {
    res.sendFile(`${cwd}/src/html/category-tree.html`)
});

app.get('/v1/art', (req, res) => {
    res.json(globalArt);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
