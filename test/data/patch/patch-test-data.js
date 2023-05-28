import { defaultifyScheme } from "../../../src/ui/scheme/Scheme";
import utils from "../../../src/ui/utils";


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


const defaultArea = {x: 0, y: 0, w: 100, h: 50, r: 100, px: 0.5, py: 0.5, sx: 1, sy: 1};

function createDocFieldChanges() {
    const modifiedScheme = utils.clone(defaultScheme);
    modifiedScheme.name = 'qwe';
    modifiedScheme.settings.screen.draggable = false;
    modifiedScheme.style.boundaryBoxColor = '#fff';

    modifiedScheme.tags = ['a', 'c', 'd', 'e'];
    return modifiedScheme;
}

export const patchTestData = [{
    name: 'doc field changes',
    origin: defaultScheme,
    modified: createDocFieldChanges(),
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['name'],
            op: 'patch-text',
            patch: {
                delete: [], add: [[0, 'qwe']]
            }
        }, {
            path: ['tags'],
            op: 'patch-set',
            changes: [ {
                op: 'add',
                value: 'e',
            }, {
                op: 'delete',
                value: 'b'
            }]
        }, {
            path: ['style', 'boundaryBoxColor'],
            op: 'replace',
            value: '#fff'
        }, {
            path: ['settings', 'screen', 'draggable'],
            op: 'replace',
            value: false
        }],
    },
    stats: {
        document: {
            fieldChanges: 4,
            fields: ['name', 'tags', 'style.boundaryBoxColor', 'settings.screen.draggable']
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 0, items: []},
        }
    }
}, {
    //TODO test for more field changes to make sure every field is covered
    name: 'item field changes',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'}]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1-changed'},
            { id: 'qwe2', name: 'item2'}]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['name'],
                    op: 'patch-text',
                    patch: {delete: [], add: [[5, '-changed']]}
                }]
            }]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 1, items: [{
                id: 'qwe1',
                fields: [
                    'name'
                ]
            }]},
        }
    }
}, {
    name: 'sort order change. moving last item to head',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'},
            { id: 'qwe3', name: 'item3'}]
    },
    modified: {
        items: [
            { id: 'qwe3', name: 'item3'},
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'}]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe3',
                op: 'reorder',
                parentId: null,
                sortOrder: 0
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 1, items: [{
                id: 'qwe3',
                fields: [ ]
            }]},
        }
    }
}, {
    name: 'item deletion',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'},
            { id: 'qwe3', name: 'item3'}]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe3', name: 'item3'}]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe2',
                op: 'delete',
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 1, items: [ 'qwe2' ]},
            modified: {count: 0, items: []},
        }
    }
}, {
    name: 'item addition',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'},
            { id: 'qwe3', name: 'item3'}]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'},
            { id: 'qwe2.5', name: 'item2.5'},
            { id: 'qwe3', name: 'item3'}]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
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
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 1, items: [ 'qwe2.5']},
            deleted: {count: 0, items: []},
            modified: {count: 0, items: []},
        }
    }
}, {
    name: 'item deletion, addition and order change',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2'},
            { id: 'qwe3', name: 'item3'},
            { id: 'qwe4', name: 'item4'}]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe5', name: 'item5'},
            { id: 'qwe4', name: 'item4'},
            { id: 'qwe3', name: 'item3'}]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
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
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 1, items: ['qwe5']},
            deleted: {count: 1, items: ['qwe2']},
            modified: {count: 1, items: [{
                id: 'qwe4',
                fields: [ ]
            }]},
        }
    }
}, {
    name: 'item remounting to different parent and changing item property',
    origin: {
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
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1',
                childItems: [
                    {id: 'sub1.1', name: 'sub1.1'},
                    {id: 'sub3.2', name: 'sub3.2 modified'},
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
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'sub3.2',
                op: 'mount',
                parentId: 'qwe1',
                sortOrder: 1
            }, {
                id: 'sub3.2',
                op: 'modify',
                changes: [{
                    path: ['name'],
                    op: 'patch-text',
                    patch: {delete: [], add: [[6, ' modified']]}
                }]
            }]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 2, items: [{
                id: 'sub3.2',
                fields: ['name']
            }]},
        }
    }
}, {
    name: 'item remounting to different parent',
    origin: {
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
    },
    modified: {
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
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'sub3.2',
                op: 'mount',
                parentId: 'qwe1',
                sortOrder: 1
            }]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 1, items: [{
                id: 'sub3.2',
                fields: [ ]
            }]},
        }
    }
}, {
    name: 'item shapeProps change',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {strokeColor: '#fff'} },
            { id: 'qwe2', name: 'item2', area: defaultArea },
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1', shape: 'rect', area: defaultArea, shapeProps: {strokeColor: '#000'} },
            { id: 'qwe2', name: 'item2' , area: defaultArea},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
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
    },
    stats: {
        "document": { "fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 1, "items": [{"fields": ["shapeProps.strokeColor"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'textSlot change',
    origin: {
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
            } },
            { id: 'qwe2', name: 'item2' },
        ]
    },
    modified: {
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
            } },
            { id: 'qwe2', name: 'item2' },
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['textSlots'],
                    op: 'patch-map',
                    changes: [{
                        id: 'body',
                        op: 'modify',
                        changes: [{
                            path: ['text'],
                            op: 'patch-text',
                            patch: {
                                delete: [[0, 4]],
                                add: [[0, 'G'], [2, 'odbye']]
                            }
                        }, {
                            path: ['valign'],
                            op: 'replace',
                            value: 'top'
                        }, {
                            path: ['fontSize'],
                            op: 'replace',
                            value: 16
                        }]
                    }]
                }],
            }]
        }],
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 3, "items": [{"fields": ["textSlots.body.text", "textSlots.body.valign", "textSlots.body.fontSize"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'item tags changes',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1', tags: ['a', 'b', 'c', 'd']},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1', tags: ['a', 'c', 'd', 'g', 'e']},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['tags'],
                    op: 'patch-set',
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
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 1, "items": [{"fields": ["tags"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'behavior events addition, deletion, reorder and modification',
    origin: {
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
    },
    modified: {
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
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [ {
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['behavior', 'events'],
                    op: 'patch-id-array',
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
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 4, "items": [{"fields": ["behavior.events.e1", "behavior.events.e3", "behavior.events.e5", "behavior.events.e4.event"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'behavior actions addition, deletion, reorder and modification',
    origin: {
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
    },
    modified: {
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
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [ {
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['behavior', 'events'],
                    op: 'patch-id-array',
                    changes: [ {
                        id: 'e1',
                        op: 'modify',
                        changes: [{
                            path: ['actions'],
                            op: 'patch-id-array',
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
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 5, "items": [{"fields": ["behavior.events.e1.actions.a3", "behavior.events.e1.actions.a2", "behavior.events.e1.actions.a5", "behavior.events.e1.actions.a4.element", "behavior.events.e1.actions.a4.args.value"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'item links addition, deletion, reorder and modification',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1', links: [
                { id: 'l1', title: 'Link 1', url: 'http://link-1', type: 'default' },
                { id: 'l2', title: 'Link 2', url: 'http://link-2', type: 'default' },
                { id: 'l3', title: 'Link 3', url: 'http://link-3', type: 'default' },
                { id: 'l4', title: 'Link 4', url: 'http://link-4', type: 'default' },
            ]},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1', links: [
                { id: 'l1', title: 'Link 1', url: 'http://link-1', type: 'default' },
                { id: 'l4', title: 'Link 4', url: 'http://link-4', type: 'default' },
                { id: 'l3', title: 'Link 3 edited', url: 'http://link-3-edited', type: 'logs' },
                { id: 'l5', title: 'Link 5', url: 'http://link-5', type: 'default' },
            ]},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [ {
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['links'],
                    op: 'patch-id-array',
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
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 6, "items": [{"fields": ["links.l2", "links.l4", "links.l5", "links.l3.title", "links.l3.url", "links.l3.type"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'item effects addition, deletion, reorder and modification',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1', effects: [
                { id: 'e1', effect: 'drop-shadow', name: 'Drop shadow 1', args: {color: 'red', dx: 4, dy: 5, blur: 10, opacity: 50, inside: false} },
                { id: 'e2', effect: 'glow', name: 'Glow', args: {color: 'red', blur: 10, opacity: 50} },
                { id: 'e3', effect: 'drop-shadow', name: 'Drop shadow 3', args: {color: 'red', dx: 4, dy: 5, blur: 10, opacity: 50, inside: false} },
                { id: 'e4', effect: 'drop-shadow', name: 'Drop shadow 4', args: {color: 'red', dx: 4, dy: 5, blur: 10, opacity: 50, inside: false} },
            ]},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1', effects: [
                { id: 'e1', effect: 'drop-shadow', name: 'Drop shadow 1', args: {color: 'red', dx: 4, dy: 5, blur: 10, opacity: 50, inside: false} },
                { id: 'e4', effect: 'drop-shadow', name: 'Drop shadow 4', args: {color: 'red', dx: 4, dy: 5, blur: 10, opacity: 50, inside: false} },
                { id: 'e3', effect: 'drop-shadow', name: 'Drop shadow 3 edited', args: {color: 'blue', dx: -4, dy: 5, blur: 10, opacity: 50, inside: true} },
                { id: 'e5', effect: 'blur', name: 'Blur', args: { size: 50} },
            ]},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [ {
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['effects'],
                    op: 'patch-id-array',
                    changes: [ {
                        id: 'e2',
                        op: 'delete',
                    }, {
                        id: 'e4',
                        op: 'reorder',
                        sortOrder: 1
                    }, {
                        id: 'e5',
                        op: 'add',
                        sortOrder: 3,
                        value: { id: 'e5', effect: 'blur', name: 'Blur', args: { size: 50} }
                    }, {
                        id: 'e3',
                        op: 'modify',
                        changes: [{
                            path: ['name'],
                            op: 'patch-text',
                            patch: {delete: [], add: [[13, ' edited']]}
                        }, {
                            path: ['args', 'color'],
                            op: 'replace',
                            value: 'blue'
                        }, {
                            path: ['args', 'dx'],
                            op: 'replace',
                            value: -4
                        }, {
                            path: ['args', 'inside'],
                            op: 'replace',
                            value: true
                        }]
                    }]
                }]
            } ]
        }],
    },
    stats: {
        "document": {"fieldChanges": 0, "fields": []},
        "items": {
            "added": {"count": 0, "items": []},
            "deleted": {"count": 0, "items": []},
            "modified": {"count": 7, "items": [{"fields": ["effects.e2", "effects.e4", "effects.e5", "effects.e3.name", "effects.e3.args.color", "effects.e3.args.dx", "effects.e3.args.inside"], "id": "qwe1"}]}
        }
    }
}, {
    name: 'item description string patch',
    origin: {
        items: [
            { id: 'qwe1', description: 'Hello world!'},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', description: 'Hi my world'},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['description'],
                    op: 'patch-text',
                    patch: {
                        delete: [[1, 4], [11, 1]],
                        add: [[1, 'i'], [3, 'my ']]
                    }
                }]
            }]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 1, items: [{
                id: 'qwe1',
                fields: [
                    'description'
                ]
            }]},
        }
    }
}, {
    name: 'adding new item with children',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1'},
            { id: 'qwe2', name: 'item2', childItems: [
                { id: 'sub2.1', name: 'sub2.1' },
                { id: 'sub2.2', name: 'sub2.2', childItems: [
                    { id: 'sub2.2.1', name: 'sub2.2.1' },
                ] },
            ]},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'qwe2',
                op: 'add',
                parentId: null,
                sortOrder: 1,
                value: {id: 'qwe2', name: 'item2'}
            }, {
                id: 'sub2.1',
                op: 'add',
                parentId: 'qwe2',
                sortOrder: 0,
                value: {id: 'sub2.1', name: 'sub2.1'}
            }, {
                id: 'sub2.2',
                op: 'add',
                parentId: 'qwe2',
                sortOrder: 1,
                value: {id: 'sub2.2', name: 'sub2.2'}
            }, {
                id: 'sub2.2.1',
                op: 'add',
                parentId: 'sub2.2',
                sortOrder: 0,
                value: {id: 'sub2.2.1', name: 'sub2.2.1'}
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 4, items: [
                'qwe2', 'sub2.1', 'sub2.2', 'sub2.2.1'
            ]},
            deleted: {count: 0, items: []},
            modified: {count: 0, items: []},
        }
    }
}, {
    name: 'adding new item to item without children',
    origin: {
        items: [
            { id: 'qwe1', name: 'item1'},
        ]
    },
    modified: {
        items: [
            { id: 'qwe1', name: 'item1', childItems: [
                {id: 'sub1.1', name: 'sub1.1'},
            ]},
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: ['items'],
            op: 'patch-id-array',
            changes: [{
                id: 'sub1.1',
                op: 'add',
                parentId: 'qwe1',
                sortOrder: 0,
                value: {id: 'sub1.1', name: 'sub1.1'}
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 1, items: [
                'sub1.1'
            ]},
            deleted: {count: 0, items: []},
            modified: {count: 0, items: []},
        }
    }
}, {
    name: 'conditional patching of shapeProps for path item',
    origin: {
        items: [ {
            shape: "path",
            shapeProps: {
                paths: [ {
                    id: "wj01kbt4X8",
                    closed: false,
                    points: [ {
                        t: "L",
                        x: 0,
                        y: 100
                    }, {
                        t: "L",
                        x: 60,
                        y: 0
                    }, {
                        t: "L",
                        x: 100,
                        y: 101
                    } ],
                    pos: "relative"
                } ],
                fill: {
                    type: "none"
                },
            },
            id: "NanyKSwPI"
        }, ]
    },
    modified: {
        items: [ {
            shape: "path",
            shapeProps: {
                paths: [ {
                    id: "wj01kbt4X8",
                    closed: true,
                    points: [ {
                        t: "L",
                        x: 0,
                        y: 100
                    }, {
                        t: "L",
                        x: 20,
                        y: 33.3
                    }, {
                        t: "L",
                        x: 60,
                        y: 0
                    }, {
                        t: "L",
                        x: 100,
                        y: 100
                    } ],
                    pos: "relative"
                } ],
                fill: {
                    type: "none"
                },
            },
            id: "NanyKSwPI"
        }, ]
    },
    patch: {
        version: "1",
        protocol: "schemio/patch",
        changes: [ {
            path: [ "items" ],
            op: "patch-id-array",
            changes: [ {
                id: "NanyKSwPI",
                op: "modify",
                changes: [ {
                    path: [ "shapeProps", "paths" ],
                    op: "patch-id-array",
                    changes: [ {
                        id: "wj01kbt4X8",
                        op: "modify",
                        changes: [ {
                            path: ['closed'],
                            op: 'replace',
                            value: true
                        }, {
                            path: [ "points" ],
                            op: "patch-array",
                            patch: {
                                delete: [ [2, 1]],
                                add: [
                                    [ 1,
                                        [ {
                                            t: "L",
                                            x: 20,
                                            y: 33.3
                                        } ]
                                    ],
                                    [ 3,
                                        [ {
                                            t: "L",
                                            x: 100,
                                            y: 100
                                        } ]
                                    ]
                                ]
                            }
                        } ]
                    } ]
                } ]
            } ]
        } ]
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: []},
            deleted: {count: 0, items: []},
            modified: {count: 2, items: [{
                id: 'NanyKSwPI',
                fields: [
                    'shapeProps.paths.wj01kbt4X8.closed',
                    'shapeProps.paths.wj01kbt4X8.points'
                ]
            }]},
        }
    }
}, {
    name: 'patching frame player',
    origin: {
        items: [ {
            shape: "frame_player",
            shapeProps: {
                totalFrames: 5,
                fps: 1,
                fillColor: "rgba(220, 220, 220, 1.0)",
                hoverFillColor: "rgba(190, 190, 190, 1.0)",
                strokeColor: "rgba(30,30,30,1.0)",
                animations: [ {
                    kind: "function",
                    id: "5Vv41hELi",
                    property: "distance",
                    frames: [ {
                        frame: 1,
                        kind: "linear",
                        value: 0
                    }, {
                        frame: 5,
                        kind: "linear",
                        value: 100
                    } ]
                } ],
                functions: {
                    "5Vv41hELi": {
                        functionId: "moveAlongPath",
                        args: {
                            item: "#XSNfyTgGc",
                            path: "#32yLBPYak",
                            rotateItem: true,
                            rotationOffset: 45
                        }
                    }
                },
                sections: [ {
                    frame: 1,
                    value: "start",
                    kind: "step"
                } ]
            },
            id: "F1M_g-8-n"
        } ]
    },
    modified: {
        items: [ {
            shape: "frame_player",
            shapeProps: {
                totalFrames: 5,
                fps: 1,
                fillColor: "rgba(220, 220, 220, 1.0)",
                hoverFillColor: "rgba(190, 190, 190, 1.0)",
                strokeColor: "rgba(30,30,30,1.0)",
                animations: [ {
                    kind: "function",
                    id: "5Vv41hELi",
                    property: "distance",
                    frames: [ {
                        frame: 1,
                        kind: "linear",
                        value: 0
                    }, {
                        frame: 5,
                        kind: "linear",
                        value: 100
                    } ]
                } ],
                functions: {
                    "5Vv41hELi": {
                        functionId: "moveAlongPath",
                        args: {
                            item: "#XSNfyTgGc",
                            path: "#32yLBPYak",
                            rotateItem: false,
                            rotationOffset: 40
                        }
                    }
                },
                sections: [ {
                    frame: 1,
                    value: "start",
                    kind: "step"
                }, {
                    frame: 3,
                    value: "stop",
                    kind: "step"
                } ]
            },
            id: "F1M_g-8-n"
        }
        ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: [ "items" ],
            op: "patch-id-array",
            changes: [ {
                id: "F1M_g-8-n",
                op: "modify",
                changes: [
                  {
                    path: [ "shapeProps", "functions" ],
                    op: "patch-map",
                    changes: [ {
                        id: "5Vv41hELi",
                        op: "modify",
                        changes: [ {
                            path: [ "args", "rotateItem" ],
                            op: "replace",
                            value: false
                          }, {
                            path: [ "args", "rotationOffset" ],
                            op: "replace",
                            value: 40
                        } ]
                    } ]
                }, {
                    path: [ "shapeProps", "sections" ],
                    op: "patch-array",
                    patch: {
                        delete: [ ],
                        add: [ [
                            1,
                            [ {
                                frame: 3,
                                value: "stop",
                                kind: "step"
                            } ]
                        ] ]
                    }
                } ]
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: [ ]},
            deleted: {count: 0, items: []},
            modified: {count: 3, items: [{
                id: 'F1M_g-8-n',
                fields: [
                    "shapeProps.functions.5Vv41hELi.args.rotateItem",
                    "shapeProps.functions.5Vv41hELi.args.rotationOffset",
                    "shapeProps.sections"
                ]
            }]},
        }
    }
}, {
    name: 'switching shapeProps and deleting old props',
    origin: {
        items: [ {
            shape: "frame_player",
            shapeProps: {
                totalFrames: 5,
                fps: 1,
                fillColor: "rgba(220, 220, 220, 1.0)",
                hoverFillColor: "rgba(190, 190, 190, 1.0)",
                strokeColor: "rgba(30,30,30,1.0)",
                animations: [ {
                    kind: "function",
                    id: "5Vv41hELi",
                    property: "distance",
                    frames: [ {
                        frame: 1,
                        kind: "linear",
                        value: 0
                    }  ]
                } ],
                functions: {
                    "5Vv41hELi": {
                        functionId: "moveAlongPath",
                        args: {
                            item: "#XSNfyTgGc",
                            path: "#32yLBPYak",
                            rotateItem: true,
                            rotationOffset: 45
                        }
                    }
                },
                sections: [ {
                    frame: 1,
                    value: "start",
                    kind: "step"
                } ]
            },
            id: "F1M_g-8-n"
        } ]
    },
    modified: {
        items: [ {
            shape: "rect",
            shapeProps: {
                fill          : {
                    color: 'rgba(220, 220, 220, 1.0)',
                    'type': 'solid'
                },
                strokeColor   : "rgba(30,30,30,1.0)",
            },
            id: "F1M_g-8-n"
        } ]
    },
    patch: {
        version: '1',
        protocol: 'schemio/patch',

        changes: [{
            path: [ "items" ],
            op: "patch-id-array",
            changes: [ {
                id: "F1M_g-8-n",
                op: "modify",
                changes: [ {
                    path: ["shape"], op: 'replace', value: 'rect'
                }, {
                    path: [ "shapeProps", "totalFrames" ], op: "delete",
                }, {
                    path: [ "shapeProps", "fps" ], op: "delete",
                }, {
                    path: [ "shapeProps", "fillColor" ], op: "delete",
                }, {
                    path: [ "shapeProps", "hoverFillColor" ], op: "delete",
                }, {
                    path: [ "shapeProps", "animations" ], op: "delete",
                }, {
                    path: [ "shapeProps", "functions" ], op: "delete",
                }, {
                    path: [ "shapeProps", "sections" ], op: "delete",
                }, {
                    path: ["shapeProps", "fill"], op: 'replace', value: {type: 'solid', color: 'rgba(220, 220, 220, 1.0)'}
                } ]
            } ]
        }],
    },
    stats: {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {count: 0, items: [ ]},
            deleted: {count: 0, items: []},
            modified: {count: 9, items: [{
                id: 'F1M_g-8-n',
                fields: [
                    "shape",
                    "shapeProps.totalFrames",
                    "shapeProps.fps",
                    "shapeProps.fillColor",
                    "shapeProps.hoverFillColor",
                    "shapeProps.animations",
                    "shapeProps.functions",
                    "shapeProps.sections",
                    "shapeProps.fill",
                ]
            }]},
        }
    }
}];