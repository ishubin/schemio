import { TokenTypes, tokenizeExpression } from "./tokenizer";

export class Scope {
    constructor(data, parent) {
        this.data = data || {};
        this.parent = parent;
    }

    get(varName) {
        if (this.data.hasOwnProperty(varName)) {
            return this.data[varName]
        }
        if (this.parent) {
            return this.parent.get(varName);
        }
        throw new Error(`"${varName}" was not defined`);
    }

    set(varName, value) {
        this.data[varName] = value;
    }

}



class ASTNode {
    constructor(type) {
        this.type = type;
    }

    evalNode(scope) {
        throw new Error('eval function is undefined for type: ' + this.type);
    }

    print() {
        return '()';
    }
}

class ASTNumber extends ASTNode {
    constructor(value) {
        super('number', value);
        this.value = value;
    }

    evalNode(scope) {
        return this.value;
    }

    print() {
        return '' + this.value;
    }
}

class ASTString extends ASTNode {
    constructor(str) {
        super('string');
        this.str = str;
    }
    evalNode(scope) {
        return this.str;
    }
    print() {
        return `"${this.str}"`;
    }
}

class ASTVarRef extends ASTNode {
    constructor(varName) {
        super('var-ref');
        this.varName = varName;
    }
    evalNode(scope) {
        return scope.get(this.varName);
    }
    print() {
        return this.varName;
    }
}

class ASTOperator extends ASTNode {
    constructor(type, sign, a, b) {
        super(type);
        this.sign = sign;
        this.a = a;
        this.b = b;
    }
    print() {
        return `(${this.a.print()} ${this.sign} ${this.b.print()})`;
    }
}
class ASTAdd extends ASTOperator {
    constructor(a, b) { super('add', '+', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) + this.b.evalNode(scope); }
}

class ASTSubtract extends ASTOperator {
    constructor(a, b) { super('subtract', '-', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) - this.b.evalNode(scope); }
}

class ASTMultiply extends ASTOperator {
    constructor(a, b) { super('multiply', '*', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) * this.b.evalNode(scope); }
}

class ASTDivide extends ASTOperator {
    constructor(a, b) { super('divide', '/', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) / this.b.evalNode(scope); }
}

class ASTMod extends ASTOperator {
    constructor(a, b) { super('mod', '%', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) % this.b.evalNode(scope); }
}

class ASTNegate extends ASTNode {
    constructor(node) {
        super('negate');
        this.node = node;
    }
    evalNode(scope) {
        const v = this.node.evalNode(scope);
        return -v;
    }
    print() {
        return `(-${this.v.print()})`;
    }
}

class ASTLessThen extends ASTOperator {
    constructor(a, b) { super('lessThan', '<', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) < this.b.evalNode(scope); }
}

class ASTGreaterThan extends ASTOperator {
    constructor(a, b) { super('greaterThan', '>', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) > this.b.evalNode(scope); }
}

class ASTLessThenOrEquals extends ASTOperator {
    constructor(a, b) { super('lessThanOrEquals', '<=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) <= this.b.evalNode(scope); }
}

class ASTGreaterThanOrEquals extends ASTOperator {
    constructor(a, b) { super('greaterThanOrEquals', '>=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) >= this.b.evalNode(scope); }
}

class ASTEquals extends ASTOperator {
    constructor(a, b) { super('equals', '==', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) == this.b.evalNode(scope); }
}

class ASTNotEqual extends ASTOperator {
    constructor(a, b) { super('notEqual', '!=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) != this.b.evalNode(scope); }
}

class ASTBoolOr extends ASTOperator {
    constructor(a, b) { super('boolOr', '||', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) || this.b.evalNode(scope); }
}

class ASTBoolAnd extends ASTOperator {
    constructor(a, b) { super('boolAnd', '&&', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) && this.b.evalNode(scope); }
}


const reservedFunctions = new Map(Object.entries({
    min: args => Math.min(...args),
    max: args => Math.max(...args),
    pow: args => Math.pow(...args),
    cos: args => Math.cos(...args),
    sin: args => Math.sin(...args),
    cond: args => {
        if (args.length !== 3) {
            throw new Error('cond function is taking exactly 3 arguments');
        }
        if (args[0]) {
            return args[1]
        }
        return args[2];
    },
}));

class ASTFunctionInvocation extends ASTNode {
    constructor(name, args) {
        super('functionInvoke');
        this.name = name;
        this.args = args;
    }
    print() {
        const argsText = this.args.map(a => a.print()).join(", ");
        return `${this.name}(${argsText})`;
    }
    evalNode(scope) {
        const args = this.args.map(arg => arg.evalNode(scope));
        if (reservedFunctions.has(this.name)) {
            return reservedFunctions.get(this.name)(args);
        }
        return scope.get(this.name)(args);
    }
}

const operatorPrecedences = new Map(Object.entries({
    '*': 5,
    '/': 5,
    '%': 5,
    '+': 4,
    '-': 4,
    '<': 3,
    '>': 3,
    '<=': 3,
    '>=': 3,
    '!=': 2,
    '==': 2,
    '&&': 1,
    '||': 0,
}));


function operatorPrecedence(operator) {
    if (operatorPrecedences.has(operator)) {
        return operatorPrecedences.get(operator);
    }
    return 0;
}

const operatorClasses = new Map(Object.entries({
    '+': ASTAdd,
    '-': ASTSubtract,
    '*': ASTMultiply,
    '/': ASTDivide,
    '%': ASTMod,
    '<': ASTLessThen,
    '>': ASTGreaterThan,
    '<=': ASTLessThenOrEquals,
    '>=': ASTGreaterThanOrEquals,
    '==': ASTEquals,
    '!=': ASTNotEqual,
    '&&': ASTBoolAnd,
    '||': ASTBoolOr,
}));

function operatorClass(operator) {
    if (operatorClasses.has(operator)) {
        return operatorClasses.get(operator);
    }

    throw new Error('Unknown operator: ' + operator);
}

function createOpLeftover(a, opClass) {
    return (b) => {
        return new opClass(a, b);
    }
}

class ASTParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.idx = 0;
    }

    parse() {
        const node = this.parseExpression();
        if (!node) {
            throw new Error('Failed parsing expression');
        }
        if (this.idx < this.tokens.length) {
            throw new Error('Failed to parse entire expression');
        }
        return node;
    }

    scanToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        const token = this.tokens[this.idx];
        this.idx++;
        return token;
    }

    peekToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        return this.tokens[this.idx];
    }

    skipToken() {
        this.idx++;
    }

    parseExpression() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        let a = this.parseTerm();

        const leftovers = [];

        while(this.idx < this.tokens.length) {
            const token = this.peekToken();
            if (token === null || token.t === TokenTypes.END_BRACKET || token.t === TokenTypes.COMMA) {
                break;
            }
            this.skipToken();

            if (token.t !== TokenTypes.OPERATOR) {
                throw new Error('Unexpected token in expression: ', JSON.stringify(token));
            }
            const precedence = operatorPrecedence(token.v);
            const opClass = operatorClass(token.v);

            const b = this.parseTerm();
            if (b === null) {
                throw new Error(`Missing right term after the "${token.v}" operator`);
            }

            const nextToken = this.peekToken();
            const nextOperator = nextToken && nextToken.t === TokenTypes.OPERATOR ? nextToken.v : null;
            const nextPrecedence = nextOperator ? operatorPrecedence(nextOperator) : 0;

            if (precedence >= nextPrecedence) {
                a = new opClass(a, b);
                while(leftovers.length > 0) {
                    const leftover = leftovers.pop();
                    a = leftover(a);
                }
            } else {
                leftovers.push(createOpLeftover(a, opClass));
                a = b;
            }
        }

        while(leftovers.length > 0) {
            const leftover = leftovers.pop();
            a = leftover(a);
        }

        return a;
    }

    parseTerm() {
        const token = this.scanToken();
        if (token === null) {
            return null;
        }

        if (token.t === TokenTypes.START_BRACKET) {
            const expr = this.parseExpression();
            const nextToken = this.scanToken();

            if (!nextToken || nextToken.t !== TokenTypes.END_BRACKET) {
                throw new Error('Missing end bracket');
            }
            return expr;
        } else if (token.t === TokenTypes.NUMBER) {
            return new ASTNumber(token.v);
        } else if (token.t === TokenTypes.TERM) {
            const nextToken = this.peekToken();
            if (nextToken && nextToken.t === TokenTypes.START_BRACKET) {
                this.skipToken();
                return this.parseFunction(token.v);
            }
            return new ASTVarRef(token.v);
        } else if (token.t === TokenTypes.STRING) {
            return new ASTString(token.v);
        } else if (token.t === TokenTypes.OPERATOR && token.v === '-') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "-"');
            }
            return new ASTNegate(nextTerm);
        } else {
            throw new Error(`Unexpected token ${JSON.stringify(token)}`);
        }
    }

    parseFunction(name) {
        const args = [];
        while(this.idx < this.tokens.length) {
            const token = this.peekToken();
            if (!token) {
                throw new Error('Function is missing ) symbol');
            }
            if (token.t === TokenTypes.END_BRACKET) {
                this.skipToken();
                break;
            }
            if (token.t === TokenTypes.COMMA ) {
                this.skipToken();
            }

            const expr = this.parseExpression();
            if (!expr) {
                throw new Error('Function is missing an argument');
            }

            args.push(expr);
        }

        return new ASTFunctionInvocation(name, args);
    }
}

/**
 *
 * @param {Array} tokens
 * @returns {ASTNode}
 */
export function parseAST(tokens) {
    const parser = new ASTParser(tokens);
    return parser.parse();
}


export function testAST(expression) {
    const tokens = tokenizeExpression(expression);

    const node = parseAST(tokens);
    return node;
}