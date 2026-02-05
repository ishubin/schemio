import { encodeColor, hsl2rgb, rgb2hsl } from "../colors";

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

    hsl() {
        const c = rgb2hsl(this.r, this.g, this.b);
        return new ColorHSL(c.h, c.s, c.l, this.a);
    }
}

export class ColorHSL {
    constructor(h,s,l,a) {
        this.h = h;
        this.s = s;
        this.l = l;
        this.a = a;
    }

    rgb() {
        const c = hsl2rgb(this.h, this.s, this.l);
        return new Color(c.r, c.g, c.b, this.a);
    }
}