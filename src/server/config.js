const PropertiesReader = require('properties-reader');

const props = PropertiesReader('schemio.properties');

function conf(envName, propertyName, defaultValue) {
    return process.env[envName] || props.get(propertyName) || defaultValue;
}

module.exports = {
    serverPort: conf('SERVER_PORT', 'server.port' , 4010),

    mongodb: {
        url: conf('MONGODB_URL', 'mongodb.url', 'mongodb://localhost:27017'),
        dbName: conf('MONGODB_DBNAME', 'mongodb.dbName', 'schemio'),
        poolSize: conf('MONGODB_POOLSIZE', 'mongodb.poolSize', 10),
        sessionStore: {
            ttl: conf('MONGODB_SESSIONSTORE_TTL', 'mongodb.sessionStore.ttl', 1209600)
        }
    },

    session: {
        secret: conf('SESSION_SECRET', 'session.secret', 'somesessionsecret')
    },

    api: {
        payloadSize: conf('API_PAYLOAD_SIZE', 'api.payloadSize', '50mb')
    }
};
