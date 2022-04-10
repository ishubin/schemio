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
            items: {
                changes: []
            }
        })
    });


    it('should recognize item field changes', () => {
        const patch = generateSchemePatch($.doc({
            items: [$.item({
                id: 'qwe1',
                name: 'item1'
            }), $.item({
                id: 'qwe2',
                name: 'item2'
            })]
        }), $.doc({
            items: [$.item({
                id: 'qwe1',
                name: 'item1-changed'
            }), $.item({
                id: 'qwe2',
                name: 'item2'
            })]
        }));

        expect(patch).toStrictEqual({
            version: '1',
            protocol: 'schemio/patch',

            doc: [],
            items: {
                changes: [{
                    id: 'qwe1',
                    fields: [{
                        path: ['name'],
                        replace: 'item1-changed'
                    }]
                } ]
            }
        });
    });
});