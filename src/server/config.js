const ip = require("ip");
const PropertiesReader = require('properties-reader');

const props = PropertiesReader('schemio.properties');

function conf(envName, propertyName, defaultValue) {
    // console.log('All envs', process.env);
    if (process.env.hasOwnProperty(envName)) {

        return process.env[envName];
    } else {
        const value = props.get(propertyName);
        if (typeof value !== 'undefined' && value !== null) {
            return value;
        }
    }
    return defaultValue;
}

const ipAddress = ip.address('public');
const serverPort = conf('SERVER_PORT', 'server.port' , 4010);
const instanceId = `${ipAddress}:${serverPort}`;


module.exports = {
    serverPort,

    instanceId: conf('INSTANCE_ID', 'instance.id', instanceId),

    backendless: conf('BACKENDLESS', 'backendless', false),

    mongodb: {
        url: conf('MONGODB_URL', 'mongodb.url', 'mongodb://localhost:27017'),
        dbName: conf('MONGODB_DBNAME', 'mongodb.dbName', 'schemio'),
        poolSize: conf('MONGODB_POOLSIZE', 'mongodb.poolSize', 10),
        sessionStore: {
            // ttl in seconds
            ttl: conf('MONGODB_SESSIONSTORE_TTL', 'mongodb.sessionStore.ttl', 1209600)
        }
    },

    metrics: {
        latencyBuckets: conf('METRICS_LATENCY_BUCKETS', 'metrics.latencyBuckets', '0.05, 0.1, 0.3, 0.5, 1, 2, 5')
    },

    session: {
        secret: conf('SESSION_SECRET', 'session.secret', 'somesessionsecret'),

        // used as a session identification
        cookieName: conf('SESSION_COOKIE_NAME', 'session.cookie.name', '_sx'),
        
        // used for caching user in local storage
        userCookieName: conf('SESSION_USER_COOKIE_NAME', 'session.user.cookie.name', 'sx'),

        // max age in seconds of a user coookie, when invalidated - it will trigger it to refetch user data
        userCookieMaxAge: conf('SESSION_USER_COOKIE_MAX_AGE', 'session.user.cookie.maxAge', 43200)
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
    },

    logger: {
        access: {
            type: conf('LOGGER_ACCESS_TYPE', 'logger.access.type', 'text'),
            destination: conf('LOGGER_ACCESS_DESTINATION', 'logger.access.destination', 'stdout')
        },
        default: {
            type: conf('LOGGER_DEFAULT_TYPE', 'logger.default.type', 'text'),
            destination: conf('LOGGER_DEFAULT_DESTINATION', 'logger.default.destination', 'stderr')
        },
        level: conf('LOGGER_LEVEL', 'logger.level', 'info')
    }
};
