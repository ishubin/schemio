


/**
 * Performs a deep scan and returns object without fields that are exactly the same as in default object
 * @param {Object} obj object that is supposed to be cleaned up
 * @param {Object} defaultObject an object representing the default object with default fields
 * @returns {Object} object with removed default fields
 */
function defaultifyObject(obj, defaultObject) {
    if (!obj) {
        return null;
    }

    const resultingObject = {};
    
    let completeMatch = true;

    for (let field in obj) {
        if (obj.hasOwnProperty(field)) {
            let shouldCopy = true;
            if (defaultObject.hasOwnProperty(field)) {
                if (typeof obj[field] === typeof defaultObject[field]) {
                    if (typeof obj[field] === 'object') {
                        const nestedResult = defaultifyObject(obj[field], defaultObject[field]);
                        if (typeof nestedResult !== 'undefined') {
                            resultingObject[field] = nestedResult;
                            shouldCopy = false;
                            completeMatch = false;
                        } else {
                            shouldCopy = false;
                        }

                    } else if (obj[field] === defaultObject[field]) {
                        shouldCopy = false;
                    }
                }
            }

            if (shouldCopy) {
                resultingObject[field] = obj[field];
                completeMatch = false;
            }
        }
    }
    
    if (completeMatch) {
        return undefined;
    }
    return resultingObject;
}

module.exports = {
    defaultifyObject
};