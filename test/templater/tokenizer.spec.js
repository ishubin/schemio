
import expect from 'expect';
import { tokenizeExpression } from '../../src/ui/templater/tokenizer';


describe('template tokenizer', () => {
    it('should tokenize complex expressions', () => {
        const tokens = tokenizeExpression('2.4     + (3 * rnd() - 3 / 0.4 + x1)');

        expect(tokens).toStrictEqual([{
            t: 'number',
            v: 2.4
        }, {
            t: 'operator',
            v: '+'
        }, {
            t: 'start_bracket'
        }, {
            t: 'number',
            v: 3
        }, {
            t: 'operator',
            v: '*'
        }, {
            t: 'term',
            v: 'rnd'
        }, {
            t: 'start_bracket'
        }, {
            t: 'end_bracket'
        }, {
            t: 'operator',
            v: '-'
        }, {
            t: 'number',
            v: 3
        }, {
            t: 'operator',
            v: '/'
        }, {
            t: 'number',
            v: 0.4
        }, {
            t: 'operator',
            v: '+'
        }, {
            t: 'term',
            v: 'x1'
        }, {
            t: 'end_bracket'
        }]);
    });
});
