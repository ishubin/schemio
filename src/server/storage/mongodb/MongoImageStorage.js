/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const ImageStorage      = require('../ImageStorage.js');
const mongodb           = require('mongodb');
const MongoClient       = mongodb.MongoClient;
const shortid           = require('shortid');
const _                 = require('lodash');
const config            = require('../../config.js');
const fs                = require('fs');

 class MongoImageStorage extends ImageStorage {
    constructor() {
        super();
        this.db = null;
        this.imageBucket = null;
        MongoClient.connect(config.mongodb.url, {
            poolSize: config.mongodb.poolSize
        }).then(client => {
            this.db = client.db(config.mongodb.dbName);

            this.imageBucket = new mongodb.GridFSBucket(this.db, {
                // chunkSizeBytes: 256 * 1024,
                bucketName: 'images'
            });
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }

    // Returns generated image path
    uploadImage(filePath, fileName) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
            .pipe(this.imageBucket.openUploadStream(fileName))
            .on('error', function(error) {
                reject(error);
            }).on('finish', function() {
                resolve({
                    imageId: fileName
                });
            });
        });
    }

    // Downloads image into specified path
    downloadImage(imageId, filePath) {
        return Promise.resolve(null);
    }

}

module.exports = MongoImageStorage;
