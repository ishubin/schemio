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

const $ = {
    item(item) {
        return defaultifyItem(item);
    },

    doc(doc) {
        return defaultifyScheme(doc);
    }
};

describe('SpatialPatch', () => {
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
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe1', name: 'item1-changed' }),
                $.item({ id: 'qwe2', name: 'item2' })]
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
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3' })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe3', name: 'item3' }),
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' })]
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
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3' })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe3', name: 'item3' })]
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
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3' })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe2.5', name: 'item2.5' }),
                $.item({ id: 'qwe3', name: 'item3' })]
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
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3' }),
                $.item({ id: 'qwe4', name: 'item4' })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe1', name: 'item1' }),
                $.item({ id: 'qwe5', name: 'item5' }),
                $.item({ id: 'qwe4', name: 'item4' }),
                $.item({ id: 'qwe3', name: 'item3' })]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            doc: [],
            items: [{
                id: 'qwe2',
                op: 'delete'
            },{
                id: 'qwe5',
                op: 'add',
                parentId: null,
                sortOrder: 1,
                item: {
                    id: 'qwe5',
                    name: 'item5'
                }
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
                $.item({ id: 'qwe1', name: 'item1',
                    childItems: [
                        $.item({id: 'sub1.1', name: 'sub1.1'}),
                        $.item({id: 'sub1.2', name: 'sub1.2'}),
                        $.item({id: 'sub1.3', name: 'sub1.3'}),
                    ]
                }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3',
                    childItems: [
                        $.item({id: 'sub3.1', name: 'sub3.1'}),
                        $.item({id: 'sub3.2', name: 'sub3.2'}),
                        $.item({id: 'sub3.3', name: 'sub3.3'}),
                    ]
                })]
        }), $.doc({
            items: [
                $.item({ id: 'qwe1', name: 'item1',
                    childItems: [
                        $.item({id: 'sub1.1', name: 'sub1.1'}),
                        $.item({id: 'sub3.2', name: 'sub3.2'}),
                        $.item({id: 'sub1.2', name: 'sub1.2'}),
                        $.item({id: 'sub1.3', name: 'sub1.3'}),
                    ]
                }),
                $.item({ id: 'qwe2', name: 'item2' }),
                $.item({ id: 'qwe3', name: 'item3',
                    childItems: [
                        $.item({id: 'sub3.1', name: 'sub3.1'}),
                        $.item({id: 'sub3.3', name: 'sub3.3'}),
                    ]
                })]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            doc: [],
            items: []
        });
    });



    //TODO test case for remounting from item to another. This might screw up current implementation of algorithm as it will not register it as deletion and addition



    //TODO test cases for textSlot modifications
    //TODO test cases for shape change
    //TODO test cases for shapeProps change

});