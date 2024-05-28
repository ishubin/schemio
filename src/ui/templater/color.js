import { encodeColor } from "../colors";

export class Color {
    constructor(r,g,b,a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    encode() {
        return encodeColor(this);
    }

    /**
     * @param {Color} anotherColor
     * @param {Number} t value between 0 and 1
     */
    gradient(anotherColor, t) {
        return new Color(
            this.r * (1 - t) + anotherColor.r * t,
            this.g * (1 - t) + anotherColor.g * t,
            this.b * (1 - t) + anotherColor.b * t,
            this.a * (1 - t) + anotherColor.a * t,
        );
    }
}