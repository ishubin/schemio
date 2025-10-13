import { ASTFunctionDeclaration } from "./ASTFunctionDeclaration";
import { ASTNode } from "./nodes";
import { Scope } from "./scope";


/**
 * @typedef {Object} StructFieldDefinition
 * @property {String} name
 * @property {ASTNode} value
 */

/**
 * @typedef {Object} StructFunctionDefinition
 * @property {String} name
 * @property {ASTFunctionDeclaration} body
 */


export class ASTStructNode extends ASTNode {
    /**
     * @param {String} name
     * @param {Array<StructFieldDefinition>} fieldDefinitions
     * @param {Array<StructFunctionDefinition>} functionDefinitions
     */
    constructor(name, fieldDefinitions, functionDefinitions) {
        super('struct');
        this.name = name;
        this.fieldDefinitions = fieldDefinitions;
        this.functionDefinitions = functionDefinitions;
    }

    /**
     * @param {Scope} scope
     */
    evalNode(scope) {
        const initFunc = (...args) => {
            const structObj = {};
            const structScope = scope.newScope('struct ' + this.name, {'this': structObj});

            this.fieldDefinitions.forEach((fieldDef, idx) => {
                if (idx < args.length) {
                    structObj[fieldDef.name] = args[idx];
                } else {
                    structObj[fieldDef.name] = fieldDef.value.evalNode(structScope);
                }
            });

            this.functionDefinitions.forEach(funcDef => {
                structObj[funcDef.name] = funcDef.body.evalNode(structScope);
            });

            return structObj;
        };

        scope.set(this.name, initFunc);
    }
}
