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