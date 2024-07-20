import { List } from "./list";
import { TreeNode, decodeTree } from "./treenode";
import { StringTemplate } from "./strings";
import { Vector } from "./vector";
import { Scope } from "./scope";
import shortid from "shortid";
import { convertJSONToScriptObject, convertScriptObjectToJSON } from "./json";
import { forEach } from "../collections";
import SchemioScriptMath from "./astmath";
import { parseColor } from "../colors";
import { Color } from "./color";
import { Area } from "./area";
import { Fill } from "./fill";

const FUNC_INVOKE = 'funcInvoke';
const VAR_REF = 'var-ref';


export class ASTNode {
    constructor(type) {
        this.type = type;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        throw new Error('eval function is undefined for type: ' + this.type);
    }

    print() {
        return '()';
    }
}


export class ASTValue extends ASTNode {
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

export class ASTString extends ASTNode {
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

export class ASTVarRef extends ASTNode {
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

export class ASTOperator extends ASTNode {
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

export class ASTAdd extends ASTOperator {
    constructor(a, b) { super('add', '+', a, b); }
    evaluate(aVal, bVal) { return aVal + bVal};
}

export class ASTPow extends ASTOperator {
    constructor(a, b) { super('pow', '^', a, b); }
    evaluate(aVal, bVal) { return Math.pow(aVal, bVal)};
}


export class ASTSubtract extends ASTOperator {
    constructor(a, b) { super('subtract', '-', a, b); }
    evaluate(aVal, bVal) { return aVal - bVal};
}

export class ASTMultiply extends ASTOperator {
    constructor(a, b) { super('multiply', '*', a, b); }
    evaluate(aVal, bVal) { return aVal * bVal};
}

export class ASTDivide extends ASTOperator {
    constructor(a, b) { super('divide', '/', a, b); }
    evaluate(aVal, bVal) { return aVal / bVal};
}

export class ASTMod extends ASTOperator {
    constructor(a, b) { super('mod', '%', a, b); }
    evaluate(aVal, bVal) { return aVal % bVal};
}

export class ASTNegate extends ASTNode {
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
        return `(-${this.node.print()})`;
    }
}

export class ASTNot extends ASTNode {
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


export class ASTWhileStatement extends ASTNode {
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

export class ASTForLoop extends ASTNode {
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

export class ASTIFStatement extends ASTNode {
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


export class ASTLocalVariable extends ASTNode {
    /**
     * @param {String} varName
     * @param {ASTAssign|undefined} expression
     */
    constructor(varName, expression) {
        super('local');
        this.varName = varName;
        this.expression = expression;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        scope.setLocal(this.varName, null);
        if (this.expression) {
            this.expression.evalNode(scope);
        }
    }
}

export class ASTExternalObjectLookup extends ASTNode {
    /**
     * @param {ASTNode} nameProvider
     */
    constructor(nameProvider) {
        super('@');
        this.nameProvider = nameProvider;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        if (!this.nameProvider) {
            return null;
        }
        const name = this.nameProvider.evalNode(scope);
        return scope.getExternalObject(name);
    }
}

export class ASTStringTemplate extends ASTNode {
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

export class ASTLessThen extends ASTOperator {
    constructor(a, b) { super('lessThan', '<', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) < this.b.evalNode(scope); }
}

export class ASTGreaterThan extends ASTOperator {
    constructor(a, b) { super('greaterThan', '>', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) > this.b.evalNode(scope); }
}

export class ASTLessThenOrEquals extends ASTOperator {
    constructor(a, b) { super('lessThanOrEquals', '<=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) <= this.b.evalNode(scope); }
}

export class ASTGreaterThanOrEquals extends ASTOperator {
    constructor(a, b) { super('greaterThanOrEquals', '>=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) >= this.b.evalNode(scope); }
}

export class ASTEquals extends ASTOperator {
    constructor(a, b) { super('equals', '==', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) == this.b.evalNode(scope); }
}

export class ASTNotEqual extends ASTOperator {
    constructor(a, b) { super('notEqual', '!=', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) != this.b.evalNode(scope); }
}

export class ASTBoolOr extends ASTOperator {
    constructor(a, b) { super('boolOr', '||', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) || this.b.evalNode(scope); }
}

export class ASTBoolAnd extends ASTOperator {
    constructor(a, b) { super('boolAnd', '&&', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) && this.b.evalNode(scope); }
}

export class ASTAssign extends ASTOperator {
    constructor(a, b) { super('assign', '=', a, b); }
    evalNode(scope) {
        if (!this.a.assignValue) {
            throw new Error('Cannot use assign operator on non-var');
        }
        const value = this.b.evalNode(scope);
        this.a.assignValue(scope, value);
    }
}

export class ASTIncrement extends ASTNode {
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

export class ASTIncrementWith extends ASTOperator {
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

export class ASTDecrementWith extends ASTOperator {
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

export class ASTMultiplyWith extends ASTOperator {
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

export class ASTDivideWith extends ASTOperator {
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


export class ASTObjectFieldAccessor extends ASTOperator {
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

function setObjectFieldFunc(obj, name, value) {
    if (typeof obj !== 'object') {
        return;
    }
    obj[name] = value
}

const reservedFunctions = new Map(Object.entries({
    min       : Math.min,
    Vector    : (x, y) => new Vector(x, y),
    List      : (...items) => new List(...items),
    TreeNode  : (...items) => new TreeNode(...items),
    decodeTree: decodeTree,
    Area      : (x, y, w, h) => new Area(x, y, w, h),
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
    matchesRegex  : (text, pattern) => new RegExp(pattern).test(text),
    splitString   : (str, separator) => new List(...str.split(separator)),
    toJSON        : (obj) => convertScriptObjectToJSON(obj),
    fromJSON      : (obj) => convertJSONToScriptObject(obj),
    forEach       : forEach,
    setObjectField: setObjectFieldFunc,
    Math          : SchemioScriptMath,

    Color         : (r,g,b,a) => new Color(r,g,b,a),
    decodeColor   : (text) => {const c = parseColor(text); return new Color(c.r, c.g, c.b, c.a)},

    Fill          : Fill
}));


export class ASTFunctionDeclaration extends ASTNode {
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
                funcScope.setLocal(this.argNames[i], args[i]);
            }
            return this.body.evalNode(funcScope);
        };
    }
}

export class ASTFunctionInvocation extends ASTNode {
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

export class ASTMultiExpression extends ASTNode {
    /**
     * @param {Array<ASTNode>} nodes
     */
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