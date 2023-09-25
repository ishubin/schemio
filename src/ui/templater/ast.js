import shortid from "shortid";
import { TokenTypes, tokenizeExpression } from "./tokenizer";


const FUNC_INVOKE = 'funcInvoke';
const VAR_REF = 'var-ref';

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

    newScope() {
        return new Scope({}, this);
    }

    getData() {
        return this.data;
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

class ASTValue extends ASTNode {
    constructor(value) {
        super('value', value);
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
        super(VAR_REF);
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

class ASTNot extends ASTNode {
    constructor(node) {
        super('not');
        this.node = node;
    }
    evalNode(scope) {
        const v = this.node.evalNode(scope);
        return !v;
    }
    print() {
        return `(!${this.v.print()})`;
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

class ASTAssign extends ASTOperator {
    constructor(a, b) { super('assign', '=', a, b); }
    evalNode(scope) {
        if (this.a.type !== VAR_REF) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const value = this.b.evalNode(scope);
        scope.set(this.a.varName, value);
    }
}

class ASTObjectFieldAccesser extends ASTOperator {
    constructor(a, b) { super('field', '.', a, b); }
    evalNode(scope) {
        const obj = this.a.evalNode(scope);

        if (this.b.type === VAR_REF) {
            const fieldName = this.b.varName;

            if (typeof obj === 'undefined' || obj === null) {
                throw new Error(`Cannot get ${fieldName} from ${obj}`);
            }
            return obj[fieldName];
        } else if (this.b.type === FUNC_INVOKE) {
            return this.b.evalOnObject(scope, obj);
        }
        throw new Error('Invalid use for dot operator. Expected field reference but got: ' + this.b.type);
    }
}


const reservedFunctions = new Map(Object.entries({
    min   : args => Math.min(...args),
    max   : args => Math.max(...args),
    pow   : args => Math.pow(...args),
    sqrt  : args => Math.sqrt(...args),
    cos   : args => Math.cos(...args),
    sin   : args => Math.sin(...args),
    acos  : args => Math.acos(...args),
    asin  : args => Math.asin(...args),
    abs   : args => Math.abs(...args),
    uid   : args => shortid.generate(),
    log   : args => console.log(...args),
    round : args => Math.round(...args),
    ceil  : args => Math.ceil(...args),
    floor : args => Math.floor(...args),
    rnd   : args => Math.random(),
    rndInt: (a, b) => Math.round(Math.random()* (b-a)) + a,
    rgba  : (r, g, b, a) => `rgba(${r},${g},${b},${a})`,
    PI    : () => Math.PI,
    ifcond: args => {
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
        super(FUNC_INVOKE);
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
        return scope.get(this.name)(...args);
    }

    evalOnObject(scope, obj) {
        const args = this.args.map(arg => arg.evalNode(scope));
        if (!obj || typeof obj !== 'object') {
            throw new Error(`Cannot invoke "${this.name}" function on non-object`);
        }

        if (!obj.hasOwnProperty(this.name)) {
            throw new Error(`Function "${this.name}" is not defined on object`);
        }

        const f = obj[this.name];
        if (typeof f !== 'function') {
            throw new Error(`"${this.name}" is not a function`);
        }
        return obj[this.name](...args);
    }
}

class ASTMultiExpression extends ASTNode {
    constructor(nodes) {
        super('multi-expr');
        this.nodes = nodes;
    }

    print() {
        const argsText = this.nodes.map(a => a ? a.print() : '' + a).join("; ");
        return `(${argsText})`;
    }

    evalNode(scope) {
        let result = null;
        this.nodes.forEach(node => {
            result = node.evalNode(scope);
        });
        return result;
    }
}

const operatorPrecedences = new Map(Object.entries({
    '.': 6,
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
    '=': -1,
}));

function operatorPrecedence(operator) {
    if (operatorPrecedences.has(operator)) {
        return operatorPrecedences.get(operator);
    }
    return 0;
}

const operatorClasses = new Map(Object.entries({
    '.': ASTObjectFieldAccesser,
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
    '=': ASTAssign,
}));

function operatorClass(operator) {
    if (operatorClasses.has(operator)) {
        return operatorClasses.get(operator);
    }

    throw new Error('Unknown operator: ' + operator);
}

function createOpLeftover(a, opClass, precedence) {
    return {
        a, opClass, precedence,
        make: (b) => new opClass(a, b)
    };
}

class ASTParser {
    constructor(tokens, originalText) {
        this.tokens = tokens;
        this.originalText = originalText;
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

    peekAfterNewlineToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }
        for (let i = this.idx; i < this.tokens.length; i++) {
            if (this.tokens[i].t !== TokenTypes.NEWLINE) {
                return this.tokens[i];
            }
        }
        return null;
    }

    skipToken() {
        this.idx++;
    }

    skipNewlines() {
        while(true) {
            const token = this.peekToken();
            if (!token || (token.t !== TokenTypes.NEWLINE)) {
                return;
            }
            this.skipToken();
        }
    }


    skipNewlinesAndDelimeters() {
        while(true) {
            const token = this.peekToken();
            if (!token || (token.t !== TokenTypes.NEWLINE && token.t !== TokenTypes.DELIMITER)) {
                return;
            }
            this.skipToken();
        }
    }

    parseExpression() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        const expressions = [];

        this.skipNewlinesAndDelimeters();

        let a = this.parseTerm();

        if (!a) {
            throw new Error('Empty expression');
        }

        const leftovers = [];

        const processLeftovers = () => {
            while(leftovers.length > 0) {
                const leftover = leftovers.pop();
                a = leftover.make(a);
            }
        };

        const startNewExpression = () => {
            processLeftovers();
            expressions.push(a);
            this.skipNewlinesAndDelimeters();

            a = this.parseTerm();
            this.skipNewlines();

            const nextToken = this.peekToken();
            if (nextToken && nextToken.t !== TokenTypes.OPERATOR) {
                return startNewExpression();
            }
            return a ? true : false;
        };

        const isEndToken = (token) => token === null || token.t === TokenTypes.END_BRACKET || token.t === TokenTypes.COMMA;

        while(this.idx < this.tokens.length) {
            let token = this.peekToken();
            if (isEndToken(token)) {
                break;
            }
            this.skipToken();

            if (token.t === TokenTypes.DELIMITER) {
                if (!startNewExpression()) {
                    break;
                }
                token = this.peekToken();
                if (isEndToken(token)) {
                    break;
                }
                this.skipToken();
            }

            if (token.t === TokenTypes.NEWLINE) {
                this.skipNewlines();
                token = this.peekToken();
                if (isEndToken(token)) {
                    break;
                } else if (token.t === TokenTypes.OPERATOR) {
                    this.skipToken();
                } else {
                    if (!startNewExpression()) {
                        break;
                    }
                    token = this.peekToken();
                    if (isEndToken(token)) {
                        break;
                    }
                    this.skipToken();
                }
            }

            if (token.t !== TokenTypes.OPERATOR) {
                throw new Error(`Unexpected token in expression (at ${token.idx}, line ${token.line}): ${token.t} "${token.text}":\n${this.prettyStringWithCaret(token.idx, '    ')}`);
            } else {
                this.skipNewlines();
            }
            const precedence = operatorPrecedence(token.v);
            const opClass = operatorClass(token.v);

            const b = this.parseTerm();
            if (b === null) {
                if (token.v !== ';') {
                    throw new Error(`Missing right term after the "${token.v}" operator at ${token.idx}, line ${token.line}:\n${this.prettyStringWithCaret(token.idx, '    ')}`);
                }
            }

            let nextToken = this.peekToken();
            if (nextToken && nextToken.t === TokenTypes.NEWLINE) {
                const nextValidToken = this.peekAfterNewlineToken();
                if (nextValidToken && nextValidToken.t === TokenTypes.OPERATOR) {
                    this.skipNewlines();
                    nextToken = nextValidToken;
                }
            }
            const nextOperator = nextToken && nextToken.t === TokenTypes.OPERATOR ? nextToken.v : null;
            const nextPrecedence = nextOperator ? operatorPrecedence(nextOperator) : -100;

            if (precedence >= nextPrecedence) {
                a = new opClass(a, b);
                while(leftovers.length > 0) {
                    const leftover = leftovers[leftovers.length - 1];
                    if (leftover.precedence < nextPrecedence) {
                        break
                    }
                    a = leftover.make(a);
                    leftovers.pop();
                }
            } else {
                leftovers.push(createOpLeftover(a, opClass, precedence));
                a = b;
            }
        }

        processLeftovers();

        if (expressions.length > 0) {
            if (a) {
                expressions.push(a);
            }
            return new ASTMultiExpression(expressions);
        }
        return a;
    }

    parseTerm() {
        this.skipNewlines();
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
            return new ASTValue(token.v);
        } else if (token.t === TokenTypes.TERM) {
            const nextToken = this.peekToken();
            if (nextToken && nextToken.t === TokenTypes.START_BRACKET) {
                this.skipToken();
                return this.parseFunction(token.v);
            }
            if (token.v === 'true') {
                return new ASTValue(true);
            }
            if (token.v === 'false') {
                return new ASTValue(false);
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
        } else if (token.t === TokenTypes.NOT) {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "!"');
            }
            return new ASTNot(nextTerm);
        } else {
            throw new Error(`Unexpected token: ${token.t} "${token.text}"`);
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

    prettyStringWithCaret(idx, indentation) {
        const maxLength = 80;

        let start = idx, end = idx;

        while(true) {
            if (
                end - start >= maxLength ||
                ((start === 0 || this.originalText[start] === '\n' )&& (end === this.originalText.length - 1 || this.originalText[end] === '\n'))
            ) {
                break;
            }
            if (start > 0) {
                start--;
            }
            if (end < this.originalText.length - 1) {
                end++;
            }
        }

        return indentation + this.originalText.substring(start, end) + '\n' + indentation + ' '.repeat(idx - start) + '^';
    }
}

/**
 *
 * @param {Array} tokens
 * @returns {ASTNode}
 */
export function parseAST(tokens, originalText) {
    const parser = new ASTParser(tokens, originalText);
    return parser.parse();
}

/**
 *
 * @param {String} expression
 * @returns {ASTNode}
 */
export function parseExpression(expression) {
    return parseAST(tokenizeExpression(expression).filter(token => token.t !== TokenTypes.COMMENT), expression);
}


export function testAST(expression) {
    return parseExpression(expression);
}
