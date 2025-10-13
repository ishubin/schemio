import { ASTOperator } from "./astoperators";
import { FUNC_INVOKE, VAR_REF } from "./consts";


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
