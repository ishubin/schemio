
export class Scope {
    constructor(data, parent) {
        this.data = data || {};
        this.parent = parent;
    }

    hasVar(varName) {
        return this.data.hasOwnProperty(varName);
    }

    get(varName) {
        if (this.data.hasOwnProperty(varName)) {
            return this.data[varName];
        }
        if (this.parent) {
            return this.parent.get(varName);
        }
        throw new Error(`"${varName}" was not defined`);
    }

    findScopeWithVar(varName) {
        if (this.data.hasOwnProperty(varName)) {
            return this;
        }
        if (this.parent) {
            return this.parent.findScopeWithVar(varName);
        }
        return null;
    }

    set(varName, value) {
        let scope = this.findScopeWithVar(varName);
        if (!scope) {
            scope = this;
        }
        scope.data[varName] = value;
    }

    newScope(data = {}) {
        return new Scope(data, this);
    }

    getData() {
        return this.data;
    }
}