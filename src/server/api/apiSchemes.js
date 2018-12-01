const schemeStorage = require('../storage/storageProvider.js').provideStorage();

module.exports = {
    getScheme(req, res) {
        var schemeId = req.params.schemeId;
        schemeStorage.getScheme(schemeId).then(scheme => {
            res.json(scheme);
        }).catch( err => {
            res.status(404);
            res.json({error: 'Not found'});
        });
    }
};
