import { resetHistory } from "sinon";

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
        if (x > this.point.x && y > this.point.y) {
            this.se = insertPoint(this.se, x, y, value);

        } else if (x < this.point.x && y > this.point.y) {
            this.sw = insertPoint(this.sw, x, y, value);

        } else if (x > this.point.x && y < this.point.y) {
            this.ne = insertPoint(this.ne, x, y, value);

        } else {
            this.nw = insertPoint(this.nw, x, y, value);
        }
    }

    forEachInRange(x1, y1, x2, y2, callback) {
        if (x1 <= this.point.x && this.point.x <= x2 && y1 <= this.point.y && this.point.y <= y2) {
            callback(this.point, this.value);
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

function insertPoint(node, x, y, value) {
    if (!node) {
        return new QuadTreeNode(x, y, value);
    }
    node.addPoint(x, y, value);
    return node;
}


// Quad Tree based index for storing points
export class GeoIndex {
    
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