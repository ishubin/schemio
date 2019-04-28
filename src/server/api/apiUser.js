/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const ldapAuthService   = require('../services/ldapAuthService.js');
const config            = require('../config.js');
const authType          = config.auth.type;

if (authType !== 'ldap' && authType !== 'disabled') {
    throw new Error(`Unknown authentication type: ${authType}`);
}


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

        if (authType === 'ldap') {
            ldapAuthService.findUser(credentials.login, credentials.password).then(user => {
                console.log('Logged user', user.login);
                req.session.userLogin = user.login;
                req.session.userEmail = user.email;
                req.session.userName = user.userName;
                res.json(user);
            }).catch(err => {
                res.$apiError(err, 'Could not authorize');
            });
        } else if (authType === 'disabled') {
            console.log('Logged user with disabled authentication', credentials.login);
            req.session.userLogin = credentials.login;
            req.session.userEmail = 'unknownemail';
            req.session.userName = credentials.login;
            res.json({
                login: credentials.login,
                email: 'unknownemail',
                userName: credentials.login
            });
        }
    },

    logout(req, res) {
        req.session.destroy();
        res.redirect('/');
    }
};
