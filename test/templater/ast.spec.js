import expect from 'expect';
import { Scope, parseExpression } from '../../src/ui/templater/ast';
import { Vector } from '../../src/ui/templater/vector';
import { List } from '../../src/ui/templater/list';



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
            ['x = (a = 1; b = 2; a + b); x*10', '((x = ((a = 1); (b = 2); (a + b))); (x * 10))']
        ].forEach(([input, expected]) => {
            const real = parseExpression(input).print();
            expect(real).toBe(expected);
        });
    });

    it('should parse functions', () => {
        [
            ['x + cos(0.2)', '(x + cos(0.2))'],
            ['x + max(0.2, y)', '(x + max(0.2, y))'],
            ['x + cos(0.2) + max(1, y + 2)', '((x + cos(0.2)) + max(1, (y + 2)))'],
        ].forEach(([input, expected]) => {
            const real = parseExpression(input).print();
            expect(real).toBe(expected);
        });
    });


    it('should evaluate functions and multi expressions', () => {
        [
            ['x + pow(y + 1, 3)', {x: 7, y: 2}, 34],
            ['min(x, 3) + max(y, 7)', {x: 7, y: 2}, 10],
            ['min(x, 3) + max(y, 7)', {x: 2, y: 10}, 12],
            ['x = (a = 1; b = 2; a + b); x*10', {}, 30],
            ['x = 3; x += 1; x', {}, 4],
            ['x = 3; x -= 1; x', {}, 2],
            ['x = 4; x *= 3; x', {}, 12],
            ['x = 12; x /= 3; x', {}, 4],
        ].forEach(([input, data, expected]) => {
            const ast = parseExpression(input);
            const result = ast.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });
    });


    it('should assign variable using = operator', () => {
        const scope = new Scope({x: 2});
        const ast = parseExpression('newVar = abs(x - 10) + 6');
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
            const ast = parseExpression(input);
            const result = ast.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });
    });

    it('should allow to get properties of objects using dot operator', () => {
        const scope = new Scope({someObj: {area: {x: 1, y: 2}, name: 'some object'}});
        expect(parseExpression('someObj.area.x').evalNode(scope)).toBe(1);
        expect(parseExpression('someObj.area.y').evalNode(scope)).toBe(2);
        expect(parseExpression('someObj.area').evalNode(scope)).toStrictEqual({x: 1, y: 2});
        expect(parseExpression('someObj.name').evalNode(scope)).toBe('some object');
        expect(parseExpression('someObj.area.x + someObj.area.y').evalNode(scope)).toBe(3);
        expect(parseExpression('someObj.area.x + ifcond(someObj.area.y > 3, 10, 100)').evalNode(scope)).toBe(101);
        expect(parseExpression('someObj.area.x + ifcond(someObj.area.y < 3, 10, 100)').evalNode(scope)).toBe(11);
    });

    it('should allow to get invoke function an an objects using dot operator', () => {
        const data = {
            someObj: {
                someField: {
                    pow: (a, b) => Math.pow(a, b)
                }
            }
        };
        const scope = new Scope(data);
        expect(parseExpression('someObj.someField.pow(3, 2)').evalNode(scope)).toBe(9);
    });


    it('should allow to execute multiple expressions separated by semicolon', () => {
        const scope = new Scope({
            setVar(name, value) {
                scope.set(name, value);
            }
        });
        parseExpression('x = 4; y = x + 10; setVar("z", y + 2 * x);').evalNode(scope);
        expect(scope.get('x')).toBe(4);
        expect(scope.get('y')).toBe(14);
        expect(scope.get('z')).toBe(22);
    });

    it('should allow to execute multiple expressions separated by newline', () => {
        [
            '\n\nx = 4\n\n\n y = x + 10\n setVar("z", y + 2 * x)\n\n',
            '\n\nx \n= \n\n4\n\n\n y = \nx +\n\n 10\n setVar (\n"z"\n, \ny + \n2 \n * x\n)\n\n',
        ].forEach((script, idx) => {
            let callCounter = 0;
            const scope = new Scope({
                setVar(name, value) {
                    scope.set(name, value);
                    callCounter++;
                }
            });
            try {
                const result = parseExpression(script).evalNode(scope);
                expect(scope.get('x')).toBe(4);
                expect(scope.get('y')).toBe(14);
                expect(scope.get('z')).toBe(22);
                expect(callCounter).toBe(1);
                expect(result).toBeUndefined();
            } catch(err) {
                console.error(`ERROR: test fail for #${idx}`);
                throw err;
            }
        });
    });


    it('should ignore comments', () => {
        [
            ['x = 3; x = x + 6;/* x = x + 100 */;x = x *2; x', 18],
            ['x = 3\nx = x + 6\n // x = x + 100\nx = x *2\n x', 18],
        ].forEach(([script, expected]) => {
            const result = parseExpression(script).evalNode(new Scope({}));
            expect(result).toBe(expected);
        })
    });


    it('should process string templates', () => {
        [
            ['`rgba(${r}, ${g}, ${b}, ${a})`', {r: 100, g: 50, b: 10, a: 0.9}, 'rgba(100, 50, 10, 0.9)'],
            ['`rgba(${getRed() + 5}, ${g}, ${b}, ${a})`', {getRed: () => 70, g: 50, b: 10, a: 1}, 'rgba(75, 50, 10, 1)'],
        ].forEach(([script, data, expected]) => {
            const result = parseExpression(script).evalNode(new Scope(data));
            expect(result).toBe(expected);
        })
    });


    it('should process if statements', () => {
        const script = `
        x = 5
        y = 3
        result = 1
        if (z > 0) {
            result = x + y
        }
        `;

        const expr = parseExpression(script);
        [
            [{z: 1}, 8],
            [{z: -1}, 1],
        ].forEach(([data, expected]) => {
            expr.evalNode(new Scope(data));
            expect(data.result).toBe(expected);
        });
    });


    it('should handle if statements as return values', () => {
        const script = `
        if (z > 0) {
            x = 5
            y = 3
            x + y
        } else {
            x = 2
            y = 6
            x * y
        }
        `;

        const expr = parseExpression(script);
        [
            [{z: 1}, 8],
            [{z: -1}, 12],
        ].forEach(([data, expected]) => {
            const result = expr.evalNode(new Scope(data));
            expect(result).toBe(expected);
        });
    });


    it('should process if statements with multiple else if blocks', () => {
        const script = `
        x = 5
        y = 3
        result = 1
        if (z == 0) {
            result = x + y
        } else if (z == 1) {
            result = x * y
        } else if (z == 2) {
            result = x - y
        } else {
            result = x + y * 2
        }
        `;

        const expr = parseExpression(script);
        [
            [{z: 0}, 8],
            [{z: 1}, 15],
            [{z: 2}, 2],
            [{z: -1}, 11],
        ].forEach(([data, expected]) => {
            expr.evalNode(new Scope(data));
            expect(data.result).toBe(expected);
        });
    });


    it('should make a new scope for true and false blocks in if statements', () => {
        const script = `
        result = if (x = 1; y = 2; z == x + y) {
            x = 3
            y = 4
            x * y
        } else {
            x = 5
            y = 6
            x + y
        }
        result
        `;
        const expr = parseExpression(script);
        [
            [{z: 3}, 12],
            [{z: 1}, 11],
        ].forEach(([data, expected]) => {
            const scope = new Scope(data);
            const result = expr.evalNode(scope);
            expect(result).toBe(expected);
            expect(scope.hasVar('x')).toBe(false);
            expect(scope.hasVar('y')).toBe(false);
            expect(scope.hasVar('result')).toBe(true);
        });
    });


    it ('should use if expression as term in one line', () => {
        const script = `
        x = z
        x = if (x < 100) { x + 1 } else { 0 }
        `;

        const expr = parseExpression(script);
        [
            [{z: 10}, 11],
            [{z: 99}, 100],
            [{z: 100}, 0],
            [{z: 110}, 0],
        ].forEach(([data, expected]) => {
            expr.evalNode(new Scope(data));
            expect(data.x).toBe(expected);
        });
    });

    it('should let assign values to child fields of object', () => {
        const script = `
            v = Vector(0, 0)
            v.y = 45
            result = v.y
        `;

        const expr = parseExpression(script);
        const data = {};
        expr.evalNode(new Scope(data));
        expect(data.result).toBe(45);
    });

    it('should perform math operations on vectors', () => {
        const script = `
            v1 = Vector(1, 2)
            v2 = Vector(4, 6)
            r1 = v1 * 3
            r2 = 4 * v1
            r3 = v1 + v2
            r4 = v1 - v2
            r5 = v1 + 2 * v2
            r6 = v1 + v2 * 2
            r7 = v1 * 2 + v2
            r8 = 2 * v1 + v2
            r9 = -v1
            r10 = v1 * v2
            r11 = v1.length()
            r12 = v1.normalized()

            r13 = Vector(2, 3)
            r13 += Vector(5, 6)

            r14 = Vector(5, 6)
            r14 -= Vector(1, 3)

            r15 = Vector(2, 3)
            r15 *= 3

            r16 = Vector(4, 6)
            r16 /= 2
        `;

        const expr = parseExpression(script);
        const data = {};
        expr.evalNode(new Scope(data));
        expect(data.r1.toString()).toBe('{x: 3, y: 6}');
        expect(data.r2.toString()).toBe('{x: 4, y: 8}');
        expect(data.r3.toString()).toBe('{x: 5, y: 8}');
        expect(data.r4.toString()).toBe('{x: -3, y: -4}');
        expect(data.r5.toString()).toBe('{x: 9, y: 14}');
        expect(data.r6.toString()).toBe('{x: 9, y: 14}');
        expect(data.r7.toString()).toBe('{x: 6, y: 10}');
        expect(data.r8.toString()).toBe('{x: 6, y: 10}');
        expect(data.r9.toString()).toBe('{x: -1, y: -2}');
        expect(data.r10).toBe(16);
        expect(data.r11).toBeCloseTo(Math.sqrt(5), 5);

        expect(data.r12).toBeInstanceOf(Vector);
        expect(data.r12.x).toBeCloseTo(1/Math.sqrt(5), 5);
        expect(data.r12.y).toBeCloseTo(2/Math.sqrt(5), 5);

        expect(data.r13).toBeInstanceOf(Vector);
        expect(data.r13.toString()).toBe('{x: 7, y: 9}');

        expect(data.r14).toBeInstanceOf(Vector);
        expect(data.r14.toString()).toBe('{x: 4, y: 3}');

        expect(data.r15).toBeInstanceOf(Vector);
        expect(data.r15.toString()).toBe('{x: 6, y: 9}');

        expect(data.r16).toBeInstanceOf(Vector);
        expect(data.r16.toString()).toBe('{x: 2, y: 3}');
    });

    it('should parse expressions in if statements correctly', () => {
        // there was a bug when it did not expect the '}' closing the if statement
        const node = parseExpression(`
            s = true
            if (s) {
                say('Hello')
                say('world')
            }
        `);

        const said = [];
        node.evalNode(new Scope({
            say: (word) => said.push(word)
        }));

        expect(said).toStrictEqual(['Hello', 'world']);
    });

    it('should parse and execute while loops', () => {
        // there was a bug when it did not expect the '}' closing the if statement
        const node = parseExpression(`
            i = 0
            sum = 0
            while (i < 10) {
                sum += i
                i += 1
            }
            sum
        `);

        const result = node.evalNode(new Scope({}));

        expect(result).toBe(45);
    });

    it('should support basic list', () => {
        const node = parseExpression(`
            i = 0
            items = List(2, 3)
                .add(5)
                .add(7)
                .add(9)
                .add(10)
                .remove(4)
                .insert(1, 0)

            x = items.get(4);
            items.add(x)
            items
        `);

        const result = node.evalNode(new Scope({}));

        expect(result).toBeInstanceOf(List);
        expect(result.items).toStrictEqual([2, 0, 3, 5, 7, 10, 7]);
    });

    it('should correctly return the size of list', () => {
        const node = parseExpression(`
            i = 0
            items = List(2, 3)
                .add(5)
                .add(7)
                .add(9)
                .add(10)
                .remove(4)
                .insert(1, 0)

            x = items.get(4);
            items.add(x)
            items.size
        `);

        const result = node.evalNode(new Scope({}));

        expect(result).toBe(7);
    });


    it ('should allow to use javascript Map class', () => {
        const node = parseExpression(`
            m = Map('name', 'john', 'age', 27)
            m.set('type', 'regular')
            age = m.get('age')
            name = m.get('name')
            type = m.get('type')
        `);

        const data = {};
        node.evalNode(new Scope(data));
        expect(data.age).toBe(27);
        expect(data.name).toBe('john');
        expect(data.type).toBe('regular');
    });

    it ('should allow to use javascript Set class', () => {
        const node = parseExpression(`
            s = Set(3, 4, 5)
            s.add(1)
            s.add(4)
            s.add(5)
            s
        `);

        const result = node.evalNode(new Scope({}));
        expect(result).toBeInstanceOf(Set);
        expect(result).toStrictEqual(new Set([1, 3, 4, 5]));
    });


    it('should throw error when its missing closing bracket', () => {
        const call = () => {
            return parseExpression('t = max(min(0, 23), 10')
        };

        expect(call).toThrowError('Unclosed expression')
    });
});
