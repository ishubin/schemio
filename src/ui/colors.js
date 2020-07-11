
function parseCommaSeparateRgba(text) {
    const arr = text.split(',');

    let r = 0, g = 0, b = 0, a = 1.0;
    
    if (arr.length > 0) {
        r = parseInt(arr[0]);
    }
    if (arr.length > 1) {
        g = parseInt(arr[1]);
    }
    if (arr.length > 2) {
        b = parseInt(arr[2]);
    }
    if (arr.length > 3) {
        a = parseFloat(arr[3]);
    }
    return {r,g,b,a};
}

/**
 * 
 * @param {Object} color structure of {r,g,b,a}
 */
export function encodeColor(c) {
    return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

/**
 * 
 * @param {String} text encoded color in rgb(), rgba(), or hex format
 * @returns {Object} {r,g,b,a} structure
 */
export function parseColor(text) {
    text = text.toLowerCase();
    try {
        const bracketIdx = text.indexOf('(');
        const closeBracketIdx = text.indexOf(')');
        if (bracketIdx > 0 && closeBracketIdx > 0) {
            const firstWord = text.substring(0, bracketIdx).trim();
            if (firstWord === 'rgb' || firstWord === 'rgba') {
                return parseCommaSeparateRgba(text.substring(bracketIdx+1, closeBracketIdx));
            }
        }
    } catch(e) {
        // do nothing
    }
    return {r: 0, g: 0, b: 0, a: 1.0};
}