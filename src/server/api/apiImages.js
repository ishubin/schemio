const fs                = require('fs-extra');
const multer            = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Math.random().toString(36).substring(2) + '-' + file.originalname);
    }
});
const upload            = multer({storage}).single('image');

module.exports = {
    uploadImage(req, res) {
        upload(req, res, err => {
            if (!err) {
                res.json({
                    path: `/api/images/${req.file.filename}`
                });
            } else {
                res.status(500);
                res.json({error: 'Could not upload file'});
            }
        });
    },
    getImage(req, res) {
        var fileName = req.params.fileName;
        res.download(`uploads/${fileName}`, fileName, (err) => {
            res.status(404);
        })
    }
};
