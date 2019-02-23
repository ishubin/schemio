const ldapAuthService = require('../services/ldapAuthService.js');

module.exports = {
    getCurrentUser(req, res) {
        if (req.session.userLogin) {
            res.json({
                login: req.session.userLogin,
                email: req.session.userEmail,
                name: req.session.userName
            });
        } else {
            res.$notAuthorized('You are not authorized');
        }
    },

    login(req, res) {
        var credentials = req.body;
        ldapAuthService.findUser(credentials.login, credentials.password).then(user => {
            console.log('Logged user', user.login);
            req.session.userLogin = user.login;
            req.session.userEmail = user.email;
            req.session.userName = user.userName;
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
