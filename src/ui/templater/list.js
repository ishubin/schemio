
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

    size() {
        return this.items.length;
    }
}