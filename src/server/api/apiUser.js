const ldapAuthService = require('../services/ldapAuthService.js');

module.exports = {
    login(req, res) {
        var credentials = req.body;
        ldapAuthService.findUser(credentials.login, credentials.password).then(user => {
            console.log('Logged user', user.login);
            req.session.userLogin = user.login
            res.json(user);
        }).catch(err => {
            res.$apiError(err, 'Could not authorize');
        });
    },

    logout(req, res) {
        req.session.destroy();
        res.redirect('/');
    }
};
