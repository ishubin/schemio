/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
class QuadTreeNode {
    constructor(x, y, value) {
        this.point = { x, y };
        this.value = value;

        // north west
        /** @type {QuadTreeNode} */
        this.nw = null;
        // north east
        /** @type {QuadTreeNode} */
        this.ne = null;
        // south west
        /** @type {QuadTreeNode} */
        this.sw = null;
        // south east
        /** @type {QuadTreeNode} */
        this.se = null;
    }

    /**
     * 
     * @param {Number} x - value on x axis
     * @param {Number} y - value on y axis
     * @param {*} value - value that stored at this point
     */
    addPoint(x, y, value) {
        const newNode = new QuadTreeNode(x, y, value);
        if (x >= this.point.x && y >= this.point.y) {
            if (this.se) {
                this.se.addPoint(x, y, value);
            } else {
                this.se = newNode;
            }
        } else if (x <= this.point.x && y >= this.point.y) {
            if (this.sw) {
                this.sw.addPoint(x, y, value);
            } else {
                this.sw = newNode;
            }
        } else if (x >= this.point.x && y <= this.point.y) {
            if (this.ne) {
                this.ne.addPoint(x, y, value);
            } else {
                this.ne = newNode;
            }
        } else {
            if (this.nw) {
                this.nw.addPoint(x, y, value);
            } else {
                this.nw = newNode;
            }
        }
    }

    forEachInRange(x1, y1, x2, y2, callback) {
        if (x1 <= this.point.x && this.point.x <= x2 && y1 <= this.point.y && this.point.y <= y2) {
            callback(this.value, this.point);
        }

        if (this.se && (x1 >= this.point.x || x2 >= this.point.x) && (y1 >= this.point.y || y2 >= this.point.y)) {
            this.se.forEachInRange(x1, y1, x2, y2, callback);
        }
        if (this.sw && (x1 <= this.point.x || x2 <= this.point.x) && (y1 >= this.point.y || y2 >= this.point.y)) {
            this.sw.forEachInRange(x1, y1, x2, y2, callback);
        }
        if (this.ne && (x1 >= this.point.x || x2 >= this.point.x) && (y1 <= this.point.y || y2 <= this.point.y)) {
            this.ne.forEachInRange(x1, y1, x2, y2, callback);
        }
        if (this.nw && (x1 <= this.point.x || x2 <= this.point.x) && (y1 <= this.point.y || y2 <= this.point.y)) {
            this.nw.forEachInRange(x1, y1, x2, y2, callback);
        }
    }
}


// Quad Tree based index for storing points
export class SpatialIndex {
    
    constructor() {
        this.root = null;
    }

    /**
     * 
     * @param {Number} x - value on x axis
     * @param {Number} y - value on y axis
     * @param {*} value - value that stored at this point
     */
    addPoint(x, y, value) {
        if (!this.root) {
            this.root = new QuadTreeNode(x, y, value);
        } else {
            this.root.addPoint(x, y, value);
        }
    }

    forEachInRange(x1, y1, x2, y2, callback) {
        if (!this.root) {
            return [];
        }

        const result = [];
        this.root.forEachInRange(x1, y1, x2, y2, callback);
    }
}