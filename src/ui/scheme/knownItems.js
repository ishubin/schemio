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
        values: {
            strokePatterns: ['line', 'dotted', 'dashed']
        },
        properties: {
            locked: false,
            interactive: true,
            style: {
                inactive: {
                    background: {color: 'rgba(255,0,255,0.1)'},
                    stroke: { color: 'rgba(100, 100, 100, 1.0)', size: 1, pattern: 'dashed' }
                },
                active: {
                    background: { color: 'rgba(255,0,255,0.7)'},
                    stroke: { color: 'rgba(100, 100, 100, 1.0)', size: 1, pattern: 'dashed' }
                }
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
