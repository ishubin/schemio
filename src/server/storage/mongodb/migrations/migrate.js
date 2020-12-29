
const mongo  = require('../Mongo.js');
const _      = require('lodash');
const logger = require('../../../logger.js').createLog('migrate.js');

function executeMigration(migrationId) {
    return new Promise((resolve, reject) => {
        try {
            const migrationScript = require(`./${migrationId}`);

            mongo.db().collection('migrations').find({id: migrationId}).count().then(count => {
                if (count === 0) {
                    logger.info(`Executing migration ${migrationId}`);

                    migrationScript.up(mongo.db()).then(() => {
                        logger.info(`Migration ${migrationId} executed successfully`);
                        return mongo.db().collection('migrations').insert({id: migrationId, executionTime: new Date().toISOString()});
                    }).then(() => {
                        resolve();
                    }).catch(err => {
                        logger.error(`Migration ${migrationId} failed`, err);
                        reject(err);
                    });
                } else {
                    logger.info(`Migration ${migrationId} is already executed`);
                    resolve();
                }
            });
        } catch(err) {
            reject(err);
        }
    });
}

function executeMigrations(migrationIds) {
    const initialPromise = Promise.resolve(null);
    return migrationIds.reduce((promiseChain, migrationId) => {
        return promiseChain.then(() => {
            return executeMigration(migrationId);
        });
    }, initialPromise);
}


function migrate() {
    logger.info('Executing mongo migrations');
    return executeMigrations([
        '001-indices.js'
    ]);
}

module.exports = { migrate };
