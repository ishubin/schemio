
import expect from 'expect';
import { tokenizeExpression } from '../../src/ui/templater/tokenizer';


describe('template tokenizer', () => {
    it('should tokenize complex expressions', () => {
        const tokens = tokenizeExpression('x = 2.4     + (3 * rnd() - 3 / 0.4 + x1) == "some * \\" - string" + "23"');

        expect(tokens).toStrictEqual([{
            t: 'term',
            v: 'x',
            text: 'x'
        }, {
            t: 'operator',
            v: '=',
            text: '='
        }, {
            t: 'number',
            v: 2.4,
            text: '2.4'
        }, {
            t: 'operator',
            v: '+',
            text: '+'
        }, {
            t: 'start_bracket',
            text: '('
        }, {
            t: 'number',
            v: 3,
            text: '3'
        }, {
            t: 'operator',
            v: '*',
            text: '*'
        }, {
            t: 'term',
            v: 'rnd',
            text: 'rnd'
        }, {
            t: 'start_bracket',
            text: '('
        }, {
            t: 'end_bracket',
            text: ')'
        }, {
            t: 'operator',
            v: '-',
            text: '-'
        }, {
            t: 'number',
            v: 3,
            text: '3'
        }, {
            t: 'operator',
            v: '/',
            text: '/'
        }, {
            t: 'number',
            v: 0.4,
            text: '0.4'
        }, {
            t: 'operator',
            v: '+',
            text: '+'
        }, {
            t: 'term',
            v: 'x1',
            text: 'x1'
        }, {
            t: 'end_bracket',
            text: ')'
        }, {
            t: 'operator',
            v: '==',
            text: '=='
        }, {
            t: 'string',
            v: "some * \" - string",
            text: "some * \" - string"
        }, {
            t: 'operator',
            v: '+',
            text: '+'
        }, {
            t: 'string',
            v: '23',
            text: '23'
        }]);
    });
});
