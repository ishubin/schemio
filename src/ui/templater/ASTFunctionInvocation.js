import { FUNC_INVOKE, VAR_REF } from "./consts";
import { ASTNode, ASTVarRef } from "./nodes";



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
        if (!func || typeof func !== 'function') {
            if (this.functionProvider instanceof ASTVarRef) {
                throw new Error('Cannot resolve function: ', this.functionProvider.varName);
            } else {
                throw new Error('Cannot resolve function');
            }
        }
        return func(...args);
    }

    evalOnObject(scope, obj) {
        if (this.functionProvider.type !== VAR_REF) {
            throw new Error('Invalid function invocation on object: ' + obj);
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