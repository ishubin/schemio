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
    },

    auth: {
        type: conf('AUTH_TYPE', 'auth.type', 'ldap'),
        ldap: {
            url: conf('AUTH_LDAP_URL', 'auth.ldap.url', 'ldap://127.0.0.1:389/ou=people,dc=planetexpress,dc=com'),
            timeout: conf('AUTH_LDAP_TIMEOUT', 'auth.ldap.timeout', 5000),
            connectTimeout: conf('AUTH_LDAP_CONNECTTIMEOUT', 'auth.ldap.connectTimeout', 10000),

            bind: {
                dn: conf('AUTH_LDAP_BIND_DN', 'auth.ldap.bind.dn', 'cn=admin,dc=planetexpress,dc=com'),
                password: conf('AUTH_LDAP_BIND_PASSWORD', 'auth.ldap.bind.password', 'GoodNewsEveryone')
            },
            search: {
                baseDn: conf('AUTH_LDAP_SEARCH_BASEDN', 'auth.ldap.search.baseDn', 'ou=people,dc=planetexpress,dc=com')
            }
        }
    }
};
