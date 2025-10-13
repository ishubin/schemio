import { ASTNode } from "./nodes";

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
