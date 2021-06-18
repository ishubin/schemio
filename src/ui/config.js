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

    consent: {
        enabled: true
    }
};