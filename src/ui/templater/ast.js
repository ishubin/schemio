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

class ASTVarRef extends ASTNode {
    constructor(varName) {
        super('var-ref', varName);
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


function operatorPrecedence(operator) {
    if (operator === '*' || operator === '/' || operator === '%') {
        return 1;
    }
    return 0;
}


function operatorClass(operator) {
    if (operator === '+') {
        return ASTAdd;
    } else if (operator === '-') {
        return ASTSubtract;
    } else if (operator === '*') {
        return ASTMultiply;
    } else if (operator === '/') {
        return ASTDivide;
    } else if (operator === '%') {
        return ASTMod;
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

        let leftover = null;

        while(this.idx < this.tokens.length) {
            const token = this.peekToken();
            if (token === null || token.t === TokenTypes.END_BRACKET) {
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
                if (leftover) {
                    a = leftover(a);
                    leftover = null;
                }
            } else {
                leftover = createOpLeftover(a, opClass);
                a = b;
            }
        }

        if (leftover) {
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
            return new ASTVarRef(token.v);
        } else if (token.t === TokenTypes.OPERATOR && token.v === '-') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "-"');
            }
            return new ASTNegate(nextTerm);
        } else {
            throw new Error(`Unexpected token`);
        }
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