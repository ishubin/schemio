
export class Scope {
    /**
     * @param {Object} data
     * @param {Scope|null} parent
     * @param {function(string): any} externalObjectProvider
     */
    constructor(data, parent, externalObjectProvider, stackName = '< unknown >') {
        this.data = data || {};
        this.astEncodedEntities = new Map();
        this.stackName = stackName;
        this.parent = parent;
        this.externalObjectProvider = externalObjectProvider;
    }

    hasVar(varName) {
        return this.data.hasOwnProperty(varName);
    }

    /**
     * Searches for raw AST nodes
     * This is used when you need to endcode a function back to a script
     * @param {string} name
     * @return {string}
     */
    getASTEncodedEntity(name) {
        if (this.astEncodedEntities.has(name)) {
            return this.astEncodedEntities.get(name);
        }
        if (this.parent) {
            return this.parent.getASTEncodedEntity(name);
        }
        return null;
    }

    setASTEncodedEntity(name, text) {
        this.astEncodedEntities.set(name, text);
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

    newScope(stackName = '< unknown >', data = {}) {
        return new Scope(data, this, this.externalObjectProvider, stackName);
    }

    getData() {
        return this.data;
    }
}