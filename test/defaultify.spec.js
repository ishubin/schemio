import { defaultifyObject } from '../src/defaultify.js';
import expect from 'expect';

describe('defaultifyObject', () => {
    it('should remove simple fields', () => {
        const obj           = { name: 'Rect', shape: 'rect', color: 'red' };
        const defaultObject = { name: '', color: 'red', background: 'blue' };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed field color as it matches in the defaultObject
        expect(result).toStrictEqual({ name: 'Rect', shape: 'rect' });
    });


    it('should remove nested fields', () => {
        const obj = {
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            }
        };
        const defaultObject = {
            fill: {
                type: 'color',
                color: 'blue'
            }
        };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed color in "fill" as it matches in the defaultObject
        expect(result).toStrictEqual({
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none'
            }
        });
    });
    

    it('should remove entire complex object if it completely matches', () => {
        const obj = {
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            },
            someField: {
                someNestedField: {
                    a: 'blah',
                    b: 23
                },
                c: false
            }
        };
        const defaultObject = {
            fill: {
                type: 'color',
            },
            someField: {
                someNestedField: {
                    a: 'blah',
                    b: 23
                },
                c: false
            }
        };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed "someField" as it completely matches
        expect(result).toStrictEqual({
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            }
        });
    });



    it('should also defaultify arrays', () => {
        const obj = {
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'rect 1',
                shape: 'rect',
                color: 'red'
            }, {
                name: 'label',
                shape: 'none',
                color: 'blue'
            }]
        };
        const defaultObject = {
            name: '',
            items: [{
                name: '',
                shape: 'none',
                color: 'blue'
            }]
        };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed field color as it matches in the defaultObject
        expect(result).toStrictEqual({
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'rect 1',
                shape: 'rect',
                color: 'red'
            }, {
                name: 'label',
            }]
        });
    });
});

