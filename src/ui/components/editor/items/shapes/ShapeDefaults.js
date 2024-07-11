/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function getStandardRectPins(item) {
    const w = item.area.w;
    const h = item.area.h;
    return {
        c: {
            x: w/2, y: h/2,
        },
        t: {
            x: w / 2, y: 0,
            nx: 0, ny: -1
        },
        b: {
            x: w / 2, y: h,
            nx: 0, ny: 1
        },
        l: {
            x: 0, y: h/2,
            nx: -1, ny: 0
        },
        r: {
            x: w, y: h/2,
            nx: 1, ny: 0
        }
    };
}

export function createEllipsePath(w, h) {
    const rx = w / 2;
    const ry = h / 2;
    return `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${w} ${ry}  A ${rx} ${ry} 0 1 1 0 ${ry} Z`;

}

export function createRoundRectPath(w, h, cornerRadius) {
    const R = Math.min(cornerRadius, w/2, h/2);

    return `M ${w-R} ${h}  L ${R} ${h} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${w-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${w} ${h-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
}

export function createRectPath(w, h) {
    return `M ${w} ${h}  L 0 ${h}  L 0 0  L ${w} 0  L ${w} ${h} Z`;
}
