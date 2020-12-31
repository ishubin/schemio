/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const multer            = require('multer');
const fs                = require('fs');
const fsp               = fs.promises;
const config            = require('../config.js');
const logger            = require('../logger.js');
const fileStorage      = require('../storage/storageProvider.js').provideFileStorage();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.files.uploadFolder);
    },
    filename: function (req, file, cb) {
        cb(null, Math.random().toString(36).substring(2) + '-' + file.originalname.replace(/[^a-zA-Z0-9\.]+/g, '-'));
    }
});

const uploadToLocalFolder = multer({
    storage,
    limits: {
        fileSize: config.files.maxSize
    }
}).single('file');



function handleLocalFileDownload(res, filePath, fileName) {
    res.download(filePath, fileName, (err) => {
        if(!res.headersSent) {
            return res.sendStatus(404);
        }
    });
}

function fileSizeSync(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return stat.size;
    } catch(e) {
        return 0;
    }
}

module.exports = {
    uploadFile(req, res) {
        const projectId = req.params.projectId;
        uploadToLocalFolder(req, res, err => {
            if (!err) {
                const originalLocalPath = `${config.files.uploadFolder}/${req.file.filename}`;

                fsp.mkdir(`${config.files.uploadFolder}/${projectId}`, {recursive: true}).then(() => {
                    return fileStorage.uploadFromFile(projectId, originalLocalPath, req.file.filename, req.file.mimetype);
                }).then(fileData => {
                    return fsp.rename(originalLocalPath, `${config.files.uploadFolder}/${projectId}/${fileData.imageId}`).then(() => fileData);
                }).then(fileData => {
                    res.json({
                        url: `/projects/${projectId}/files/${fileData.imageId}`
                    });
                }).catch(err => {
                    res.status(500);
                    logger.error('Could not upload to image storage', err);
                    res.json({error: 'Could not upload image'});
                });
            } else {
                res.status(500);
                logger.error('Could not upload file', err);
                res.json({error: 'Could not upload file'});
            }
        });
    },

    downloadFile(req, res) {
        const projectId = req.params.projectId;
        const fileName = req.params.fileName;
        fsp.mkdir(`${config.files.uploadFolder}/${projectId}`, {recursive: true}).then(() => {
            const localFilePath = `${config.files.uploadFolder}/${projectId}/${fileName}`;

            if (fs.existsSync(localFilePath) && fileSizeSync(localFilePath) > 0) {
                handleLocalFileDownload(res, localFilePath, fileName);
            } else {
                //download the file from mongodb
                fileStorage.downloadFile(fileName, localFilePath).then(() => {
                    handleLocalFileDownload(res, localFilePath, fileName);
                }).catch(err => {
                    logger.error('Could not download file', err);
                    res.sendStatus(404);
                });
            }
        }).catch(err => {
            logger.error('Not able to mkdir', err);
            res.sendStatus(500);
        });
    }
};
