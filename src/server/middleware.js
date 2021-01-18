/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const config         = require('./config.js');
const projectStorage = require('./storage/storageProvider').provideProjectStorage();
const ipfilter       = require('express-ipfilter').IpFilter;
const logger         = require('./logger.js').createLog('middleware.js');

function apiError(error, message) {
    let msg = message;
    let err = error;
    if (arguments.length === 1 && (typeof arguments[0]) === 'string') {
        err = null;
        msg = arguments[0];
    }
    if (err) {
        logger.error(message, error);
    }
    this.status(500);
    this.json({
        error: msg || 'Internal error'
    });
}

function badRequest(message) {
    logger.info(`Bad request. ${message}`);
    this.status(400);
    this.json({
        error: message || 'Bad request'
    });
}

function notAuthorized(message) {
    logger.info(`401 Not Authorized ${message}`);
    this.status(401);
    this.json({
        error: message || 'Not authorized'
    });
}

function notFound(message) {
    logger.info(`404 Not found ${message}`);
    this.status(404);
    this.json({
        error: message || 'Not found'
    });
}

function parseIps(text) {
    text = text.trim();
    if (!text) {
        return null;
    }
    return text.split(',');
}

function configureIpFilter(app) {
    const whiteListIps = parseIps(config.ipFilter.whitelist);
    if (whiteListIps && whiteListIps.length > 0) {
        logger.info(`Configured IP whitelisting for: ${JSON.stringify(whiteListIps)}`);
        app.use(ipfilter(whiteListIps, { mode: 'allow' }));
    }

    const blackListIps = parseIps(config.ipFilter.blacklist);
    if (blackListIps && blackListIps.length > 0) {
        logger.info(`Configured IP blacklisting for: ${JSON.stringify(blackListIps)}`);
        app.use(ipfilter(blackListIps));
    }
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
                logger.error('Could not check user read permission', err);
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
                logger.error('Could not check user write permission', err);
                reject();
            });
        } else {
            reject();
        }
    },

    accessLogging(req, res, next) {
        res.once('finish', () => {
            logger.access(req, res);
        });
        next();
    },

    /**
     * This middleware is only used for testing purpose. It lets you simulate crashes and add latency to requests
     * @param {*} req
     * @param {*} res 
     * @param {*} next 
     */
    testMiddleware(req, res, next) {
        if (Math.random() < 0.2) {
            res.status(500);
            res.json({error: 'Simulated crash'});
        } else {
            setTimeout(() => {
                next();
            }, 1000);
        }
    },
    
    configureIpFilter,
};
