import expect from 'expect';
import { parseAST } from '../../src/ui/templater/ast';
import { tokenizeExpression } from '../../src/ui/templater/tokenizer';


describe('templater ast parser', () => {
    it('should parse various expressions', () => {
        [
            ['2-5 + qwe', '((2 - 5) + qwe)'],
            ['2 * 8 + 1 - 4 *4 ', '(((2 * 8) + 1) - (4 * 4))'],
            ['1 + (x - 4) * 3', '(1 + ((x - 4) * 3))'],
        ].forEach(([input, expected]) => {
            const real = parseAST(tokenizeExpression(input)).print();
            expect(real).toBe(expected)
        });
    });
});
