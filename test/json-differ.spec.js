import {jsonDiff} from '../src/ui/json-differ';
import expect from 'expect';


describe('jsonDiff', () => {
    const originObject = {
        company: {
            name: 'Abracadabra',
            size: 50,
            tags: ['tech', 'it', 'machinery']
        },
        people: [{
            name: 'John',
            age: 40
        }, {
            name: 'Lucy',
            age: 30
        }],
    };

    it('should detect changes to fields of the object', () => {
        const changedObject = {
            company: {
                name: 'Abracadabra CHANGED', // changed field
                size: 60, // changed field
                tags: ['tech', 'it', 'machinery']
            },
            people: [{
                name: 'John',
                age: 40
            }, {
                name: 'Lucy',
                age: 30
            }],
        };

        const diff = jsonDiff(originObject, changedObject);

        expect(diff).toStrictEqual({
            changes: [{
                path: ['company', 'name'],
                oldValue: 'Abracadabra',
                value: 'Abracadabra CHANGED'
            }, {
                path: ['company', 'size'],
                oldValue: 50,
                value: 60
            }]
        });
    });



    it('should detect changes inside arrays of objects', () => {
        const changedObject = {
            company: {
                name: 'Abracadabra',
                size: 50,
                tags: ['tech', 'it', 'machinery']
            },
            people: [{
                name: 'Johny', // changed field
                age: 40
            }, {
                name: 'Lucy',
                age: 30
            }],
        };

        const diff = jsonDiff(originObject, changedObject);

        expect(diff).toStrictEqual({
            changes: [{
                path: ['people', 0, 'name'],
                oldValue: 'John',
                value: 'Johny'
            }]
        });
    });


    it('should be able to control which fields to scan', () => {
        const changedObject = {
            company: {
                name: 'Abracadabra',
                size: 51, // changed field
                tags: ['tech', 'it', 'machinery']
            },
            people: [{
                name: 'Johny', // changed field
                age: 40
            }, {
                name: 'Lucy',
                age: 30
            }],
        };

        const diff = jsonDiff(originObject, changedObject, {
            fieldCheck(path) {
                return path.length > 0 && path[0] === 'company';
            }
        });

        expect(diff).toStrictEqual({
            changes: [{
                path: ['company', 'size'],
                oldValue:50,
                value: 51
            }]
        });

    });
});
