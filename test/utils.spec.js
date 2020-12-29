import utils from '../src/ui/utils.js';
import expect from 'expect';


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
            categoryId: 'rty',
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
            categoryId: 'rty',
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