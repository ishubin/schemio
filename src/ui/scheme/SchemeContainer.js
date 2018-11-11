
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
    }

    getItems() {
        return this.scheme.items;
    }
}


export default SchemeContainer;
