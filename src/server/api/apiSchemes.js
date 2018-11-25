const fs        = require('fs-extra');


module.exports = {
    getScheme(req, res) {
        var schemeId = req.params.schemeId;
        fs.readJson(`mocks/api/schemes/${schemeId}.json`).then(scheme => {
            res.json(scheme);
        });
    }
};
