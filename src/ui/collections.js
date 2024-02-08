/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Searches of occurences of all names and tries to create a unique name
 * based on given namePrefix. It adds auto-incrementing index as a suffix
 * @param {string} namePrefix - a prefix for a name
 * @param {Array} names - array of existing names
 */
export function giveUniqueName(namePrefix, names) {
    let largestIndex = -1;

    for (let i = 0; i < names.length; i++) {
        const name = names[i];

        if (name.startsWith(namePrefix)) {
            const leftOverPart = name.substring(namePrefix.length).trim();
            if (leftOverPart.length > 0) {
                if (!isNaN(leftOverPart)) {
                    const index = parseInt(leftOverPart);
                    if (index > largestIndex) {
                        largestIndex = index;
                    }
                }
            } else {
                // looks like it already has the same name (we don't take empty space into account)
                // but first lets check if there already was a compination of namePrefix + index
                if (largestIndex < 0) {
                    largestIndex = 1;
                }
            }
        }
    }
    if (largestIndex >= 0) {
        return `${namePrefix} ${largestIndex+1}`;
    }
    return namePrefix;
}

export function forEach(obj, callback) {
    if (Array.isArray(obj)) {
        obj.forEach(callback);
        return;
    }

    forEachObject(obj, callback);
}

export function forEachObject(obj, callback) {
    if (!obj) {
        return;
    }
    if (typeof obj !== 'object') {
        return;
    }
    for(let name in obj) {
        if (obj.hasOwnProperty(name)) {
            callback(obj[name], name);
        }
    }
}

export function map(obj, callback) {
    if (Array.isArray(obj)) {
        return obj.map(callback);
    }

    return mapObjectValues(obj, callback);
}

export function mapObjectValues(obj, callback) {
    if (!obj) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }
    const newObj = {};
    for(let name in obj) {
        if (obj.hasOwnProperty(name)) {
            newObj[name] = callback(obj[name], name);
        }
    }
    return newObj;
}

/**
 *
 * @param {Array} arr
 * @param {Function} callback
 * @returns
 */
export function filter(arr, callback) {
    if (!Array.isArray(arr)) {
        return [];
    }
    return arr.filter(callback);
}

/**
 *
 * @param {Array} arr
 * @param {Function} callback
 * @returns
 */
export function find(arr, callback) {
    if (!Array.isArray(arr)) {
        return null;
    }
    return arr.find(callback);
}

/**
 *
 * @param {Array} arr
 * @param {Function} callback
 * @returns
 */
export function findIndex(arr, callback) {
    if (!Array.isArray(arr)) {
        return null;
    }
    return arr.findIndex(callback);
}

/**
 * 
 * @param {Object} obj 
 * @param {*} callback 
 * @returns 
 */
export function findKey(obj, callback) {
    if (!obj) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    for(let name in obj) {
        if (obj.hasOwnProperty(name)) {
            if (callback(obj[name], name)) {
                return name;
            }
        }
    }
    return null;
}

/**
 *
 * @param {Array} arr
 * @param {any|function(any):boolean} value
 * @returns {Number}
 */
export function indexOf(arr, value) {
    if (!Array.isArray(arr)) {
        return -1;
    }
    if (typeof value === 'function') {
        for (let i = 0; i < arr.length; i++) {
            if (value(arr[i], i)) {
                return i;
            }
        }
        return -1;
    } else {
        return arr.indexOf(value);
    }
}


/**
 *
 * @param {Array} arr
 * @returns {Array}
 */
export function uniq(arr) {
    if (!Array.isArray(arr)) {
        return [];
    }

    const s = new Set();

    return arr.filter(item => {
        if (s.has(item)) {
            return false;
        }
        s.add(item);
        return true;
    });
}