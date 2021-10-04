// This file should be replaced with a different one depending on the build env or a distribution version

console.log('--------------------- LOCAL --------------------------');

export default {
    // should be disabled for production
    debug: true,

    project: {
        categories: {
            enabled: true,
            maxDepth: 10
        }
    },

    auth: {
        enabled: true,
        alternative: {
            enabled: true
        }
    },

    messages: {
        ttlSeconds: 5
    },

    cache: {
        currentUserTTL: 30000
    },

    styles: {
        maxStyles: 5
    },

    media: {
        uploadEnabled: true
    },

    analytics: {
        enabled: false,
        ga: {
            id: 'blahblah'
        }
    }
};