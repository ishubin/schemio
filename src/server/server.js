/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const express               = require('express');

const app = express();

const port = 4010;

app.use('/assets', express.static('assets'));
app.use('/dist', express.static('dist'));

app.get('/', (req, res) => {
    res.send('Hello World!')
});

const cwd = process.cwd();

app.get('/offline-scheme-editor', (req, res) => {
    res.sendFile(`${cwd}/src/html/offline-editor.html`)
});
app.get('/category-tree', (req, res) => {
    res.sendFile(`${cwd}/src/html/category-tree.html`)
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
