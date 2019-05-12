
const mongo = require('../Mongo.js');
const _     = require('lodash');

function executeMigration(migrationId) {
    return new Promise((resolve, reject) => {
        try {
            const migrationScript = require(`./${migrationId}`);

            mongo.db().collection('migrations').find({id: migrationId}).count().then(count => {
                if (count === 0) {
                    console.log(`Executing migration ${migrationId}`);

                    migrationScript.up(mongo.db()).then(() => {
                        console.log(`Migration ${migrationId} executed successfully`);
                        return mongo.db().collection('migrations').insert({id: migrationId, executionTime: Date.now()});
                    }).then(() => {
                        resolve();
                    }).catch(err => {
                        console.error(`Migration ${migrationId} failed`);
                        reject(err);
                    });
                } else {
                    console.log(`Migration ${migrationId} is already executed`);
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
    console.log('Executing mongo migrations');
    return executeMigrations([
        '001-indices.js'
    ]);
}

module.exports = { migrate };
