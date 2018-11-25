export default {
    loadScheme() {
        return Promise.resolve({
            name: 'Blah',
            items: [{
                type: 'image',
                area: {x: 0, y: 0, w: 711, h: 550},
                url: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Elasticsearch_Cluster_August_2014.png',
                name: 'background-image-1',
                description: ''
            },{
                type: 'component',
                area: {x: 300, y: 180, w: 80, h: 60},
                name: 'Nginx',
                description: 'load balancer for frontends',
                invisible: true,
                links: [{
                    icon: 'kibana',
                    title: 'Load balancer logs',
                    url: 'http://localhost/kibana/nginx'
                }, {
                    icon: 'grafana',
                    title: 'Grafana',
                    url: 'http://localhost/grafana/nginx'
                }]
            }, {
                type: 'component',
                area: {x: 200, y: 100, w: 100, h: 30},
                name: 'backend #1',
                description: ''
            }]
        });
    }
}
