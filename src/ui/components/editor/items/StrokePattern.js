/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const patterns = {
    'solid': () => '',
    'dotted': (w) => `${w} ${w*2}`,
    'dashed': (w) => `${w*4} ${w*4}`,
    'dashed-2': (w) => `${w*4} ${w*2}`,
    'dashed-3': (w) => `${w*4} ${w*8}`,
    'dashed-dotted': (w) => `${w*4} ${w*2} ${w*2} ${w*2}`,
    'dashed-dotted-2': (w) => `${w*4} ${w} ${w} ${w}`,
    'dashed-dotted-3': (w) => `${w*8} ${w*4} ${w*4} ${w*4}`,
    'dashed-dotted-4': (w) => `${w*8} ${w*2} ${w*2} ${w*2}`,
};

export default {
    createDashArray(strokePattern, strokeSize) {
        const dashArrayFunc = patterns[strokePattern];
        if (dashArrayFunc) {
            return dashArrayFunc(strokeSize);
        }
        return '';
    },

    generateStrokeHtml(pattern, strokeWidth, y, w, h) {
        const dashArray = this.createDashArray(pattern, strokeWidth);
        return `<svg width="${w}px" height="${h}px">`
            + `<path d="M0 ${y} l ${w} 0" fill="none" stroke="#111111" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}"/>`
            + '</svg>';
    },

    patterns: Object.keys(patterns),

    SOLID: 'solid',
    DASHED: 'dashed',
    DOTTED: 'dotted'
};