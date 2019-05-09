/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const MongoClient       = require('mongodb').MongoClient;
const config            = require('../../config.js');

let db = null;

module.exports = {
    connectDb() {
        console.log('Connecting to MongoDb', config.mongodb.url);
        return MongoClient.connect(config.mongodb.url, {
            poolSize: config.mongodb.poolSize
        }).then(client => {
            console.log('Connected to MongoDb');
            db = client.db(config.mongodb.dbName);
        });
    },
    getDb() {
        return db;
    }
};
