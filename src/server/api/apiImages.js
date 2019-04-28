/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const multer            = require('multer');
const fs                = require('fs').promises;
const config            = require('../config.js');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.images.uploadFolder);
    },
    filename: function (req, file, cb) {
        cb(null, Math.random().toString(36).substring(2) + '-' + file.originalname.replace(/[\W_]+/g, '-'));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: config.images.maxSize
    }
}).single('image');

module.exports = {
    uploadImage(req, res) {
        upload(req, res, err => {
            if (!err) {
                res.json({
                    path: `/images/${req.file.filename}`
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
        res.download(`uploads/${fileName}`, fileName, (err) => {
            if(!res.headersSent) {
                return res.sendStatus(404);
            }
        });
    },

    uploadSchemeThumbnail(req, res) {
        let imageContent = req.body.image;

        // removing header "data:image/png;base64,"
        let index = imageContent.indexOf(',');
        if (index > 0) {
            imageContent = imageContent.substr(index + 1);
        }

        var schemeId = req.params.schemeId;

        let fileName = `uploads/scheme-preview-${schemeId}.png`;
        console.log('Writing to file', fileName);
        fs.writeFile(fileName, new Buffer(imageContent, 'base64')).then(() => {
            res.json({message: 'ok'});
        }).catch(err => res.$apiError(err, 'Could not upload thumbnail'));
    }
};
