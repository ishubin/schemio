import utils from '../utils.js';

const Type = {
    STRAIGHT: 'straight',
    SMOOTH: 'smooth',

    values() {
        return utils.enumerateConstants(this);
    }
};

const Pattern = {
    LINE:   'line',
    DOTTED: 'dotted',
    DASHED: 'dashed',

    values() {
        return utils.enumerateConstants(this);
    }
};

const CapType = {
    ARROW:      'arrow',
    EMPTY:      'empty',
    TRIANGLE:   'triangle',
    CIRCLE:     'circle',

    values() {
        return utils.enumerateConstants(this);
    }
};


export default {
    Type,
    Pattern,
    CapType
};