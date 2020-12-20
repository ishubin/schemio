import utils from './ui/utils';

/**
 * Performs a deep scan and returns object without fields that are exactly the same as in default object
 * @param {Object} obj object that is supposed to be cleaned up
 * @param {Object} defaultObject an object representing the default object with default fields
 * @param {Object} options
 * @param {string} path path to the current object
 * @returns {Object} object with removed default fields
 */
export function defaultifyObject(obj, defaultObject, options, path) {
    if (!obj) {
        return null;
    }
    if (!path) {
        path = '';
    }

    const resultingObject = {};
    
    let completeMatch = true;

    for (let field in obj) {
        if (obj.hasOwnProperty(field)) {
            const fieldPath = `${path}/${field}`;
            let shouldCopy = true;

            let subDefObj = undefined;
            if (defaultObject.hasOwnProperty('*')) {
                // this means that all fields of the object should be checked
                // this is going to be applied for item.textSlots
                subDefObj = defaultObject['*'];
            } else if (defaultObject.hasOwnProperty(field)) {
                subDefObj = defaultObject[field];
            }

            if (options && options.customDefaultifiers && options.customDefaultifiers[fieldPath]) {
                shouldCopy = false;

                const nestedResult = options.customDefaultifiers[fieldPath](obj, obj[field]);
                if (nestedResult !== 'undefined') {
                    completeMatch = false;
                    resultingObject[field] = nestedResult;
                }
            } else if (typeof subDefObj !== 'undefined') {
                if (typeof obj[field] === typeof subDefObj) {

                    if (Array.isArray(obj[field])) {
                        resultingObject[field] = [];

                        if (Array.isArray(subDefObj) && subDefObj.length === 1) {
                            if (obj[field].length > 0) {
                                // if there is at least one item in array - we should not let it be removed completelly 
                                completeMatch = false;
                            }
                            for (let i = 0; i < obj[field].length; i++) {

                                const nestedResult = defaultifyObject(obj[field][i], subDefObj[0], options, `${fieldPath}/[]`);
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
                        const nestedResult = defaultifyObject(obj[field], subDefObj, options, `${fieldPath}`);
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


/**
 * Enriches object with defaults specified in another object.
 * It uses the same structure as 'defaultifyObject' function
 * @param {*} obj 
 * @param {*} defaultObj 
 */
export function enrichObjectWithDefaults(obj, defaultObj) {
    for (let field in defaultObj) {
        if (defaultObj.hasOwnProperty(field)) {
            const subDefObj = defaultObj[field]

            if (!obj.hasOwnProperty(field) || typeof obj[field] !== typeof subDefObj || (Array.isArray(subDefObj) && !Array.isArray(obj[field]))) {
                // in case they have different types - we should correct the object, otherwise it will be in broken state
                if (Array.isArray(subDefObj)) {
                    obj[field] = [];
                } else {
                    obj[field] = utils.clone(subDefObj);
                }
            } else {
                if (typeof subDefObj === 'object' && !Array.isArray(subDefObj)) {
                    enrichObjectWithDefaults(obj[field], subDefObj);
                } else if (Array.isArray(subDefObj) && subDefObj.length === 1) {
                    for (let i = 0; i < obj[field].length; i++) {
                        // enriching each array element
                        enrichObjectWithDefaults(obj[field][i], subDefObj[0]);
                    }
                }
            }
        }
    }
    return obj;
}