/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import express  from  'express';
import bodyParser  from 'body-parser';

import { loadConfig } from './config.js';

const cwd = process.cwd();
const config = loadConfig();


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use('/assets', express.static('assets'));

app.get('*', (req, res) => {
    res.sendFile(`${cwd}/html/index-drive.html`)
});


app.listen(config.serverPort, () => {
    console.log(`Example app listening at http://localhost:${config.serverPort}`)
});

