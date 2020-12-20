const client = require('prom-client');
const config = require('./config.js');
const _      = require('lodash');
const { performance } = require('perf_hooks');

client.collectDefaultMetrics({
    labels: {
        instance: config.instanceId
    }
});

const requestSummary = new client.Summary({
    name: 'schemio_requests_summary',
    help: 'measures latency of requests',
});


const responseCounter = new client.Counter({
    name: 'schemio_responses',
    help: 'metric_help',
    labelNames: ['code', 'route', 'method', 'instance']
});

const latencyBucketsCounter = new client.Counter({
    name: 'schemio_latency',
    help: 'metric_help',
    labelNames: ['code', 'le', 'instance']
});

const latencyBuckets = _.map(config.metrics.latencyBuckets.split(','), bucketText => {
    const label = bucketText.trim();
    return {
        label,
        value: parseFloat(label) * 1000 // converting it to milliseconds
    };
}).sort((a, b) => a.value > b.value ? 1 : -1);

_.forEach(latencyBuckets, bucket => {
    latencyBucketsCounter.inc({le: bucket.label, instance: config.instanceId}, 0);
});

function reportLatency(latency) {
    let bucketLabel = '+Inf';
    const bucket = _.find(latencyBuckets, bucket => latency < bucket.value);
    if (bucket) {
        bucketLabel = bucket.label;
    }

    latencyBucketsCounter.inc({le: bucketLabel, instance: config.instanceId});
}


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
        const started = performance.now();

        const end = requestSummary.startTimer({
            route: routeName,
            method: req.method,
            instance: config.instanceId
        });


        res.once('finish', () => {
            responseCounter.inc({code: res.statusCode, route: routeName, method: req.method, instance: config.instanceId});
            end();
            reportLatency(performance.now() - started);
        });
        next();
    }
}


module.exports = {
    getPrometheusMetrics,
    routeMiddleware
};