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
    if (!obj) {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach(callback);
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