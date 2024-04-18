
export class List {
    constructor (...items) {
        this.items = Array.isArray(items) ? items : [];
    }

    add(item) {
        this.items.push(item);
        return this;
    }

    remove(idx) {
        if (idx < 0 && idx >= this.items.length) {
            throw new Error(`Cannot remove ${idx} item from List: index out of bounds`);
        }
        this.items.splice(idx, 1);
        return this;
    }

    get(idx) {
        if (idx < 0 && idx >= this.items.length) {
            throw new Error(`Cannot get ${idx} item from List: index out of bounds`);
        }
        return this.items[idx];
    }

    first() {
        if (this.items.length === 0) {
            throw new Error('Cannot gert the first item from the List: no items in the list');
        }
        return this.items[0];
    }


    last() {
        if (this.items.length === 0) {
            throw new Error('Cannot gert the last item from the List: no items in the list');
        }
        return this.items[this.items.length - 1];
    }

    set(idx, value) {
        if (idx < 0 && idx >= this.items.length) {
            throw new Error(`Cannot set ${idx} item in List: index out of bounds`);
        }
        this.items[idx] = value;
        return this;
    }

    insert(idx, value) {
        if (idx < 0 && idx >= this.items.length) {
            throw new Error(`Cannot insert ${idx} item in List: index out of bounds`);
        }
        this.items.splice(idx, 0, value);
        return this;
    }

    pop() {
        return this.items.pop();
    }

    shift() {
        return this.items.shift();
    }

    forEach(callback) {
        this.items.forEach(callback);
    }

    /**
     *
     * @param {function} callback
     * @returns {List}
     */
    map(callback) {
        const mappedArray = this.items.map(callback);
        return new List(...mappedArray);
    }

    filter(predicate) {
        const filteredArray = this.items.filter(predicate);
        return new List(...filteredArray);
    }

    /**
     * @param {List|Array} otherList
     */
    extendList(otherList) {
        if (otherList instanceof List || otherList instanceof Array) {
            otherList.forEach(item => {
                this.items.push(item);
            });
        }
    }

    get size() {
        return this.items.length;
    }
}