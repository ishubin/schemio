

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

            let subDefObj = undefined;
            if (defaultObject.hasOwnProperty('*')) {
                subDefObj = defaultObject['*'];
            } else if (defaultObject.hasOwnProperty(field)) {
                subDefObj = defaultObject[field];
            }

            if (typeof subDefObj !== 'undefined') {
                if (typeof obj[field] === typeof subDefObj) {
                    if (Array.isArray(obj[field])) {
                        completeMatch = false;
                        resultingObject[field] = [];
                        if (Array.isArray(subDefObj) && subDefObj.length === 1) {
                            for (let i = 0; i < obj[field].length; i++) {
                                const nestedResult = defaultifyObject(obj[field][i], subDefObj[0]);
                                if (typeof nestedResult !== 'undefined') {
                                    resultingObject[field][i] = nestedResult;
                                } else {
                                    resultingObject[field][i] = {};
                                }
                            }
                            shouldCopy = false;
                        } else {
                            shouldCopy = true;
                        }
                    } else if (typeof obj[field] === 'object') {
                        const nestedResult = defaultifyObject(obj[field], subDefObj);
                        if (typeof nestedResult !== 'undefined') {
                            resultingObject[field] = nestedResult;
                            shouldCopy = false;
                            completeMatch = false;
                        } else {
                            shouldCopy = false;
                        }
                    } else if (obj[field] === subDefObj) {
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