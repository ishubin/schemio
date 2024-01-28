import shortid from "shortid";
import { ReservedTerms, TokenTypes, tokenizeExpression } from "./tokenizer";
import { StringTemplate, parseStringExpression } from "./strings";
import { Vector } from "./vector";


const FUNC_INVOKE = 'funcInvoke';
const VAR_REF = 'var-ref';

export class Scope {
    constructor(data, parent) {
        this.data = data || {};
        this.parent = parent;
    }

    hasVar(varName) {
        return this.data.hasOwnProperty(varName);
    }

    get(varName) {
        if (this.data.hasOwnProperty(varName)) {
            return this.data[varName];
        }
        if (this.parent) {
            return this.parent.get(varName);
        }
        throw new Error(`"${varName}" was not defined`);
    }

    findScopeWithVar(varName) {
        if (this.data.hasOwnProperty(varName)) {
            return this;
        }
        if (this.parent) {
            return this.parent.findScopeWithVar(varName);
        }
        return null;
    }

    set(varName, value) {
        let scope = this.findScopeWithVar(varName);
        if (!scope) {
            scope = this;
        }
        scope.data[varName] = value;
    }

    newScope() {
        return new Scope({}, this);
    }

    getData() {
        return this.data;
    }
}



export class ASTNode {
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

    assignValue(scope, value) {
        scope.set(this.varName, value);
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

    evalNode(scope) {
        const aVal = this.a.evalNode(scope);
        const bVal = this.b.evalNode(scope);
        if (aVal instanceof Vector) {
            return aVal._operator(this.sign, bVal);
        } if (bVal instanceof Vector) {
            return bVal._rightOperator(this.sign, aVal);
        }
         else {
            return this.evaluate(aVal, bVal);
        }
    }

    evaluate(aVal, bVal) {
        throw new Error(`operator ${this.sign} is not implemented`);
    }
}

class ASTAdd extends ASTOperator {
    constructor(a, b) { super('add', '+', a, b); }
    evaluate(aVal, bVal) { return aVal + bVal};
}

class ASTSubtract extends ASTOperator {
    constructor(a, b) { super('subtract', '-', a, b); }
    evaluate(aVal, bVal) { return aVal - bVal};
}

class ASTMultiply extends ASTOperator {
    constructor(a, b) { super('multiply', '*', a, b); }
    evaluate(aVal, bVal) { return aVal * bVal};
}

class ASTDivide extends ASTOperator {
    constructor(a, b) { super('divide', '/', a, b); }
    evaluate(aVal, bVal) { return aVal / bVal};
}

class ASTMod extends ASTOperator {
    constructor(a, b) { super('mod', '%', a, b); }
    evaluate(aVal, bVal) { return aVal % bVal};
}

class ASTNegate extends ASTNode {
    constructor(node) {
        super('negate');
        this.node = node;
    }
    evalNode(scope) {
        const v = this.node.evalNode(scope);
        if (v instanceof Vector) {
            return v.inverse();
        }
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


class ASTWhileStatement extends ASTNode {
    /**
     * @param {ASTNode} whileExpression
     * @param {ASTNode} whileBlock
     */
    constructor(whileExpression, whileBlock) {
        super('while');
        this.whileExpression = whileExpression;
        this.whileBlock = whileBlock;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        let lastResult = null;
        while (this.whileExpression.evalNode(scope.newScope())) {
            lastResult = this.whileBlock.evalNode(scope.newScope());
        }
        return lastResult;
    }
    print() {
        const whileBlock = this.whileBlock ? this.whileBlock.print() : '';
        return `while (${this.whileExpression.print()}) {${whileBlock}}`;
    }
}
class ASTIFStatement extends ASTNode {
    constructor(conditionExpression, trueBlock, falseBlock) {
        super('if');
        this.conditionExpression = conditionExpression;
        this.trueBlock = trueBlock;
        this.falseBlock = falseBlock;
    }

    evalNode(scope) {
        const result = this.conditionExpression.evalNode(scope.newScope());
        if (result) {
            if (!this.trueBlock) {
                return null;
            }
            return this.trueBlock.evalNode(scope.newScope());
        } else if (this.falseBlock) {
            return this.falseBlock.evalNode(scope.newScope());
        }
        return null;
    }
    print() {
        const trueBlock = this.trueBlock ? this.trueBlock.print() : '';
        const falseBlock = this.falseBlock ? this.falseBlock.print() : '';
        return `if (${this.conditionExpression.print()}) {${trueBlock}} else {${falseBlock}}`;
    }
}


class ASTStringTemplate extends ASTNode {
    /**
     *
     * @param {StringTemplate} stringExpression
     */
    constructor(stringExpression) {
        super('string-template');
        this.stringExpression = stringExpression;
    }
    evalNode(scope) {
        return this.stringExpression.render(scope);
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
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const value = this.b.evalNode(scope);
        this.a.assignValue(scope, value);
    }
}

class ASTIncrementWith extends ASTOperator {
    constructor(a, b) { super('incrementWith', '+=', a, b); }
    evalNode(scope) {
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const aVal = this.a.evalNode(scope);
        const bVal = this.b.evalNode(scope);

        let value;
        if (aVal instanceof Vector) {
            value = aVal._operator('+', bVal);
        } else {
            value = aVal + bVal;
        }
        this.a.assignValue(scope, value);
    }
}

class ASTDecrementWith extends ASTOperator {
    constructor(a, b) { super('decrementWith', '-=', a, b); }
    evalNode(scope) {
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const aVal = this.a.evalNode(scope);
        const bVal = this.b.evalNode(scope);

        let value;
        if (aVal instanceof Vector) {
            value = aVal._operator('-', bVal);
        } else {
            value = aVal - bVal;
        }
        this.a.assignValue(scope, value);
    }
}

class ASTMultiplyWith extends ASTOperator {
    constructor(a, b) { super('multiplyWith', '*=', a, b); }
    evalNode(scope) {
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const aVal = this.a.evalNode(scope);
        const bVal = this.b.evalNode(scope);

        let value;
        if (aVal instanceof Vector) {
            value = aVal._operator('*', bVal);
        } else if (bVal instanceof Vector) {
            value = bVal._rightOperator('*', aVal);
        } else {
            value = aVal * bVal;
        }
        this.a.assignValue(scope, value);
    }
}

class ASTDivideWith extends ASTOperator {
    constructor(a, b) { super('divideWith', '/=', a, b); }
    evalNode(scope) {
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const aVal = this.a.evalNode(scope);
        const bVal = this.b.evalNode(scope);

        let value;
        if (aVal instanceof Vector) {
            value = aVal._operator('/', bVal);
        } else if (bVal instanceof Vector) {
            value = bVal._rightOperator('/', aVal);
        } else {
            value = aVal / bVal;
        }
        this.a.assignValue(scope, value);
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

    assignValue(scope, value) {
        const obj = this.a.evalNode(scope);
        if (typeof obj === 'undefined' || obj === null) {
            throw new Error(`Cannot assign "${fieldName}" on ${obj}`);
        }
        if (this.b.type !== VAR_REF) {
            throw new Error(`Cannot assign value on object, invalid field reference (${this.b.type})`);
        }

        const fieldName = this.b.varName;
        obj[fieldName] = value;
    }
}

function customParseInt(text) {
    const value = parseInt(text);
    return alwaysNumber(value, 0);
}

function customParseFloat(text) {
    const value = parseFloat(text);
    return alwaysNumber(value, 0);
}

function alwaysNumber(value, defaultValue) {
    if (isNaN(value)) {
        return defaultValue
    }
    return value;
}


const reservedFunctions = new Map(Object.entries({
    min       : Math.min,
    Vector    : (x, y) => new Vector(x, y),
    max       : Math.max,
    pow       : Math.pow,
    sqrt      : Math.sqrt,
    cos       : Math.cos,
    sin       : Math.sin,
    acos      : Math.acos,
    asin      : Math.asin,
    abs       : Math.abs,
    uid       : () => shortid.generate(),
    log       : console.log,
    round     : Math.round,
    ceil      : Math.ceil,
    floor     : Math.floor,
    rnd       : Math.random,
    isNumber  : (text) => Number.isFinite(parseFloat(text)) || Number.isFinite(parseInt(text)),
    parseInt  : customParseInt,
    parseFloat: customParseFloat,
    rndInt    : (a, b) => Math.round(Math.random()* (b-a)) + a,
    rgba      : (r, g, b, a) => `rgba(${r},${g},${b},${a})`,
    PI        : () => Math.PI,
    ifcond    : (condition, trueValue, falseValue) => {
        if (condition) {
            return trueValue;
        }
        return falseValue;
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
            return reservedFunctions.get(this.name)(...args);
        }
        return scope.get(this.name)(...args);
    }

    evalOnObject(scope, obj) {
        const args = this.args.map(arg => arg.evalNode(scope));
        if (!obj || typeof obj !== 'object') {
            throw new Error(`Cannot invoke "${this.name}" function on non-object`);
        }

        if (typeof obj[this.name] !== 'function') {
            throw new Error(`Function "${this.name}" is not defined on object ` + obj);
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
    '+=': ASTIncrementWith,
    '-=': ASTDecrementWith,
    '*=': ASTMultiplyWith,
    '/=': ASTDivideWith,
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
        this.line = 0;
    }

    parse() {
        if (!this.tokens || this.tokens.length === 0) {
            return new ASTString("");
        }
        const node = this.parseExpression();
        if (!node) {
            throw new Error('Failed parsing expression: \n' + this.originalText);
        }
        if (this.idx < this.tokens.length) {
            const token = this.scanToken();
            throw new Error(`Failed to parse entire expression. `
                + `Unexpected token in expression (at ${token.idx}, line ${token.line}): ${token.t} "${token.text}"`);
        }
        return node;
    }

    scanToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        const token = this.tokens[this.idx];
        this.idx++;
        if (token.t === TokenTypes.NEWLINE) {
            this.line++;
        }
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
            this.line++;
            this.skipToken();
        }
    }


    skipNewlinesAndDelimeters() {
        while(true) {
            const token = this.peekToken();
            if (!token || (token.t !== TokenTypes.NEWLINE && token.t !== TokenTypes.DELIMITER)) {
                return;
            }
            if (token.t === TokenTypes.NEWLINE) {
                this.line++;
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
            return null;
        }

        const leftovers = [];

        const processLeftovers = () => {
            while(leftovers.length > 0) {
                const leftover = leftovers.pop();
                a = leftover.make(a);
            }
        };

        const isEndToken = (token) => token === null || token.t === TokenTypes.END_BRACKET || token.t === TokenTypes.END_CURLY || token.t === TokenTypes.COMMA;

        const startNewExpression = () => {
            processLeftovers();
            expressions.push(a);
            this.skipNewlinesAndDelimeters();

            a = this.parseTerm();
            this.skipNewlines();

            const nextToken = this.peekToken();
            if (nextToken && nextToken.t !== TokenTypes.OPERATOR && !isEndToken(nextToken)) {
                return startNewExpression();
            }
            return a ? true : false;
        };


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
        const token = this.peekToken();
        if (token === null) {
            return null;
        }
        if (token.t === TokenTypes.END_CURLY) {
            return null;
        }
        this.skipToken();

        if (token.t === TokenTypes.START_BRACKET) {
            const expr = this.parseExpression();
            const nextToken = this.scanToken();

            if (!nextToken || nextToken.t !== TokenTypes.END_BRACKET) {
                throw new Error('Missing end bracket');
            }
            return expr;
        } else if (token.t === TokenTypes.NUMBER) {
            return new ASTValue(token.v);
        } else if (token.t === TokenTypes.RESERVED && token.v === ReservedTerms.IF) {
            return this.parseIfExpression();
        } else if (token.t === TokenTypes.RESERVED && token.v === ReservedTerms.WHILE) {
            return this.parseWhileExpression();
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
        } else if (token.t === TokenTypes.STRING_TEMPLATE) {
            return new ASTStringTemplate(parseStringExpression(token.v));
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

    parseWhileExpression() {
        this.skipNewlines();
        let token = this.peekToken();
        if (!token) {
            throw new Error('Invalid if statement');
        }
        if (token.t !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after while (at ${token.idx}, line ${token.line})`);
        }

        this.skipToken();

        const whileExpression = this.parseExpression();
        if (!whileExpression) {
            throw new Error(`Missing condition expression for while statement (at ${token.idx}, line ${token.line})`);
        }

        this.skipNewlines();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.END_BRACKET) {
            throw new Error(`Missing ")" for if statement`);
        }
        this.skipNewlines();

        token = this.scanToken();
        if (!token || token.t !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" for while statement`);
        }

        const whileBlock = this.parseExpression();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.END_CURLY) {
            throw new Error(`Missing "}" for while statement (line ${this.line})`);
        }
        return new ASTWhileStatement(whileExpression, whileBlock);
    }

    parseIfExpression() {
        this.skipNewlines();
        let token = this.peekToken();
        if (!token) {
            throw new Error('Invalid if statement');
        }
        if (token.t !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after if (at ${token.idx}, line ${token.line})`);
        }

        this.skipToken();

        const ifExpression = this.parseExpression();
        if (!ifExpression) {
            throw new Error(`Missing condition expression for if statement (at ${token.idx}, line ${token.line})`);
        }

        this.skipNewlines();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.END_BRACKET) {
            throw new Error(`Missing ")" for if statement`);
        }
        this.skipNewlines();

        token = this.scanToken();
        if (!token || token.t !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" for if statement`);
        }

        const trueBlock = this.parseExpression();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.END_CURLY) {
            throw new Error(`Missing "}" for if statement (line ${this.line})`);
        }

        this.skipNewlines();

        token = this.peekToken();

        let falseBlock = null;

        if (token && token.t === TokenTypes.RESERVED && token.v === ReservedTerms.ELSE) {
            this.skipToken();
            this.skipNewlines();

            token = this.scanToken();
            if (!token) {
                throw new Error('Missing expression after "else"');
            }

            if (token.t === TokenTypes.RESERVED && token.v === ReservedTerms.IF) {
                falseBlock = this.parseIfExpression();
            } else {
                if (token.t !== TokenTypes.START_CURLY) {
                    throw new Error('Expected "{" after "else"');
                }
                falseBlock = this.parseExpression();
                token = this.scanToken();
                if (!token || token.t !== TokenTypes.END_CURLY) {
                    throw new Error(`Missing "}" for else statement (line ${this.line})`);
                }
            }
        }
        return new ASTIFStatement(ifExpression, trueBlock, falseBlock);
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
    return parseAST(tokenizeExpression(expression), expression);
}


export function testAST(expression) {
    return parseExpression(expression);
}
