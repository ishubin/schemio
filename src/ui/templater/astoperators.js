import { ASTNode, ASTVarRef } from "./nodes";
import { Vector } from "./vector";

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
        return `(!${this.node.print()})`;
    }
}

export class ASTBitwiseNot extends ASTNode {
    constructor(node) {
        super('bitwiseNot');
        this.node = node;
    }
    evalNode(scope) {
        const v = this.node.evalNode(scope);
        return ~v;
    }

    print() {
        return `(~${this.node.print()})`;
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

export class ASTBitwiseAnd extends ASTOperator {
    constructor(a, b) { super('bitwiseAnd', '&', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) & this.b.evalNode(scope); }
}

export class ASTBitwiseOr extends ASTOperator {
    constructor(a, b) { super('bitwiseOr', '|', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) | this.b.evalNode(scope); }
}

export class ASTBitShiftLeft extends ASTOperator {
    constructor(a, b) { super('bitShiftLeft', '<<', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) << this.b.evalNode(scope); }
}

export class ASTBitShiftRight extends ASTOperator {
    constructor(a, b) { super('bitShiftRight', '>>', a, b); }
    evalNode(scope) { return this.a.evalNode(scope) >> this.b.evalNode(scope); }
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