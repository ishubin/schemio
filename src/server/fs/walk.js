/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from 'fs-extra';
import path from 'path';

/**
 * 
 * @callback walkCallback
 * @param {String} filePath -  path to file or directory
 * @param {Boolean} isDirectory - specifies whether it is a directory
 * @param {String} parentPath - path to parent folder
 * @returns {Promise}
 */


/**
 * 
 * @param {String} dirPath 
 * @param {walkCallback} callback - function that takes fileName and isDirectory arguments
 * @returns 
 */
export function walk(dirPath, callback) {
    return fs.readdir(dirPath).then(files => {
        let chain = Promise.resolve(null);

        files.forEach(fileName => {
            const filePath = path.join(dirPath, fileName);
            chain = chain.then(() => {
                return fs.stat(filePath);
            })
            .then(stat => {
                if (fileName.charAt(0) === '.') {
                    return;
                }

                const callbackPromise = callback(filePath, stat.isDirectory(), dirPath);

                if (stat.isDirectory()) {
                    const subWalkPromise = walk(filePath, callback);
                    if (callbackPromise) {
                        return callbackPromise.then(() => subWalkPromise);
                    } else {
                        return subWalkPromise;
                    }
                }
                return callbackPromise;
            })
            .catch(err => {
                console.error('Failed to stat file: ' + filePath, err);
            });
        });
        return chain;
    })
    .catch(err => {
        console.error('Failed to walk dir: ', dirPath, err);
    });
}