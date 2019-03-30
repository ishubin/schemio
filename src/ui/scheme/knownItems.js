/**
 * Contains defualt properties for all components
 */

module.exports = {
    component: {
        properties: {
            locked: false,
            interactive: true,
            style: {
                shape: 'component',
                background: { color: '#ddd' },
                text: { color: '#333' },
                opacity: 1.0,
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
            locked: false,
            interactive: true,
            style: {
                background: { color: '#b8e0ee' },
            }
        }
    },

    comment: {
        values: {
            locked: false,
            interactive: false,
            style: {
                shape: ['none', 'simple-comment']
            }
        },
        properties: {
            locked: false,
            interactive: true,
            style: {
                opacity: 1.0,
                shape: 'simple-comment',
                background: { color: '#ccc' },
                text: {color: '#666'},
                stroke: {color: '#fff'}
            }
        }
    },

    image: {
        properties: {
            locked: false,
            interactive: false,
            style: {
                opacity: 1.0
            }
        }
    }
};
