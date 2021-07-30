// This config is used to build UI for FS based Schemio distribution

console.log('--------------------- FS --------------------------');

export default {
    // should be disabled for production
    debug: true,

    project: {
        categories: {
            enabled: false,
            maxDepth: 10
        }
    },

    auth: {
        enabled: false,
        alternative: {
            enabled: false
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

    consent: {
        enabled: false
    },

    analytics: {
        enabled: false,
        ga: {
            id: 'blahblah'
        }
    }
};
