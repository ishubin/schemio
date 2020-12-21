const ip = require("ip");


const PropertiesReader = require('properties-reader');

const props = PropertiesReader('schemio.properties');

function conf(envName, propertyName, defaultValue) {
    return process.env[envName] || props.get(propertyName) || defaultValue;
}

const ipAddress = ip.address('public');
const serverPort = conf('SERVER_PORT', 'server.port' , 4010);
const instanceId = `${ipAddress}:${serverPort}`;


module.exports = {
    serverPort,

    instanceId: conf('INSTANCE_ID', 'instance.id', instanceId),

    mongodb: {
        url: conf('MONGODB_URL', 'mongodb.url', 'mongodb://localhost:27017'),
        dbName: conf('MONGODB_DBNAME', 'mongodb.dbName', 'schemio'),
        poolSize: conf('MONGODB_POOLSIZE', 'mongodb.poolSize', 10),
        sessionStore: {
            ttl: conf('MONGODB_SESSIONSTORE_TTL', 'mongodb.sessionStore.ttl', 1209600)
        }
    },

    metrics: {
        latencyBuckets: conf('METRICS_LATENCY_BUCKETS', 'metrics.latencyBuckets', '0.05, 0.1, 0.3, 0.5, 1, 2, 5')
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
    },

    files: {
        uploadFolder: conf('FILES_UPLOADFOLDER', 'files.uploadFolder', 'uploads'),
        maxSize: conf('FILES_MAXSIZE', 'files.maxSize', 5242880)
    },

    ipFilter: {
        whitelist: conf('IPFILTER_WHITELIST', 'ipfilter.whitelist', ''),
        blacklist: conf('IPFILTER_BLACKLIST', 'ipfilter.blacklist', ''),
    }
};
