/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This script is used as a playground for testing various UI componentes of Schemio


import express  from  'express';

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
    res.sendFile(`${cwd}/html/offline-editor.html`)
});
app.get('/standalone', (req, res) => {
    res.sendFile(`${cwd}/html/standalone-example.html`)
});

app.get('/v1/art', (req, res) => {
    res.json(globalArt);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

