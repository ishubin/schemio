const config   = require('./config.js');
const hostname = require('os').hostname();
const fs       = require('fs');

function levelToNumber(levelName) {
    if (levelName === 'error') {
        return 1;
    }
    if (levelName === 'info') {
        return 2;
    }
    if (levelName === 'debug') {
        return 3;
    }
    if (levelName === 'access') {
        return 0;
    }
    return 4;
}

const currentLogLevelNumber = levelToNumber(config.logger.level);

function isLevelAllowed(levelName) {
    return levelToNumber(levelName) <= currentLogLevelNumber;
}

function createFileLogStream(destination) {
    if (destination.trim().indexOf('file:') === 0) {
        const path = destination.substr(destination.indexOf(':') + 1).trim();
        if (path) {
            return fs.createWriteStream(path, { flags: 'a' });
        }
    }
    return null;
}

let accessLogStream = createFileLogStream(config.logger.access.destination);
let defaultLogStream = createFileLogStream(config.logger.default.destination);

function writeAccessLog(logLine) {
    if (accessLogStream) {
        accessLogStream.write(logLine + '\n');
    } else if (config.logger.access.destination === 'stdout') {
        process.stdout.write(logLine + '\n');
    } else if (config.logger.access.destination === 'stderr') {
        process.stderr.write(logLine + '\n');
    }
}

function writeDefaultLog(logLine) {
    if (defaultLogStream) {
        defaultLogStream.write(logLine + '\n');
    } else if (config.logger.default.destination === 'stdout') {
        process.stdout.write(logLine + '\n');
    } else if (config.logger.default.destination === 'stderr') {
        process.stderr.write(logLine + '\n');
    }
}

class Logger {
    constructor(loggerName) {
        this.loggerName = loggerName || '';
    }

    info(message) {
        this._message('info', message);
    }

    debug(message) {
        this._message('debug', message);
    }

    access(req, res) {
        try {
            const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
            const date = new Date().toISOString();

            let logLine = null;
            if (config.logger.access.type === 'json') {
                logLine = JSON.stringify({
                    date,
                    url: fullUrl,
                    method: req.method,
                    ip: req.connection.remoteAddress,
                    statusCode: res.statusCode,
                    instance: config.instanceId,
                    hostname
                });
            } else {
                logLine = `${date} access ${res.statusCode} ${req.method} ${req.connection.remoteAddress} ${fullUrl}`;
            }
            writeAccessLog(logLine);
        } catch(err) {
            this.error('Not able to write to access logs', err);
        }
    }

    /**
     * 
     * @param {String} message 
     * @param {Error} err 
     */
    error(message, err) {
        let fullMessage = message;
        if (err) {
            fullMessage += ' ' + err.toString();
        }
        if (err.stack) {
            fullMessage += '\n' + err.stack;
        }
        this._message('error', fullMessage);
    }

    _message(level, message) {
        if (!isLevelAllowed(level)) {
            return;
        }
        const date = new Date().toISOString();

        let logLine = null;
        if (config.logger.default.type === 'json') {
            logLine = JSON.stringify({
                date,
                level,
                logger: this.loggerName,
                message: message,
                instance: config.instanceId,
                hostname
            });
        } else {
            logLine = `${date} ${level} ${this.loggerName} ${message}`;
        }

        writeDefaultLog(logLine);
    }
}


/**
 * 
 * @param {String} loggerName 
 * @returns {Logger}
 */
function createLog(loggerName) {
    return new Logger(loggerName);
}

module.exports = {
    Logger,
    createLog
}