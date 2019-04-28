const PropertiesReader = require('properties-reader');

const props = PropertiesReader('schemio.properties');

function conf(envName, propertyName, defaultValue) {
    return process.env[envName] || props.get('propertyName') || defaultValue;
}

module.exports = {
    serverPort: conf('SERVER_PORT', 'server.port' , 4010)
};
