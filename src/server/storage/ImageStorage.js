/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

class ImageStorage {

    // Returns generated image data with its id
    uploadImageFromFile(filePath, fileName) {
        return Promise.resolve(null);
    }

    // Downloads image into specified path
    downloadImage(imageId, filePath) {
        return Promise.resolve(null);
    }

}

module.exports = ImageStorage;
