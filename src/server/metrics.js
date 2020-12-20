const client = require('prom-client');
const config = require('./config.js');

client.collectDefaultMetrics({
    labels: {
        instance: config.instanceId
    }
});

const requestSummary = new client.Summary({
    name: 'requests_summary',
    help: 'measures latency of requests',
});


const responseCounter = new client.Counter({
    name: 'responses',
    help: 'metric_help',
    labelNames: ['code', 'route', 'method', 'instance']
});

function getPrometheusMetrics(req, res) {
    //TODO check for allowed IP range, do not expose it to the world
    console.log('colleting metrics');
    client.register.metrics().then(metrics => {
        res.set('Content-Type', client.register.contentType);
        res.send(metrics);
    })
    .catch(err => {
        console.error('Error collecting metrics', err)
    });
}


function routeMiddleware({ routeName }) {
    return (req, res, next) => {
        const end = requestSummary.startTimer({
            route: routeName,
            method: req.method,
            instance: config.instanceId
        });

        res.once('finish', () => {
            responseCounter.inc({code: res.statusCode, route: routeName, method: req.method, instance: config.instanceId});
            end();
        });
        next();
    }
}


module.exports = {
    getPrometheusMetrics,
    routeMiddleware
};