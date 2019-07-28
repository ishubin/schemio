/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const multer            = require('multer');
const fs                = require('fs');
const fsp               = fs.promises;
const config            = require('../config.js');
const imageStorage      = require('../storage/storageProvider.js').provideImageStorage();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.images.uploadFolder);
    },
    filename: function (req, file, cb) {
        cb(null, Math.random().toString(36).substring(2) + '-' + file.originalname.replace(/[^a-zA-Z0-9\.]+/g, '-'));
    }
});

const uploadToLocalFolder = multer({
    storage,
    limits: {
        fileSize: config.images.maxSize
    }
}).single('file');



function handleLocalImageDownload(res, imagePath, fileName) {
    res.download(imagePath, fileName, (err) => {
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
                const imageOriginalLocalPath = `${config.images.uploadFolder}/${req.file.filename}`;

                fsp.mkdir(`${config.images.uploadFolder}/${projectId}`, {recursive: true}).then(() => {
                    return imageStorage.uploadImageFromFile(imageOriginalLocalPath, req.file.filename, req.file.mimetype);
                }).then(imageData => {
                    return fsp.rename(imageOriginalLocalPath, `${config.images.uploadFolder}/${projectId}/${imageData.imageId}`).then(() => imageData);
                }).then(imageData => {
                    res.json({
                        path: `/projects/${projectId}/files/${imageData.imageId}`
                    });
                }).catch(err => {
                    res.status(500);
                    console.error(err, 'Could not upload to image storage');
                    res.json({error: 'Could not upload image'});
                });
            } else {
                res.status(500);
                console.error(err);
                res.json({error: 'Could not upload file'});
            }
        });
    },

    downloadFile(req, res) {
        const projectId = req.params.projectId;
        const fileName = req.params.fileName;
        fsp.mkdir(`${config.images.uploadFolder}/${projectId}`, {recursive: true}).then(() => {
            const localImagePath = `${config.images.uploadFolder}/${projectId}/${fileName}`;

            //TODO use checksum to check if the image is stale and needs to be re-downloaded from gridfs

            if (fs.existsSync(localImagePath) && fileSizeSync(localImagePath) > 0) {
                handleLocalImageDownload(res, localImagePath, fileName);
            } else {
                //download the image from mongodb
                imageStorage.downloadImage(fileName, localImagePath).then(() => {
                    handleLocalImageDownload(res, localImagePath, fileName);
                }).catch(err => {
                    if (fileName.startsWith('scheme-preview-')) {
                        handleLocalImageDownload(res, 'public/images/missing-scheme-preview.png', fileName);
                    } else {
                        console.error(err);
                        res.sendStatus(404);
                    }
                });
            }
        }).catch(err => {
            console.error('Not able to mkdir', err);
            res.sendStatus(500);
        });
    },

    uploadSchemeThumbnail(req, res) {
        let imageContent = req.body.svg;

        const schemeId = req.params.schemeId;

        const fileName = `scheme-preview-${schemeId}.svg`;
        const filePath = `${config.images.uploadFolder}/${fileName}`;

        console.log('Writing to file', fileName);
        fsp.writeFile(filePath, imageContent).then(() => {
            imageStorage.uploadImageFromFile(filePath, fileName).then(imageData => {
                res.json({message: 'ok'});
            }).catch(err => {
                res.$apiError(err, 'Could not upload thumbnail');
            });
        }).catch(err => res.$apiError(err, 'Could not upload thumbnail'));
    }
};
