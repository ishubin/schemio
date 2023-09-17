import expect from 'expect';
import { parseStringExpression } from '../../src/ui/templater/strings';
import { Scope } from '../../src/ui/templater/ast';


describe('templater string template', () => {
    it('should process string templates', () => {
        [
            ['simple template without interpolation', {}, 'simple template without interpolation'],
            ['basic template ${x}', {x: 4}, 'basic template 4'],
            ['basic template ${name}', {name: 'john'}, 'basic template john'],
            [
                'advanced ${x + 4 * (y - 1)} template ${name}${suffix}', {name: 'john', x: 7, y: 3, suffix: 'y'},
                'advanced 15 template johny'
            ],
        ]
        .forEach(([text, data, expected]) => {
            const expr = parseStringExpression(text);
            expect(expr.render(new Scope(data))).toBe(expected);
        })
    });
});
