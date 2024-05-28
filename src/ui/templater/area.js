import myMath from "../myMath";

export class Area {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    overlaps(otherArea) {
        if (myMath.overlappingArea(this, otherArea)) {
            return true;
        }
        return false;
    }

    expand(otherArea) {
        const x1 = Math.min(this.x, otherArea.x);
        const y1 = Math.min(this.y, otherArea.y);
        const x2 = Math.max(this.x + this.w, otherArea.x + otherArea.w);
        const y2 = Math.max(this.y + this.h, otherArea.y + otherArea.h);
        this.x = x1;
        this.y = y1;
        this.w = x2 - x1;
        this.h = y2 - y1;
    }
};