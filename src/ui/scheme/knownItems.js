/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Contains defualt properties for all components
 */

module.exports = {
    component: {
        values: {
            strokePatterns: ['line', 'dotted', 'dashed']
        },
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
                stroke: { color: '#666', size: 1, pattern: 'line'}
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
                    background: {color: 'rgba(255,255,255,0.01)'},
                    stroke: { color: 'rgba(100, 100, 100, 0.1)', size: 1, pattern: 'dashed' }
                },
                active: {
                    background: { color: 'rgba(150,100,255,0.4)'},
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
