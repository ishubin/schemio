/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { forEach } from "./collections";

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
    const fieldCheckCallback = settings ? settings.fieldCheck: null;

    return _jsonDiff(originObject, modifiedObject, [], fieldCheckCallback);
}


/**
 *
 * @param {Object} originObject
 * @param {Object} modifiedObject
 * @param {Array} currentPath
 * @param {Function} fieldCheckCallback
 * @returns
 */
function _jsonDiff(originObject, modifiedObject, currentPath, fieldCheckCallback) {
    let changes = [];

    if (fieldCheckCallback && currentPath.length > 0 && !fieldCheckCallback(currentPath)) {
        return {changes: []};
    }

    if (isPrimitive(originObject) && originObject !== modifiedObject) {
        changes.push({
            path: currentPath,
            oldValue: originObject,
            value: modifiedObject
        });
    } else if (isObject(originObject)) {
        changes = changes.concat(_jsonDiffObject(originObject, modifiedObject, currentPath, fieldCheckCallback).changes);
    } else if (Array.isArray(originObject)) {
        changes = changes.concat(_jsonDiffArray(originObject, modifiedObject, currentPath, fieldCheckCallback).changes);
    }

    return {
        changes
    };

}

/**
 *
 * @param {Object} originObject
 * @param {Object} modifiedObject
 * @param {Array} currentPath
 * @param {Function} fieldCheckCallback
 * @returns
 */
function _jsonDiffObject(originObject, modifiedObject, currentPath, fieldCheckCallback) {

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
            const childChanges = _jsonDiff(value, modifiedObject[name], path, fieldCheckCallback);
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
 * @param {Function} fieldCheckCallback
 * @returns
 */
function _jsonDiffArray(origin, modified, currentPath, fieldCheckCallback) {
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
            const childChanges = _jsonDiff(value, modifiedObject[i], path, fieldCheckCallback);
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