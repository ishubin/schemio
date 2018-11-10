export default {
    loadScheme() {
        return Promise.resolve({
            name: 'Blah',
            items: [{
                type: 'component',
                area: {x: 10, y: 10, w: 100, h: 30},
                name: 'Nginx',
                description: 'load balancer for frontends'
            }]
        });
    }
}
