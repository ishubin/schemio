/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 const projectStorage = require('./storage/storageProvider').provideProjectStorage();

function apiError(error, message) {
    let msg = message;
    let err = error;
    if (arguments.length === 1 && (typeof arguments[0]) === 'string') {
        err = null;
        msg = arguments[0];
    }
    if (err) {
        console.error(error);
    }
    this.status(500);
    this.json({
        error: msg || 'Internal error'
    });
}

function badRequest(message) {
    console.log('Bad request', message);
    this.status(400);
    this.json({
        error: message || 'Bad request'
    });
}

function notAuthorized(message) {
    console.log('401 Not Authorized', message);
    this.status(401);
    this.json({
        error: message || 'Not authorized'
    });
}

function notFound(message) {
    console.log('404 Not found', message);
    this.status(404);
    this.json({
        error: message || 'Not found'
    });
}

module.exports = {
    api(req, res, next) {
        res.$apiError = apiError;
        res.$badRequest = badRequest;
        res.$notAuthorized = notAuthorized;
        res.$notFound = notFound;
        next();
    },

    auth(req, res, next) {
        if (req.session.userLogin && req.session.userLogin.length > 0) {
            next();
        } else {
            if (req.path.indexOf('/v1/') === 0) {
                res.status(401);
                res.json({error: 'Not authorized'});
            } else {
                var redirectTo = encodeURIComponent(req.originalUrl);
                res.redirect(`/login?redirect=${redirectTo}`);
            }
        }
    },

    projectReadPermission(req, res, next) {
        const reject = () => {
            res.status(401);
            res.json({error: 'Not authorized'});
        };
        const projectId = req.params.projectId;
        const userLogin = req.session.userLogin;
        if (projectId && userLogin) {
            projectStorage.isUserAuthorizedToRead(projectId, userLogin).then(isAuthorized => {
                if (!isAuthorized) {
                    reject();
                } else {
                    next();
                }
            }).catch(err => {
                console.error(err);
                reject();
            });
        } else {
            reject();
        }
    },

    projectWritePermission(req, res, next) {
        const reject = () => {
            res.status(401);
            res.json({error: 'Not authorized'});
        };
        const projectId = req.params.projectId;
        const userLogin = req.session.userLogin;
        if (projectId && userLogin) {
            projectStorage.isUserAuthorizedToWrite(projectId, userLogin).then(isAuthorized => {
                if (!isAuthorized) {
                    reject();
                } else {
                    next();
                }
            }).catch(err => {
                console.error(err);
                reject();
            });
        } else {
            reject();
        }
    }
};
