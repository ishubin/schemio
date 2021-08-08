import forEach from 'lodash/forEach';

function isPrimitive(value) {
    const typeName = typeof value;

    return typeName === 'boolean' || typeName === 'string' || typeName === 'number';
}

function isObject(value) {
    return value !== null && typeof value === 'object';
}

/**
 * This function detects only modifications to the origin object. It does not detect additions or removals of array items and object fields
 * @param {*} originObject
 * @param {*} modifiedObject
 */
export function jsonDiff(originObject, modifiedObject, settings) {
    if (settings && settings.whitelist && isObject(originObject)) {
        return _jsonWhitelistedObject(originObject, modifiedObject, settings.whitelist);
    }
    return _jsonDiff(originObject, modifiedObject, []);
}


/**
 * 
 * @param {Object} originObject 
 * @param {Object} modifiedObject 
 * @param {Array} currentPath 
 * @returns 
 */
function _jsonDiff(originObject, modifiedObject, currentPath) {
    let changes = [];

    if (isPrimitive(originObject) && originObject !== modifiedObject) {
        changes.push({
            path: currentPath,
            oldValue: originObject,
            value: modifiedObject
        });
    } else if (isObject(originObject)) {
        changes = changes.concat(_jsonDiffObject(originObject, modifiedObject, currentPath).changes);
    } else if (Array.isArray(originObject)) {
        changes = changes.concat(_jsonDiffArray(originObject, modifiedObject, currentPath).changes);
    }

    return {
        changes
    };

}

function _jsonWhitelistedObject(originObject, modifiedObject, whitelist) {
    if (!isObject(modifiedObject)) {
        return {
            changes: [],
            oldValue: originObject,
            value: modifiedObject
        };
    }
    
    let changes = [];
    
    forEach(whitelist, (name) => {
        const path = [name];
        if (originObject.hasOwnProperty(name)) {
            if (modifiedObject.hasOwnProperty(name)) {
                const childChanges = _jsonDiff(originObject[name], modifiedObject[name], path);
                if (childChanges.changes.length > 0) {
                    changes = changes.concat(childChanges.changes);
                }
            } else {
                // we do not track deletions nor additions for now, only modifications
            }
        }

    });

    return {
        changes
    };
}

function _jsonDiffObject(originObject, modifiedObject, currentPath) {
    if (!isObject(modifiedObject)) {
        return {
            changes: currentPath,
            oldValue: originObject,
            value: modifiedObject
        };
    }

    let changes = [];
    
    forEach(originObject, (value, name) => {
        const path = currentPath.concat([name]);

        if (modifiedObject.hasOwnProperty(name)) {
            const childChanges = _jsonDiff(value, modifiedObject[name], path);
            if (childChanges.changes.length > 0) {
                changes = changes.concat(childChanges.changes);
            }
        } else {
            // we do not track deletions nor additions for now, only modifications
        }
    });

    return {
        changes
    };
}

/**
 * 
 * @param {Array} origin 
 * @param {Array} modified 
 * @param {Array} currentPath 
 * @returns 
 */
function _jsonDiffArray(origin, modified, currentPath) {
    if (!isArray(modifiedObject)) {
        return {
            changes: currentPath,
            oldValue: originObject,
            value: modifiedObject
        };
    }

    let changes = [];
    
    forEach(origin, (value, i) => {
        const path = currentPath.concat([i]);

        if (modified.length > i) {
            const childChanges = _jsonDiff(value, modifiedObject[i], path);
            if (childChanges.changes.length > 0) {
                changes = changes.concat(childChanges.changes);
            }
        } else {
            // we do not track deletions nor additions for now, only modifications
        }
    });

    return {
        changes
    };
}