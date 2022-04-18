import { generateSchemePatch } from '../src/ui/scheme/SchemePatch'
import utils from '../src/ui/utils';
import expect from 'expect';
import { defaultifyScheme } from '../src/ui/scheme/Scheme';

const defaultScheme = {
    name: '',
    description: '',
    tags: ['a', 'b', 'c', 'd'],
    categoryId: null,
    items: [],
    settings: {
        screen: {
            draggable: true,
        }
    },
    style: {
        backgroundColor:    'rgba(240, 240, 240, 1.0)',
        gridColor:          'rgba(128 ,128, 128, 0.2)',
        boundaryBoxColor:   'rgba(36, 182, 255, 1)',
        controlPointsColor: 'rgba(4,177,23, 1.0)',
        itemMarkerColor:    'rgba(36, 182, 255, 1)',
        itemMarkerToggled:  false
    }
};

const ID_ARRAY_PATCH = 'idArrayPatch';

const defaultArea = {x: 0, y: 0, w: 100, h: 50, r: 100, px: 0.5, py: 0.5, sx: 1, sy: 1};

const $ = {
    doc(doc) {
        return defaultifyScheme(doc);
    }
};

describe('SchemePatch', () => {
    it('should recognize doc field changes', () => {
        
        const modifiedScheme = utils.clone(defaultScheme);
        modifiedScheme.name = 'qwe';
        modifiedScheme.settings.screen.draggable = false;
        modifiedScheme.style.boundaryBoxColor = '#fff';

        modifiedScheme.tags = ['a', 'd', 'c', 'e'];

        const patch = generateSchemePatch(defaultScheme, modifiedScheme);
        
        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['name'],
                op: 'replace',
                value: 'qwe'
            }, {
                path: ['settings', 'screen', 'draggable'],
                op: 'replace',
                value: false
            }, {
                path: ['style', 'boundaryBoxColor'],
                op: 'replace',
                value: '#fff'
            }, {
                path: ['tags'],
                op: 'setPatch',
                changes: [ {
                    op: 'add',
                    value: 'e',
                }, {
                    op: 'delete',
                    value: 'b'
                }]
            }],
        })
    });


    it('should recognize item field changes', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'}]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1-changed'},
                { id: 'qwe2', name: 'item2'}]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['name'],
                        op: 'replace',
                        value: 'item1-changed'
                    }]
                }]
            }],
        });
    });


    it('should recognize sort order change. moving last item to head', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3'}]
        }), $.doc({
            items: [
                { id: 'qwe3', name: 'item3'},
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'}]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe3',
                    op: 'reorder',
                    parentId: null,
                    sortOrder: 0
                } ]
            }],
        });
    });


    it('should recognize deletion', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3'}]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe3', name: 'item3'}]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe2',
                    op: 'delete',
                } ]
            }],
        });
    });

    it('should recognize addition', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3'}]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe2.5', name: 'item2.5'},
                { id: 'qwe3', name: 'item3'}]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe2.5',
                    op: 'add',
                    parentId: null,
                    sortOrder: 2,
                    value: {
                        id: 'qwe2.5',
                        name: 'item2.5'
                    }
                } ]
            }],
        });
    });

    it('should recognize deletion, addition and order change', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3'},
                { id: 'qwe4', name: 'item4'}]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1'},
                { id: 'qwe5', name: 'item5'},
                { id: 'qwe4', name: 'item4'},
                { id: 'qwe3', name: 'item3'}]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe5',
                    op: 'add',
                    parentId: null,
                    sortOrder: 1,
                    value: {
                        id: 'qwe5',
                        name: 'item5'
                    }
                }, {
                    id: 'qwe2',
                    op: 'delete'
                },{
                    id: 'qwe4',
                    op: 'reorder',
                    parentId: null,
                    sortOrder: 2
                } ]
            }],
        });
    });


    it('should recognize remounting to different parent', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1',
                    childItems: [
                        {id: 'sub1.1', name: 'sub1.1'},
                        {id: 'sub1.2', name: 'sub1.2'},
                        {id: 'sub1.3', name: 'sub1.3'},
                    ]
                },
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3',
                    childItems: [
                        {id: 'sub3.1', name: 'sub3.1'},
                        {id: 'sub3.2', name: 'sub3.2'},
                        {id: 'sub3.3', name: 'sub3.3'},
                    ]
                }]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1',
                    childItems: [
                        {id: 'sub1.1', name: 'sub1.1'},
                        {id: 'sub3.2', name: 'sub3.2'},
                        {id: 'sub1.2', name: 'sub1.2'},
                        {id: 'sub1.3', name: 'sub1.3'},
                    ]
                },
                { id: 'qwe2', name: 'item2'},
                { id: 'qwe3', name: 'item3',
                    childItems: [
                        {id: 'sub3.1', name: 'sub3.1'},
                        {id: 'sub3.3', name: 'sub3.3'},
                    ]
                }]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'sub3.2',
                    op: 'mount',
                    parentId: 'qwe1',
                    sortOrder: 1
                }, {
                    id: 'sub3.2',
                    op: 'demount',
                    parentId: 'qwe3'
                }]
            }],
        });
    });

    it('should recognize shapeProps change', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {strokeColor: '#fff'} },
                { id: 'qwe2', name: 'item2', area: defaultArea },
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {strokeColor: '#000'} },
                { id: 'qwe2', name: 'item2' , area: defaultArea},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['shapeProps', 'strokeColor'],
                        op: 'replace',
                        value: '#000'
                    }]
                }]
            }],
        });
    });

    it('should recognize textSlot change', () => {
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {}, textSlots: {
                    body: {
                        text         : 'Hello world!',
                        color        : 'rgba(0,0,0,1.0)',
                        halign       : 'center',
                        valign       : 'middle',
                        fontSize     : 14,
                        whiteSpace   : 'normal',
                        font         : 'Arial',
                        paddingLeft  : 10,
                        paddingRight : 10,
                        paddingTop   : 10,
                        paddingBottom: 10
                    },
                    unknownTextSlot: {
                        text: 'zxczxc' // this should not propagate to patch as it is not recognized by the Shape
                    }
                } },
                { id: 'qwe2', name: 'item2' },
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {}, textSlots: {
                    body: {
                        text         : 'Goodbye world!',
                        color        : 'rgba(0,0,0,1.0)',
                        halign       : 'center',
                        valign       : 'top',
                        fontSize     : 16,
                        whiteSpace   : 'normal',
                        font         : 'Arial',
                        paddingLeft  : 10,
                        paddingRight : 10,
                        paddingTop   : 10,
                        paddingBottom: 10
                    },
                    unknownTextSlot: {
                        text: 'Qweqe' // this should not propagate to patch as it is not recognized by the Shape
                    }
                } },
                { id: 'qwe2', name: 'item2' },
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['textSlots', 'body', 'text'],
                        op: 'replace',
                        value: 'Goodbye world!'
                    }, {
                        path: ['textSlots', 'body', 'valign'],
                        op: 'replace',
                        value: 'top'
                    }, {
                        path: ['textSlots', 'body', 'fontSize'],
                        op: 'replace',
                        value: 16
                    }]
                }]
            }],
        });
    });

    it('should recognize item tags changes', () => {
        // For tags and groups the order is irrelevant, so it should be treated like a patch in a Set
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', tags: ['a', 'b', 'c', 'd']},
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', tags: ['a', 'g', 'd', 'c', 'e']},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [{
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['tags'],
                        op: 'setPatch',
                        changes: [ {
                            op: 'add',
                            value: 'g',
                        }, {
                            op: 'add',
                            value: 'e',
                        }, {
                            op: 'delete',
                            value: 'b'
                        }]
                    }]
                } ]
            }],
        });
    });

    it('should recognize item groups changes', () => {
        // For tags and groups the order is irrelevant, so it should be treated like a patch in a Set
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', groups: ['a', 'b', 'c', 'd']},
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', groups: ['a', 'g', 'd', 'c', 'e']},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [ {
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['groups'],
                        op: 'setPatch',
                        changes: [ {
                            op: 'add',
                            value: 'g',
                        }, {
                            op: 'add',
                            value: 'e',
                        }, {
                            op: 'delete',
                            value: 'b'
                        }]
                    }]
                } ]
            }],
        });
    });

    it('should recognize behavior events addition, deletion, reorder and modification', () => {
        // For tags and groups the order is irrelevant, so it should be treated like a patch in a Set
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', behavior: {
                    events: [
                        { id: 'e1', event: 'click', actions: [] },
                        { id: 'e2', event: 'mousein', actions: [] },
                        { id: 'e3', event: 'mouseout', actions: [] },
                        { id: 'e4', event: 'init', actions: [] },
                    ]
                }},
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', behavior: {
                    events: [
                        { id: 'e3', event: 'mouseout', actions: [] },
                        { id: 'e2', event: 'mousein', actions: [] },
                        { id: 'e4', event: 'click', actions: [] },
                        { id: 'e5', event: 'custom event', actions: []}
                    ]
                }},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [ {
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['behavior', 'events'],
                        op: ID_ARRAY_PATCH,
                        changes: [ {
                            id: 'e1',
                            op: 'delete',
                        }, {
                            id: 'e3',
                            op: 'reorder',
                            sortOrder: 0
                        }, {
                            id: 'e5',
                            op: 'add',
                            sortOrder: 3,
                            value: { id: 'e5', event: 'custom event', actions: []}
                        }, {
                            id: 'e4',
                            op: 'modify',
                            changes: [{
                                path: ['event'],
                                op: 'replace',
                                value: 'click'
                            }]
                        }]
                    }]
                } ]
            }],
        });
    });

    it('should recognize behavior actions addition, deletion, reorder and modification', () => {
        // For tags and groups the order is irrelevant, so it should be treated like a patch in a Set
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', behavior: {
                    events: [
                        { id: 'e1', event: 'click', actions: [{
                            id: 'a1',
                            element: 'self',
                            method: 'blinkEffect',
                            args: {
                                fade: true,
                                color: '#fff',
                                inBackground: true
                            }
                        }, {
                            id: 'a2',
                            element: 'self',
                            method: 'crawlEffect',
                            args: {}
                        }, {
                            id: 'a3',
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'shapeProps.fill',
                                value: {
                                    type: 'solid',
                                    color: 'rgba(225, 44, 44, 1)'
                                }
                            },
                        }, {
                            id: 'a4',
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'shapeProps.strokeColor',
                                value: 'rgba(225, 44, 44, 1)'
                            },
                        }] },
                    ]
                }},
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', behavior: {
                    events: [
                        { id: 'e1', event: 'click', actions: [{
                            id: 'a3',
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'shapeProps.fill',
                                value: {
                                    type: 'solid',
                                    color: 'rgba(225, 44, 44, 1)'
                                }
                            },
                        }, {
                            id: 'a1',
                            element: 'self',
                            method: 'blinkEffect',
                            args: {
                                fade: true,
                                color: '#fff',
                                inBackground: true
                            }
                        }, {
                            id: 'a4',
                            element: 'asd',
                            method: 'set',
                            args: {
                                field: 'shapeProps.strokeColor',
                                value: '#000'
                            },
                        }, {
                            id: 'a5',
                            element: 'self',
                            method: 'particleEffect',
                            args: {}
                        }] },
                    ]
                }},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [ {
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['behavior', 'events'],
                        op: ID_ARRAY_PATCH,
                        changes: [ {
                            id: 'e1',
                            op: 'modify',
                            changes: [{
                                path: ['actions'],
                                op: ID_ARRAY_PATCH,
                                changes: [{
                                    id: 'a3',
                                    op: 'reorder',
                                    sortOrder: 0
                                }, {
                                    id: 'a2',
                                    op: 'delete'
                                }, {
                                    id: 'a5',
                                    op: 'add',
                                    sortOrder: 3,
                                    value: {
                                        id: 'a5',
                                        element: 'self',
                                        method: 'particleEffect',
                                        args: {}
                                    }
                                }, {
                                    id: 'a4',
                                    op: 'modify',
                                    changes: [{
                                        path: ['element'],
                                        op: 'replace',
                                        value: 'asd'
                                    }, {
                                        path: ['args', 'value'],
                                        op: 'replace',
                                        value: '#000'
                                    }]
                                }]
                            }]
                        }]
                    }]
                } ]
            }],
        });
    });


    it('should recognize item links addition, deletion, reorder and modification', () => {
        // For tags and groups the order is irrelevant, so it should be treated like a patch in a Set
        const patch = generateSchemePatch($.doc({
            items: [
                { id: 'qwe1', name: 'item1', links: [
                    { id: 'l1', title: 'Link 1', url: 'http://link-1', type: 'default' },
                    { id: 'l2', title: 'Link 2', url: 'http://link-2', type: 'default' },
                    { id: 'l3', title: 'Link 3', url: 'http://link-3', type: 'default' },
                    { id: 'l4', title: 'Link 4', url: 'http://link-4', type: 'default' },
                ]},
            ]
        }), $.doc({
            items: [
                { id: 'qwe1', name: 'item1', links: [
                    { id: 'l1', title: 'Link 1', url: 'http://link-1', type: 'default' },
                    { id: 'l4', title: 'Link 4', url: 'http://link-4', type: 'default' },
                    { id: 'l3', title: 'Link 3 edited', url: 'http://link-3-edited', type: 'logs' },
                    { id: 'l5', title: 'Link 5', url: 'http://link-5', type: 'default' },
                ]},
            ]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            changes: [{
                path: ['items'],
                op: ID_ARRAY_PATCH,
                changes: [ {
                    id: 'qwe1',
                    op: 'modify',
                    changes: [{
                        path: ['links'],
                        op: ID_ARRAY_PATCH,
                        changes: [ {
                            id: 'l2',
                            op: 'delete',
                        }, {
                            id: 'l4',
                            op: 'reorder',
                            sortOrder: 1
                        }, {
                            id: 'l5',
                            op: 'add',
                            sortOrder: 3,
                            value: { id: 'l5', title: 'Link 5', url: 'http://link-5', type: 'default' }
                        }, {
                            id: 'l3',
                            op: 'modify',
                            changes: [{
                                path: ['title'],
                                op: 'replace',
                                value: 'Link 3 edited'
                            }, {
                                path: ['url'],
                                op: 'replace',
                                value: 'http://link-3-edited'
                            }, {
                                path: ['type'],
                                op: 'replace',
                                value: 'logs'
                            }]
                        }]
                    }]
                } ]
            }],
        });
    });

});