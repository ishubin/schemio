import keys from 'lodash/keys';

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

    patterns: keys(patterns),

    SOLID: 'solid',
    DASHED: 'dashed',
    DOTTED: 'dotted'
};