export class SchemioScriptError extends Error{
    constructor(message, scope, error) {
        super(message);
        this.message = message;
        this.scope = scope;
        this.error = error;
    }

    print() {
        let fullMessage = this.message;

        let scope = this.scope;
        while(scope) {
            fullMessage += '\n\tat ' + scope.stackName;
            scope = scope.parent;
        }
        console.error(fullMessage);
    }
}


// This is a temporary solution for handling `return` statements
// until I refactor all of the `evalNode` functions on all of the AST nodes
export class ScopeInterruptValue {
    constructor(value) {
        this.value = value;
    }
}