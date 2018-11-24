export default {
    loadScheme() {
        return Promise.resolve({
            name: 'Blah',
            items: [{
                type: 'image',
                area: {x: 0, y: 0, w: 1200, h: 1200},
                url: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Elasticsearch_Cluster_August_2014.png',
                name: 'background-image-1',
                description: ''
            },{
                type: 'component',
                area: {x: 10, y: 10, w: 100, h: 30},
                name: 'Nginx',
                description: 'load balancer for frontends'
            }, {
                type: 'component',
                area: {x: 200, y: 100, w: 100, h: 30},
                name: 'backend #1',
                description: ''
            }]
        });
    }
}
