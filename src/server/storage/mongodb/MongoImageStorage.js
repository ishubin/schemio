/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const mongodb           = require('mongodb');
const mongo             = require('./Mongo.js');
const fs                = require('fs');

 class MongoImageStorage {
    constructor() {
        this._imageBucket = null;
    }

    imageBucket() {
        if (!this._imageBucket) {
            this._imageBucket = new mongodb.GridFSBucket(mongo.db(), {
                // chunkSizeBytes: 256 * 1024,
                bucketName: 'images'
            });
        }
        return this._imageBucket;
    }

    // Returns generated image path
    uploadImageFromFile(filePath, fileName, mimeType) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
            .pipe(this.imageBucket().openUploadStream(fileName, {
                contentType: mimeType,
                metadata: {checksum: 0}
            }))
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
        return new Promise((resolve, reject) => {
            mongo.db().collection('images.files').find({filename: imageId}).count().then(count => {
                if (count > 0) {
                    this.imageBucket().openDownloadStreamByName(imageId)
                    .pipe(fs.createWriteStream(filePath))
                    .on('error', function(error) {
                        reject(error);
                    })
                    .on('finish', function() {
                        resolve();
                    });
                } else {
                    reject('Image not found');
                }
            });
        });
    }
}

module.exports = MongoImageStorage;
