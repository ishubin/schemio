const fs                = require('fs-extra');


module.exports = {
    uploadImage(req, res) {
        res.json({
            path: `/api/images/${req.file.filename}`
        });
    },
    getImage(req, res) {
        var fileName = req.params.fileName;
        res.download(`uploads/${fileName}`, fileName, (err) => {
            res.status(404);
        })
    }
};
