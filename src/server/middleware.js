/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function apiError(error, message) {
    if (arguments.length === 1 && (typeof arguments[0]) === 'string') {
        error = null;
        message = arguments[0];
    }
    if (error) {
        console.error(error);
    }
    this.status(500);
    this.json({
        error: message || 'Internal error'
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
            if (req.path.indexOf('/api/') === 0) {
                res.status(401);
                res.json({error: 'Not authorized'});
            } else {
                var redirectTo = encodeURIComponent(req.originalUrl);
                res.redirect(`/login?redirect=${redirectTo}`);
            }
        }
    }
};
