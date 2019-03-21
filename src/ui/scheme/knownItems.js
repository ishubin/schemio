/**
 * Contains defualt properties for all components
 */

module.exports = {
    component: {
        properties: {
            locked: false,
            style: {
                shape: 'component',
                background: { color: '#ddd' },
                text: { color: '#333' },
                properties: {
                    background: { color: '#eee' },
                    text: { color: '#888' }
                },
                stroke: { color: '#666', size: 1 }
            }
        }
    },

    overlay: {
        properties: {
            style: {
                background: { color: '#b8e0ee' },
            }
        }
    },

    comment: {
        values: {
            style: {
                shape: ['none', 'simple-comment']
            }
        },
        properties: {
            style: {
                shape: 'simple-comment',
                background: { color: '#ccc' },
                text: {color: '#666'},
                stroke: {color: '#fff'}
            }
        }
    },

    art: {
        properties: {
            style: {}
        }
    },

    image: {
        properties: {}
    }
};
