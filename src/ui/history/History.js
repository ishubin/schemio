/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import utils from '../utils.js';

export default class History {
    constructor(options) {
        this.checkpoints = [];
        this.size = options.size || 30;
        this.currentPosition = 0;

        // Used to group commits
        this.lastAffinityId = null;
    }
    
    /**
     * Commits a modification of on object
     * @param {Object} obj - New version of modified object
     * @param {String} affinityId - Id of change which is used in order to group commits. If not specified, then commits will not be grouped
     */
    commit(obj, affinityId) {
        if (affinityId && affinityId === this.lastAffinityId) {
            this.checkpoints[this.currentPosition] = utils.clone(obj);
            return;
        }
            
        this.lastAffinityId = affinityId;

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
        this.lastAffinityId = null;
        if (this.currentPosition > 0) {
            this.currentPosition -= 1;
        }
        return this.current();
    }

    redo() {
        this.lastAffinityId = null;
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