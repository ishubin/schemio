import {keys} from 'lodash';

const patterns = {
    solid(strokeSize) {
        return '';
    },
    dashed(strokeSize) {
        return `${strokeSize * 4} ${strokeSize * 4}`;
    },
    dotted(strokeSize) {
        return `${strokeSize} ${strokeSize * 2}`;
    }
};


export default {
    createDashArray(strokePattern, strokeSize) {
        const dashArrayFunc = patterns[strokePattern];
        if (dashArrayFunc) {
            return dashArrayFunc(strokeSize);
        }
        return '';
    },

    patterns: keys(patterns)
}