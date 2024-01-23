import myMath from "../myMath";

/**
 * Vector class is used for easier handling of vectors in SchemioScript
 */
export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {Point} point
     */
    static fromPoint(point) {
        return new Vector(point.x, point.y);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalized() {
        const length = this.length();
        if (myMath.tooSmall(length)) {
            return new Vector(0, 0);
        }

        return new Vector(this.x / length, this.y / length);
    }

    toString() {
        return `{x: ${this.x}, y: ${this.y}}`;
    }

    inverse() {
        return new Vector(-this.x, -this.y);
    }

    /**
     *
     * @param {Vector} v
     * @returns {Number}
     */
    projection(v) {
        return myMath.projectVectorToVector(this.x, this.y, v.x, v.y);
    }

    _operator(operator, value) {
        if (operator === '+') {
            if (value instanceof Vector) {
                return this.plusVector(value);
            } else {
                throw new Error('Cannot sum vector and non-vector values');
            }
        } else if (operator === '-') {
            if (value instanceof Vector) {
                return this.minusVector(value);
            } else {
                throw new Error('Cannot sum vector and non-vector values');
            }
        } else if (operator === '*') {
            return this.multiply(value);
        } else if (operator === '/') {
            return this.divide(value);
        }

        throw new Error(`Operator ${operator} is not supported on Vector`);
    }

    /**
     * Called when vector is on the right side of operator
     * @param {String} operator
     * @param {*} value
     */
    _rightOperator(operator, value) {
        if (value instanceof Vector) {
            return value._operator(operator, this);
        }

        if (operator === '*') {
            return this.multiply(value);
        }

        const type = typeof value;
        throw new Error(`Unsupported operator: ${type} ${operator} Vector`);
    }

    /**
     * @param {Vector} v
     * @returns {Vector}
     */
    minusVector(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    /**
     * @param {Vector} v
     * @returns {Vector}
     */
    plusVector(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    multiply(value) {
        if (value instanceof Vector) {
            return this.x * value.x + this.y * value.y;
        }
        const type = typeof value;
        if (type !== 'number') {
            throw new Error('Cannot multiply vector by ' + type);
        }
        return new Vector(this.x * value, this.y * value);
    }

    divide(value) {
        const type = typeof value;
        if (type !== 'number') {
            throw new Error('Cannot divide vector by ' + type);
        }

        return new Vector(this.x / value, this.y / value);
    }
}

