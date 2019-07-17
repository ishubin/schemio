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
}).single('image');



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
    uploadImage(req, res) {
        uploadToLocalFolder(req, res, err => {
            if (!err) {
                const imageOriginalLocalPath = `${config.images.uploadFolder}/${req.file.filename}`;

                imageStorage.uploadImageFromFile(imageOriginalLocalPath, req.file.filename, req.file.mimetype).then(imageData => {
                    if (imageData.imageId !== req.file.filename) {
                        return fsp.rename(imageOriginalLocalPath, `${config.images.uploadFolder}/${imageData.imageId}`)
                            .then(() => imageData);
                    }
                    return imageData;
                }).then(imageData => {
                    res.json({
                        path: `/images/${imageData.imageId}`
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

    getImage(req, res) {
        const fileName = req.params.fileName;
        const localImagePath = `${config.images.uploadFolder}/${fileName}`;

        //TODO refresh images within specified interval

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
