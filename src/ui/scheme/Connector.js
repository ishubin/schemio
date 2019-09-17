const Type = {
    STRAIGHT: 'straight',

    values() {
        return enumerateConstants(this);
    }
};

const Pattern = {
    LINE: 'line',
    DOTTED: 'dotted',
    DASHED: 'dashed',

    values() {
        return enumerateConstants(this);
    }
};

const CapType = {
    ARROW: 'arrow',
    EMPTY: 'empty',
    TRIANGLE: 'triangle',
    CIRCLE: 'circle',

    values() {
        return enumerateConstants(this);
    }
};

function enumerateConstants(obj) {
    const props = [];
    for (let key in obj) {
        // checking if property is all uppercase
        if (obj.hasOwnProperty(key) && key === key.toUpperCase()) {
            props.push(obj[key]);
        }
    }
    return props;
}

export default {
    Type,
    Pattern,
    CapType
};