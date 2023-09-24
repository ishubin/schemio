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
            ['x + "qwe" == \'hi qwe\'', '((x + "qwe") == "hi qwe")'],
        ].forEach(([input, expected]) => {
            const real = parseAST(tokenizeExpression(input)).print();
            expect(real).toBe(expected);
        });
    });

    it('should parse functions', () => {
        [
            ['x + cos(0.2)', '(x + cos(0.2))'],
            ['x + max(0.2, y)', '(x + max(0.2, y))'],
            ['x + cos(0.2) + max(1, y + 2)', '((x + cos(0.2)) + max(1, (y + 2)))'],
        ].forEach(([input, expected]) => {
            const real = parseAST(tokenizeExpression(input)).print();
            expect(real).toBe(expected);
        });
    });


    it('should evaluate functions', () => {
        [
            ['x + pow(y + 1, 3)', {x: 7, y: 2}, 34],
            ['min(x, 3) + max(y, 7)', {x: 7, y: 2}, 10],
            ['min(x, 3) + max(y, 7)', {x: 2, y: 10}, 12],
        ].forEach(([input, data, expected]) => {
            const ast = parseAST(tokenizeExpression(input));
            const result = ast.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });
    });


    it('should assign variable using = operator', () => {
        const scope = new Scope({x: 2});
        const ast = parseAST(tokenizeExpression('newVar = abs(x - 10) + 6'));
        ast.evalNode(scope);
        expect(scope.get('newVar')).toBe(14);
    });

    it('should parse and evaluate boolean expressions', () => {
        [
            ['2-5 + x > y - 1', {x: 2, y: 4}, false],
            ['2-5 + x > y - 1', {x: 2, y: -5}, true],
            ['"user: " + x == "user: john" ', {x: 'john'}, true],
            ['"user: " + x == "user: john" ', {x: 'sara'}, false],
            ['"user: " + x != "user: sara" ', {x: 'john'}, true],
            ['"user: " + x != "user: sara" ', {x: 'sara'}, false],
            ['!("user: " + x == "user: sara")', {x: 'john'}, true],
            ['!("user: " + x == "user: sara")', {x: 'sara'}, false],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'simple'}, true],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'scaled'}, true],
            ["animation == 'simple' || animation == 'scaled'", {animation: 'rotate'}, false]
        ].forEach(([input, data, expected]) => {
            const ast = parseAST(tokenizeExpression(input));
            const result = ast.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });
    });

    it('should allow to get properties of objects using dot operator', () => {
        const scope = new Scope({someObj: {area: {x: 1, y: 2}, name: 'some object'}});
        expect(parseAST(tokenizeExpression('someObj.area.x')).evalNode(scope)).toBe(1);
        expect(parseAST(tokenizeExpression('someObj.area.y')).evalNode(scope)).toBe(2);
        expect(parseAST(tokenizeExpression('someObj.area')).evalNode(scope)).toStrictEqual({x: 1, y: 2});
        expect(parseAST(tokenizeExpression('someObj.name')).evalNode(scope)).toBe('some object');
        expect(parseAST(tokenizeExpression('someObj.area.x + someObj.area.y')).evalNode(scope)).toBe(3);
        expect(parseAST(tokenizeExpression('someObj.area.x + ifcond(someObj.area.y > 3, 10, 100)')).evalNode(scope)).toBe(101);
        expect(parseAST(tokenizeExpression('someObj.area.x + ifcond(someObj.area.y < 3, 10, 100)')).evalNode(scope)).toBe(11);
    });

    it('should allow to execute multiple expressions separated by semicolon', () => {
        const scope = new Scope({
            setVar(name, value) {
                scope.set(name, value);
            }
        });
        parseAST(tokenizeExpression('x = 4; y = x + 10; setVar("z", y + 2 * x);')).evalNode(scope);
        expect(scope.get('x')).toBe(4);
        expect(scope.get('y')).toBe(14);
        expect(scope.get('z')).toBe(22);
    });
});
