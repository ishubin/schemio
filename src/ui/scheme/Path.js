import utils from '../utils.js';

const Pattern = {
    SOLID:   'solid',
    DOTTED: 'dotted',
    DASHED: 'dashed',

    values() {
        return utils.enumerateConstants(this);
    },

    generateStrokeDashArray(pattern, width) {
        let dashArray = '';
        if (pattern === this.DOTTED) {
            dashArray =  width + ' ' + (width * 2);
        } else if (pattern === this.DASHED) {
            dashArray = (width * 4) + ' ' + (width * 4);
        }
        return dashArray;
    }
};

const CapType = {
    EMPTY:      'empty',
    ARROW:      'arrow',
    TRIANGLE:   'triangle',
    CIRCLE:     'circle',

    values() {
        return utils.enumerateConstants(this);
    }
};


export default {
    Pattern,
    CapType
};