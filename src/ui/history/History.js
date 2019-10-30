export default class History {
    constructor(options) {
        this.checkpoints = [];
        this.size = options.size || 30;
        this.currentPosition = 0;
    }
    
    commit(obj) {
        // erasing history in case commit was invoked after undoing
        if (this.currentPosition < this.checkpoints.length - 1 && this.currentPosition >= 0) {
            this.checkpoints.splice(this.currentPosition + 1, this.checkpoints.length - this.currentPosition - 1);
        }

        // erasing old history in case it reached the limit
        if (this.checkpoints.length >= this.size) {
            this.checkpoints.shift();
        }
        this.checkpoints.push(obj);
        this.currentPosition = this.checkpoints.length - 1;
    }

    undo() {
       if (this.currentPosition > 0) {
           this.currentPosition -= 1;
       }
    }

    redo() {
        if (this.currentPosition < this.checkpoints.length - 1) {
            this.currentPosition += 1;
        }
    }

    current() {
        if (this.currentPosition < this.checkpoints.length) {
            return this.checkpoints[this.currentPosition];
        } else {
            return null;
        }
    }
};