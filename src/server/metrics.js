const client          = require('prom-client');
const _               = require('lodash');
const { performance } = require('perf_hooks');
const config          = require('./config.js');
const logger          = require('./logger.js').createLog('metrics.js');

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

// making sure all latency buckets will be exported even when they have 0 count
_.forEach(latencyBuckets, bucket => {
    latencyBucketsCounter.inc({le: bucket.label, instance: config.instanceId}, 0);
});
latencyBucketsCounter.inc({le: '+Inf', instance: config.instanceId}, 0);


function reportLatency(latency) {
    latencyBucketsCounter.inc({le: '+Inf', instance: config.instanceId});

    _.forEach(latencyBuckets, bucket => {
        if (latency < bucket.value) {
            latencyBucketsCounter.inc({le: bucket.label, instance: config.instanceId});
        }
    });
}


function getPrometheusMetrics(req, res) {
    logger.info('Colleting metrics');
    client.register.metrics().then(metrics => {
        res.set('Content-Type', client.register.contentType);
        res.send(metrics);
    })
    .catch(err => {
        logger.error('Error collecting metrics', err)
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