import { ASTNode } from "./nodes";
import { Scope } from "./scope";


export class ASTEncoderRecorder extends ASTNode {

    /**
     *
     * @param {string} name
     * @param {string} text
     */
    constructor(name, text) {
        super('encoderRecorder')
        this.name = name;
        this.text = text;
    }

    /**
     *
     * @param {Scope} scope
     */
    evalNode(scope) {
        scope.setASTEncodedEntity(this.name, this.text);
    }

    print() {
        return '';
    }
}

export class ASTEncoder extends ASTNode {
    constructor(name) {
        super('encode');
        this.name = name;
    }

    /**
     *
     * @param {Scope} scope
     * @returns {string}
     */
    evalNode(scope) {
        const text = scope.getASTEncodedEntity(this.name);
        if (!text) {
            throw new Error(`Cannot encode unknown symbol: ${this.name}`);
        }

        return text;
    }

    print() {
        return `encode ${this.name}`;
    }
}