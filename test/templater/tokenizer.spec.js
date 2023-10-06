
import expect from 'expect';
import { tokenizeExpression } from '../../src/ui/templater/tokenizer';
import { TokenTypes } from '../../src/ui/templater/tokenizer';


describe('template tokenizer', () => {
    it('should tokenize complex expressions', () => {
        const tokens = tokenizeExpression('x = 2.4     + (3 * rnd() - 3 / 0.4 + x1) == "some * \\" - string" \n+ "23"');

        expect(tokens).toStrictEqual([{
            idx: 0,
            line: 0,
            t: TokenTypes.TERM,
            v: 'x',
            text: 'x'
        }, {
            idx: 2,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '=',
            text: '='
        }, {
            idx: 4,
            line: 0,
            t: TokenTypes.NUMBER,
            v: 2.4,
            text: '2.4'
        }, {
            idx: 12,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '+',
            text: '+'
        }, {
            idx: 14,
            line: 0,
            t: TokenTypes.START_BRACKET,
            text: '('
        }, {
            idx: 15,
            line: 0,
            t: TokenTypes.NUMBER,
            v: 3,
            text: '3'
        }, {
            idx: 17,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '*',
            text: '*'
        }, {
            idx: 19,
            line: 0,
            t: TokenTypes.TERM,
            v: 'rnd',
            text: 'rnd'
        }, {
            idx: 22,
            line: 0,
            t: TokenTypes.START_BRACKET,
            text: '('
        }, {
            idx: 23,
            line: 0,
            t: TokenTypes.END_BRACKET,
            text: ')'
        }, {
            idx: 25,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '-',
            text: '-'
        }, {
            idx: 27,
            line: 0,
            t: TokenTypes.NUMBER,
            v: 3,
            text: '3'
        }, {
            idx: 29,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '/',
            text: '/'
        }, {
            idx: 31,
            line: 0,
            t: TokenTypes.NUMBER,
            v: 0.4,
            text: '0.4'
        }, {
            idx: 35,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '+',
            text: '+'
        }, {
            idx: 37,
            line: 0,
            t: TokenTypes.TERM,
            v: 'x1',
            text: 'x1'
        }, {
            idx: 39,
            line: 0,
            t: TokenTypes.END_BRACKET,
            text: ')'
        }, {
            idx: 41,
            line: 0,
            t: TokenTypes.OPERATOR,
            v: '==',
            text: '=='
        }, {
            idx: 45,
            line: 0,
            t: TokenTypes.STRING,
            v: "some * \" - string",
            text: "some * \" - string"
        }, {
            idx: 65,
            line: 0,
            t: TokenTypes.NEWLINE,
            text: ''
        }, {
            idx: 66,
            line: 1,
            t: TokenTypes.OPERATOR,
            v: '+',
            text: '+'
        }, {
            idx: 69,
            line: 1,
            t: TokenTypes.STRING,
            v: '23',
            text: '23'
        }]);
    });
});
