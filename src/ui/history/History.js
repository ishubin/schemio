import utils from '../utils.js';

export default class History {
    constructor(options) {
        this.checkpoints = [];
        this.size = options.size || 30;
        this.currentPosition = 0;
    }
    
    commit(obj) {
        // erasing history in case commit was invoked after undoing
        if (this.currentPosition < this.checkpoints.length - 1 && this.currentPosition >= 0) {
            this.checkpoints.splice(this.currentPosition + 1, this.checkpoints.length - this.currentPosition);
        }

        // erasing old history in case it reached the limit
        if (this.checkpoints.length >= this.size) {
            this.checkpoints.shift();
        }
        this.checkpoints.push(utils.clone(obj));
        this.currentPosition = this.checkpoints.length - 1;
    }

    undo() {
        if (this.currentPosition > 0) {
            this.currentPosition -= 1;
        }
        return this.current();
    }

    redo() {
        if (this.currentPosition < this.checkpoints.length - 1) {
            this.currentPosition += 1;
        }
        return this.current();
    }

    current() {
        if (this.currentPosition < this.checkpoints.length) {
            return utils.clone(this.checkpoints[this.currentPosition]);
        } else {
            return null;
        }
    }

    /**
     * Returns true if it is able to undo
     */
    undoable() {
        return this.currentPosition > 0;
    }

    /**
     * Returns true if it is able to redo
     */
    redoable() {
        return this.currentPosition < this.checkpoints.length - 1;
    }
};