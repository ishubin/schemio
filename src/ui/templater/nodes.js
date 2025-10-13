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
import { SchemioScriptError, ScopeInterruptValue } from "./error";
import { stripAllHtml } from "../../htmlSanitize";
import { VAR_REF } from "./consts";


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

export class ASTReturn extends ASTNode {
    /**
     *
     * @param {ASTNode} expr
     */
    constructor(expr) {
        super('return');
        this.expr = expr;
    }

    evalNode(scope) {
        if (this.expr) {
            throw new ScopeInterruptValue(this.expr.evalNode(scope));
        }
        throw new ScopeInterruptValue(null);
    }

    print() {
        return 'return ' + this.expr.print();
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
        while (this.whileExpression.evalNode(scope.newScope('while expression'))) {
            lastResult = this.whileBlock.evalNode(scope.newScope('while block'));
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
        scope = scope.newScope('for loop');
        this.init.evalNode(scope);

        while(this.condition.evalNode(scope)) {
            this.loopBody.evalNode(scope);
            this.postLoop.evalNode(scope);
        }
    }
    print() {
        const loopBlock = this.loopBlock ? this.loopBody.print() : '';
        return `for (${this.init.print()}; ${this.condition.print()}; ${this.postLoop.print()}) {${loopBlock}}`;
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
        const result = this.conditionExpression.evalNode(scope.newScope('if statement'));
        if (result) {
            if (!this.trueBlock) {
                return null;
            }
            return this.trueBlock.evalNode(scope.newScope('if block'));
        } else if (this.falseBlock) {
            return this.falseBlock.evalNode(scope.newScope('else block'));
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

const stringFunctions = {
    hashCode(str) {
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for(let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    },

    split(str, separator) {
        return new List(...str.split(separator));
    },

    matchesRegex(text, pattern) {
        return new RegExp(pattern).test(text);
    }
};

const reservedFunctions = new Map(Object.entries({
    min       : Math.min,
    max       : Math.max,
    Vector    : (x, y) => new Vector(x, y),
    List      : (...items) => new List(...items),
    TreeNode  : (...items) => new TreeNode(...items),
    decodeTree: decodeTree,
    Area      : (x, y, w, h) => new Area(x, y, w, h),
    Map       : (...args) => createHashMap(...args),
    Set       : (...items) => new Set(items),
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
    logn      : Math.log,
    log10     : Math.log10,
    log2      : Math.log2,
    tan       : Math.tan,
    atan      : Math.atan,
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
    matchesRegex  : stringFunctions.matchesRegex,
    splitString   : stringFunctions.split,
    Strings       : stringFunctions,
    toJSON        : (obj) => convertScriptObjectToJSON(obj),
    fromJSON      : (obj) => convertJSONToScriptObject(obj),
    forEach       : forEach,
    setObjectField: setObjectFieldFunc,
    Math          : SchemioScriptMath,

    Color         : (r,g,b,a) => new Color(r,g,b,a),
    decodeColor   : (text) => {const c = parseColor(text); return new Color(c.r, c.g, c.b, c.a)},

    numberToLocaleString: (value, locale) => parseFloat(value).toLocaleString(locale, {}),

    stripHTML : (html) => stripAllHtml(html),

    Fill          : Fill
}));



export class ASTMultiExpression extends ASTNode {
    /**
     * @param {Array<ASTNode>} nodes
     */
    constructor(nodes) {
        super('multi-expr');
        this.nodes = nodes;
    }

    print() {
        if (this.nodes.length === 1) {
            return this.nodes[0].print();
        }
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