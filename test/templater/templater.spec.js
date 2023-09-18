import expect from 'expect';
import { processJSONTemplate } from '../../src/ui/templater/templater';



describe('templater', () => {
    it('should process expressions in json template', () => {
        const result = processJSONTemplate({
            items: [{
                area: {
                    x: {'$-expr': 'x + 10 * y'},
                    y: {'$-expr': '-y'}
                }
            }, {
                area: {
                    x: 1, y: 5
                }
            }]
        }, {x: 3, y: 10});

        expect(result).toStrictEqual({
            items: [{
                area: {x: 103, y: -10}
            }, {
                area: {x: 1, y: 5}
            }]
        })
    });

    it('should process string expressions in json template', () => {
        const result = processJSONTemplate({
            items: [{
                name: {'$-str': 'id: ${id * 1000}, name: ${name}'}
            }, {
                name: 'item 2'
            }]
        }, {id: 2, name: 'john'});

        expect(result).toStrictEqual({
            items: [{
                name: 'id: 2000, name: john'
            }, {
                name: 'item 2'
            }]
        })
    });


    it('should process conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': "animation == 'simple' || animation == 'scaled'"
            }, {
                name: '3'
            }]
        };

        [
            [{animation: 'simple'}, '1,2,3'],
            [{animation: 'scaled'}, '1,2,3'],
            [{animation: 'other'}, '1,3'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process $-else conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': "animation == 'simple' || animation == 'scaled'"
            }, {
                name: '2_',
                '$-else': ''
            }]
        };

        [
            [{animation: 'simple'}, '1,2'],
            [{animation: 'scaled'}, '1,2'],
            [{animation: 'other'}, '1,2_'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process $-else-if conditions in array', () => {
        const template = {
            items: [{
                name: '1'
            }, {
                name: '2',
                '$-if': 'animation == "simple" || animation == "scaled"'
            }, {
                name: '2_',
                '$-else-if': 'pos == "centered"'
            }, {
                name: '_2',
                '$-else': '',
            }]
        };

        [
            [{animation: 'simple', pos: 'centered'}, '1,2'],
            [{animation: 'scaled', pos: 'centered'}, '1,2'],
            [{animation: 'other', pos: 'centered'}, '1,2_'],
            [{animation: 'other', pos: 'stretched'}, '1,_2'],
        ]
        .forEach(([data, expectedNames]) => {
            const result = processJSONTemplate(template, data);
            expect(result.items.map(x => x.name).join(',')).toBe(expectedNames);
        });
    });

    it('should process for loops in array', () => {
        const template = {
            items: [{
                name: 'a'
            }, {
                '$-for': {start: -1, until: {'$-expr': 'num'}, step: 1, it: 'x'},
                name: 'f',
                x: {'$-expr': 'x * 2 + margin'}
            }, {
                name: 'b'
            }]
        }

        expect(processJSONTemplate(template, {num: 3, margin: 100})).toStrictEqual({
            items: [{
                name: 'a'
            }, {
                name: 'f', x: 98
            }, {
                name: 'f', x: 100
            }, {
                name: 'f', x: 102
            }, {
                name: 'f', x: 104
            }, {
                name: 'b'
            }]
        });
    });


    it('should run expressions in eval with assigning values to new variables', () => {
        const template = {
            '$-eval': ['x = 45', 'y = 3'],
            items: [{
                name: {'$-str': 'name: ${x}'}
            }, {
                name: {'$-str': 'name: ${y}'}
            }]
        };

        expect(processJSONTemplate(template, {y: 6})).toStrictEqual({
            items: [{
                name: 'name: 45'
            }, {
                name: 'name: 3'
            }]
        });
    });
});
