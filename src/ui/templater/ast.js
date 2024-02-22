import shortid from "shortid";
import { ReservedTerms, TokenTypes, isReserved, tokenizeExpression } from "./tokenizer";
import { StringTemplate, parseStringExpression } from "./strings";
import { Vector } from "./vector";
import { List } from "./list";


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
        if (reservedFunctions.has(this.varName)) {
            return reservedFunctions.get(this.varName);
        }
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

class ASTForLoop extends ASTNode {
    /**
     * @param {ASTNode} init
     * @param {ASTNode} condition
     * @param {ASTNode} postLoop
     * @param {ASTNode} loopBody
     */
    constructor(init, condition, postLoop, loopBody) {
        super('for');
        this.init = init;
        this.condition = condition;
        this.postLoop = postLoop;
        this.loopBody = loopBody;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        scope = scope.newScope();
        this.init.evalNode(scope);

        while(this.condition.evalNode(scope)) {
            this.loopBody.evalNode(scope);
            this.postLoop.evalNode(scope);
        }
    }
    print() {
        const loopBlock = this.loopBlock ? this.loopBody.print() : '';
        return `while (${this.init.print()}; ${this.condition.print()}; ${this.postLoop.print()}) {${loopBlock}}`;
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

class ASTIncrement extends ASTNode {
    /**
     * @param {ASTVarRef} term
     * @param {Boolean} isPre
     * @param {number} [step=1]
     */
    constructor(term, isPre, step = 1) {
        super('increment');
        if (!term || !(term instanceof ASTVarRef)) {
            throw new Error('Invalid use of ' + this.operatorToString());
        }
        this.term = term;
        this.isPre = isPre;
        this.step = step;
    }

    operatorToString() {
        return this.step > 0 ? '++': '--';
    }

    print() {
        const operator = this.operatorToString();
        if (this.isPre) {
            return operator + this.term.print();
        } else {
            return this.term.print() + operator;
        }
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        const oldValue = this.term.evalNode(scope);
        const value = oldValue + this.step;
        scope.set(this.term.varName, value);
        if (this.isPre) {
            return value;
        } else {
            return oldValue;
        }
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


function createHashMap(...args) {
    const map = new Map();
    for (let i = 1; i < args.length; i += 2) {
        map.set(args[i-1], args[i]);
    }
    return map;
}


const reservedFunctions = new Map(Object.entries({
    min       : Math.min,
    Vector    : (x, y) => new Vector(x, y),
    List      : (...items) => new List(...items),
    Map       : (...args) => createHashMap(...args),
    Set       : (...items) => new Set(items),
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
    matchesRegex: (text, pattern) => new RegExp(pattern).test(text)
}));

class ASTFunctionDeclaration extends ASTNode {
    /**
     * @param {Array<String>} argNames
     * @param {ASTNode} body
     */
    constructor(argNames, body) {
        super('function');
        this.argNames = argNames;
        this.body = body;
    }
    print() {
        return `(${this.argNames.join(',')}) => {(${this.body.print()})}`;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        return (...args) => {
            const funcScope = scope.newScope();
            for (let i = 0; i < args.length && i < this.argNames.length; i++) {
                funcScope.set(this.argNames[i], args[i]);
            }
            return this.body.evalNode(funcScope);
        };
    }
}

class ASTFunctionInvocation extends ASTNode {
    /**
     * @param {ASTNode} functionProvider provides the actual function either as a named var reference or as a result of expression
     * @param {Array<ASTNode>} args
     */
    constructor(functionProvider, args) {
        super(FUNC_INVOKE);
        this.functionProvider = functionProvider;
        this.args = args;
    }
    print() {
        const argsText = this.args.map(a => a.print()).join(", ");
        return `${this.functionProvider.print()}(${argsText})`;
    }
    evalNode(scope) {
        const args = this.args.map(arg => arg.evalNode(scope));
        const func = this.functionProvider.evalNode(scope);
        if (!func) {
            throw new Error('Cannot resolve function');
        }
        return func(...args);
    }

    evalOnObject(scope, obj) {
        if (this.functionProvider.type !== VAR_REF) {
            throw new Error('Invalid function invokation on object: ' + obj);
        }

        const name = this.functionProvider.varName;
        const args = this.args.map(arg => arg.evalNode(scope));
        if (obj === null || typeof obj === 'undefined') {
            throw new Error(`Cannot invoke "${name}" function on non-object`);
        }

        if (typeof obj[name] !== 'function') {
            throw new Error(`Function "${name}" is not defined on object ` + obj);
        }

        const f = obj[name];
        if (typeof f !== 'function') {
            throw new Error(`"${name}" is not a function`);
        }
        return obj[name](...args);
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

/**
 * @typedef {Object} ScriptToken
 * @property {Number} t - token code that is defined in {@link TokenTypes}
 * @property {String} v - token raw text
 * @property {Number|undefined} groupCode the token group code (defined in {@link TokenTypes})
 * @property {Array<ScriptToken>|undefined} groupTokens tokens sub array that represents token group (e.g. tokens inside round/curly brackets)
 */

/**
 *
 * @param {ASTNode} functionProvider
 * @param {Array<ScriptToken>} tokens
 * @returns
 */
function parseFunction(functionProvider, tokens) {
    const args = [];

    /** @type {Array<ScriptToken>} */
    let currentArgTokens = [];
    args.push(currentArgTokens);
    tokens.forEach(token => {
        if (token.t === TokenTypes.COMMA) {
            if (!currentArgTokens) {
                throw new Error(`Invalid arguments declaration in function: "${functionProvider.print()}"`);
            }
            currentArgTokens = [];
            args.push(currentArgTokens);
        } else {
            currentArgTokens.push(token);
        }
    });

    if (args[args.length - 1].length === 0) {
        args.pop();
    }

    return new ASTFunctionInvocation(functionProvider, args.map(parseAST));
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

    /**
     * @returns {ScriptToken}
     */
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

    /**
     * @returns {ScriptToken}
     */
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

        const isEndToken = (token) => token === null || token.t === TokenTypes.COMMA;

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
                throw new Error(`Unexpected token in expression (at ${token.idx}, line ${token.line}): (${token.t}) "${token.text}":\n${this.prettyStringWithCaret(token.idx, '    ')}`);
            }

            if (token.v === '++' || token.v === '--') {
                if (!(a instanceof ASTVarRef)) {
                    throw new Error(`Unexpected ${token.v} operator`);
                }

                a = new ASTIncrement(a, false, token.v === '++' ? 1: -1);
            } else {
                this.skipNewlines();
                const precedence = operatorPrecedence(token.v);
                const opClass = operatorClass(token.v);

                const b = this.parseTerm();
                if (b === null) {
                    throw new Error(`Missing right term after the "${token.v}" operator at ${token.idx}, line ${token.line}:\n${this.prettyStringWithCaret(token.idx, '    ')}`);
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

    /**
     * @param {ASTNode} expression
     */
    parseGroup(expression) {
        let nextToken = this.peekToken();
        while (nextToken && nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
            this.skipToken();
            expression = parseFunction(expression, nextToken.groupTokens);
            nextToken = this.peekToken();
        }
        return expression;
    }

    parseTerm() {
        this.skipNewlines();
        const token = this.peekToken();
        if (token === null) {
            return null;
        }
        this.skipToken();

        if (token.t === TokenTypes.TOKEN_GROUP) {
            if (token.groupCode === TokenTypes.START_BRACKET) {
                const nextToken = this.peekToken();
                if (nextToken && nextToken.t === TokenTypes.OPERATOR && nextToken.v === '=>') {
                    this.skipToken();
                    this.skipNewlines();
                    return parseFunctionDeclaration(token, this.scanToken());
                }
                const expression = parseAST(token.groupTokens);
                return this.parseGroup(expression);
            } else {
                throw new Error(`Unexpected token group "${token.v}"`);
            }
        } else if (token.t === TokenTypes.NUMBER) {
            return new ASTValue(token.v);
        } else if (token.t === TokenTypes.RESERVED) {
            if (token.v === ReservedTerms.IF) {
                return this.parseIfExpression();
            } else if (token.v === ReservedTerms.WHILE) {
                return this.parseWhileExpression();
            } else if (token.v === ReservedTerms.FOR) {
                return this.parseForLoop();
            } else if (token.v === ReservedTerms.TRUE) {
                return new ASTValue(true);
            } else if (token.v === ReservedTerms.FALSE) {
                return new ASTValue(false);
            }
        } else if (token.t === TokenTypes.TERM) {
            return this.parseGroup(new ASTVarRef(token.v));
        } else if (token.t === TokenTypes.STRING) {
            return new ASTString(token.v);
        } else if (token.t === TokenTypes.OPERATOR && token.v === '-') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "-"');
            }
            return new ASTNegate(nextTerm);
        } else if (token.t === TokenTypes.OPERATOR && (token.v === '++' || token.v === '--')) {
            const nextToken = this.scanToken();
            if (!nextToken) {
                throw new Error(`Missing term after ${token.v} operator`);
            }
            if (nextToken.t !== TokenTypes.TERM || isReserved(nextToken.v)) {
                throw new Error(`Unexpected token after ${token.v} operator: ${nextToken.text}`);
            }
            return new ASTIncrement(new ASTVarRef(nextToken.v), true, token.v === '++' ? 1 : -1);
        } else if (token.t === TokenTypes.NOT) {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "!"');
            }
            return new ASTNot(nextTerm);
        } else if (token.t === TokenTypes.STRING_TEMPLATE) {
            return new ASTStringTemplate(parseStringExpression(token.v));
        }
        throw new Error(`Unexpected token: ${token.t} "${token.text}"`);
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
        let token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after while (at ${token.idx}, line ${token.line})`);
        }

        const whileExpression = parseAST(token.groupTokens);
        if (!whileExpression) {
            throw new Error(`Missing condition expression for while statement (at ${token.idx}, line ${token.line})`);
        }

        this.skipNewlines();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" symbol after "while" expression (at ${token.idx}, line ${token.line})`);
        }

        const whileBlock = parseAST(token.groupTokens);
        return new ASTWhileStatement(whileExpression, whileBlock);
    }

    parseForLoop() {
        this.skipNewlines();
        let nextToken = this.scanToken();
        if (!nextToken || nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after for (at ${nextToken.idx}, line ${nextToken.line})`);
        }

        const forLoopTokenGroups = [[]];

        nextToken.groupTokens.forEach(token => {
            if (token.t === TokenTypes.DELIMITER) {
                forLoopTokenGroups.push([]);
                return;
            }
            forLoopTokenGroups[forLoopTokenGroups.length - 1].push(token);
        });

        if (forLoopTokenGroups.length !== 3) {
            throw new Error(`Invalid for loop declaration. Expected exactly two ";" (at ${nextToken.idx}, line ${nextToken.line})`);
        }

        this.skipNewlines();
        nextToken = this.scanToken();
        if (!nextToken || nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" symbol after "for" expression (at ${nextToken.idx}, line ${nextToken.line})`);
        }

        const forLoopBlock = parseAST(nextToken.groupTokens);

        const init = parseAST(forLoopTokenGroups[0]);
        const condition = parseAST(forLoopTokenGroups[1]);
        const postLoop = parseAST(forLoopTokenGroups[2]);

        return new ASTForLoop(init, condition, postLoop, forLoopBlock);
    }

    parseIfExpression() {
        this.skipNewlines();
        let token = this.scanToken();

        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Missing "(" symbol after "if" (at ${token.idx}, line ${token.line})`);
        }

        const ifExpression = parseAST(token.groupTokens);

        this.skipNewlines();

        token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" for if statement`);
        }

        const trueBlock = parseAST(token.groupTokens);

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
                if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
                    throw new Error('Expected "{" after "else"');
                }
                falseBlock = parseAST(token.groupTokens);
            }
        }
        return new ASTIFStatement(ifExpression, trueBlock, falseBlock);
    }
}

/**
 * @param {ScriptToken} argsToken
 * @param {ScriptToken} bodyToken
 */
function parseFunctionDeclaration(argsToken, bodyToken) {
    if (!argsToken) {
        throw new Error('Cannot parse function declaration. Missing arguments definition');
    }
    if (!bodyToken) {
        throw new Error('Cannot parse function declaration. Missing "{"');
    }
    if (argsToken.t !== TokenTypes.TOKEN_GROUP || argsToken.groupCode !== TokenTypes.START_BRACKET ) {
        throw new Error('Cannot parse function arguments definition. Expected "(", got: ', argsToken.v);
    }
    if (bodyToken.t !== TokenTypes.TOKEN_GROUP || bodyToken.groupCode !== TokenTypes.START_CURLY ) {
        throw new Error('Cannot parse function definition. Expected "{", got: ', argsToken.v);
    }

    const argNames = [];
    let expectComma = false;
    argsToken.groupTokens.forEach(token => {
        if (token.t === TokenTypes.TERM) {
            if (expectComma) {
                throw new Error('Cannot parse function arguments. Expected ",", got: ', token.v);
            }
            argNames.push(token.v);
            expectComma = true;
        } else {
            if (expectComma && token.t === TokenTypes.COMMA) {
                expectComma = false;
            } else {
                throw new Error('Cannot parse function arguments. Unexpected token: ', token.v);
            }
        }
    });

    const funcBody = parseAST(bodyToken.groupTokens);

    return new ASTFunctionDeclaration(argNames, funcBody);
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
