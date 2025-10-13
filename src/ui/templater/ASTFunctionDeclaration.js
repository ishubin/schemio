import { SchemioScriptError, ScopeInterruptValue } from "./error";
import { ASTNode } from "./nodes";
import { Scope } from "./scope";

export class ASTFunctionDeclaration extends ASTNode {
    /**
     * @param {Array<String>} argNames
     * @param {ASTNode} body
     * @param {String} funcName
     */
    constructor(argNames, body, funcName) {
        super('function');
        this.argNames = argNames;
        this.body = body;
        this.funcName = funcName;
    }
    print() {
        return `(${this.argNames.join(',')}) => {(${this.body.print()})}`;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        return (...args) => {
            const funcScope = scope.newScope('func ' + this.funcName);
            for (let i = 0; i < args.length && i < this.argNames.length; i++) {
                funcScope.setLocal(this.argNames[i], args[i]);
            }
            try {
                return this.body.evalNode(funcScope);
            } catch (err) {
                if (err instanceof SchemioScriptError) {
                    throw err;
                } else if (err instanceof ScopeInterruptValue) {
                    return err.value;
                } else {
                    throw new SchemioScriptError(err.message, funcScope, err);
                }
            }
        };
    }
}