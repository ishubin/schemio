import { generateSchemePatch } from '../src/ui/scheme/SchemePatch'
import utils from '../src/ui/utils';
import expect from 'expect';
import { defaultifyItem } from '../src/ui/scheme/Item';
import { defaultifyScheme } from '../src/ui/scheme/Scheme';

const defaultScheme = {
    name: '',
    description: '',
    tags: [],
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

const $ = {
    doc(doc) {
        return defaultifyScheme(doc);
    }
};

describe('SchemePatch', () => {
    it('should regonize doc field changes', () => {
        
        const modifiedScheme = utils.clone(defaultScheme);
        modifiedScheme.name = 'qwe';
        modifiedScheme.settings.screen.draggable = false;
        modifiedScheme.style.boundaryBoxColor = '#fff';

        const patch = generateSchemePatch(defaultScheme, modifiedScheme);
        
        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            doc: [{
                path: ['name'],
                replace: 'qwe'
            }, {
                path: ['settings', 'screen', 'draggable'],
                replace: false
            }, {
                path: ['style', 'boundaryBoxColor'],
                replace: '#fff'
            }],
            items: []
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

            doc: [],
            items: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['name'],
                    replace: 'item1-changed'
                }]
            } ]
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

            doc: [],
            items: [{
                id: 'qwe3',
                op: 'remount',
                parentId: null,
                sortOrder: 0
            } ]
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

            doc: [],
            items: [{
                id: 'qwe2',
                op: 'delete',
            } ]
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

            doc: [],
            items: [{
                id: 'qwe2.5',
                op: 'add',
                parentId: null,
                sortOrder: 2,
                item: {
                    id: 'qwe2.5',
                    name: 'item2.5'
                }
            } ]
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

            doc: [],
            items: [{
                id: 'qwe5',
                op: 'add',
                parentId: null,
                sortOrder: 1,
                item: {
                    id: 'qwe5',
                    name: 'item5'
                }
            }, {
                id: 'qwe2',
                op: 'delete'
            },{
                id: 'qwe4',
                op: 'remount',
                parentId: null,
                sortOrder: 2
            } ]
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

            doc: [],
            items: [{
                id: 'sub3.2',
                op: 'mount',
                parentId: 'qwe1',
                sortOrder: 1
            }, {
                id: 'sub3.2',
                op: 'demount',
                parentId: 'qwe3'
            }]
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

            doc: [],
            items: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['shapeProps', 'strokeColor'],
                    replace: '#000'
                }]
            }]
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

            doc: [],
            items: [{
                id: 'qwe1',
                op: 'modify',
                changes: [{
                    path: ['textSlots', 'body', 'text'],
                    replace: 'Goodbye world!'
                }, {
                    path: ['textSlots', 'body', 'valign'],
                    replace: 'top'
                }, {
                    path: ['textSlots', 'body', 'fontSize'],
                    replace: 16
                }]
            }]
        });
    });


    //TODO test cases for shapeProps change


    //TODO test cases for textSlot modifications
    //TODO test cases for shape change
    
    //TODO test case for tags
    //TODO test case for behavior events

});