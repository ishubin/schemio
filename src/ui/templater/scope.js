
export class Scope {
    /**
     * @param {Object} data
     * @param {Scope|null} parent
     * @param {function(string): any} externalObjectProvider
     */
    constructor(data, parent, externalObjectProvider) {
        this.data = data || {};
        this.parent = parent;
        this.externalObjectProvider = externalObjectProvider;
    }

    hasVar(varName) {
        return this.data.hasOwnProperty(varName);
    }

    getExternalObject(name) {
        if (!this.externalObjectProvider) {
            return null;
        }
        return this.externalObjectProvider(name);
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

    setLocal(varName, value) {
        this.data[varName] = value;
    }

    newScope(data = {}) {
        return new Scope(data, this, this.externalObjectProvider);
    }

    getData() {
        return this.data;
    }
}