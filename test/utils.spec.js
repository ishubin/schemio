import utils from '../src/ui/utils.js';
import expect from 'expect';
import forEach from 'lodash/forEach';


describe('Utils.getOpbjectProperty', () => {
    const obj = {
        name: 'John',

        data: {
            age: 13
        },

        someArray: [1, 2, 3]
    };
    it('should return undefined if object is undefined or null', () => {
        expect(utils.getObjectProperty(null, 'abc')).toBeUndefined();
        expect(utils.getObjectProperty(undefined, 'abc')).toBeUndefined();
    });

    it('should return undefined of non-existing property', () => {
        expect(utils.getObjectProperty(obj, 'surname')).toBeUndefined();
    });

    it('should return value of first level property', () => {
        expect(utils.getObjectProperty(obj, 'name')).toBe('John');
        expect(utils.getObjectProperty(obj, 'data')).toStrictEqual({age: 13});
    });

    it('should return value of second level property', () => {
        expect(utils.getObjectProperty(obj, 'data.age')).toBe(13);
    });

    it('should return undefined in case there is not an object in a path', () => {
        expect(utils.getObjectProperty(obj, 'data.array.length')).toBeUndefined();
    });
});


describe('Utils.sanitizeScheme', () => {
    it('should remove meta objects from all items and sub-items', () => {
        const scheme = {
            id: '123',
            name: 'some scheme',
            description: 'some description',
            tags: ['a', 'b'],
            modifiedTime: '2020-12-29T09:08:34.443Z',
            style: {},
            someUnknownField: {},
            items: [{
                id: 'qwe',
                name: 'parent item',
                meta: {blah: 123},
                childItems: [{
                    id: 'asd',
                    name: 'child item',
                    meta: {asdasd: 'qwqrqrwr'}
                }]
            }]
        }

        expect(utils.sanitizeScheme(scheme)).toStrictEqual({
            id: '123',
            name: 'some scheme',
            description: 'some description',
            tags: ['a', 'b'],
            modifiedTime: '2020-12-29T09:08:34.443Z',
            style: {},
            items: [{
                id: 'qwe',
                name: 'parent item',
                childItems: [{
                    id: 'asd',
                    name: 'child item'
                }]
            }]
        });
    });
});

describe('Utils.equals', () => {
    forEach([{
        name: 'floating values should be equal', a: 2.3, b: 2.3, expected: true
    }, {
        name: 'floating values should not be equal', a: 2.3, b: 2.30001, expected: false
    }, {
        name: 'string values should be equal', a: 'abc', b: 'abc', expected: true
    }, {
        name: 'string values should not be equal', a: 'abcd', b: 'abc', expected: false
    }, {
        name: 'array values should be equal', a: ['a', 2.3], b: ['a', 2.3], expected: true
    }, {
        name: 'array values with different length should not be equal', a: ['a', 2.3], b: ['a', 2.3, 0], expected: false
    }, {
        name: 'array values with different values inside should not be equal', a: ['a', 2.301], b: ['a', 2.3], expected: false
    }, {
        name: 'objects should be equal', a: {user: {name: 'Patrick', age: 30}}, b: {user: {name: 'Patrick', age: 30}}, expected: true
    }, {
        name: 'objects should not be equal', a: {user: {name: 'Patrick', age: 30}}, b: {user: {name: 'Patrick', age: 31}}, expected: false
    }, {
        name: 'objects with extra key on the left should not be equal', a: {user: {name: 'Patrick', age: 30, surname: 'Conor'}}, b: {user: {name: 'Patrick', age: 30}}, expected: false
    }, {
        name: 'objects with extra key on the right should not be equal', a: {user: {name: 'Patrick', age: 30}}, b: {user: {name: 'Patrick', age: 30, surname: 'Conor'}}, expected: false
    }, {
        name: 'objects with arrays should be equal', a: {user: {name: 'Patrick', age: 30, labels: ['admin', 'dev']}}, b: {user: {name: 'Patrick', labels: ['admin', 'dev'], age: 30}}, expected: true
    }, {
        name: 'objects with arrays with different values should not be equal', a: {user: {name: 'Patrick', age: 30, labels: ['admin', 'developer']}}, b: {user: {name: 'Patrick', labels: ['admin', 'dev'], age: 30}}, expected: false
    }], testData => {
        it(`should test that: ${testData.name}`, () => {
            expect(utils.equals(testData.a, testData.b)).toBe(testData.expected);
        });
    })
})