import expect from 'expect';
import { Scope, parseAST } from '../../src/ui/templater/ast';
import { tokenizeExpression } from '../../src/ui/templater/tokenizer';


describe('templater ast parser', () => {
    it('should parse various expressions', () => {
        [
            ['2-5 + qwe', '((2 - 5) + qwe)'],
            ['2 * 8 + 1 - 4 *4 ', '(((2 * 8) + 1) - (4 * 4))'],
            ['1 + (x - 4) * 3', '(1 + ((x - 4) * 3))'],
            ['x < 5', '(x < 5)'],
            ['x + 1 < 5 - y', '((x + 1) < (5 - y))'],
            ['x + 1 < 5 - y || x > 10', '(((x + 1) < (5 - y)) || (x > 10))'],
            ['x + 1 < 5 - y && x > 10', '(((x + 1) < (5 - y)) && (x > 10))'],
            ['x + "qwe" == \'hi qwe\'', '((x + "qwe") == "hi qwe")']
        ].forEach(([input, expected]) => {
            const real = parseAST(tokenizeExpression(input)).print();
            expect(real).toBe(expected);
        });
    });


    it('should parse and evaluate boolean expressions', () => {
        [
            ['2-5 + x > y - 1', {x: 2, y: 4}, false],
            ['2-5 + x > y - 1', {x: 2, y: -5}, true],
            ['"user: " + x == "user: john" ', {x: 'john'}, true],
            ['"user: " + x == "user: john" ', {x: 'sara'}, false],
            ['"user: " + x != "user: sara" ', {x: 'john'}, true],
            ['"user: " + x != "user: sara" ', {x: 'sara'}, false],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'simple'}, true],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'scaled'}, true],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'rotate'}, false]
        ].forEach(([input, data, expected]) => {
            const ast = parseAST(tokenizeExpression(input));
            const result = ast.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });

    });
});
