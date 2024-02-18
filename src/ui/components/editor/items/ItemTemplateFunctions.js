/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import utils from '../../../utils';

/**
 * Creates and object that provides various functions, that could be used from inside of
 * template scripts (control handlers, etc.) to manipulate items in the template
 * @param {Item} rootItem
 * @returns {Object} an object that contains various functions that could be used from template
 */
export function createTemplateFunctions(rootItem) {
    return {
        findItemByTemplatedId: createFindItemByTemplatedIdFunc(rootItem),
        moveNativeChildren: moveNativeChildren(rootItem),

        clone: (obj) => utils.clone(obj)
    }
}

/**
 * @param {Item} rootItem
 * @returns {function(string): Item}
 */
function createFindItemByTemplatedIdFunc(rootItem) {
    return (itemId) => {
        return findItemByTemplatedId(rootItem, itemId);
    };
}

/**
 * Create a function for moving native (either non-templated or generated from other template) child items
 * from specified source to specified destination item
 * @param {Item} rootItem
 * @returns {function(string, string): void}
 */
function moveNativeChildren(rootItem) {
    return (srcId, dstId) => {
        const src = findItemByTemplatedId(rootItem, srcId);
        const dst = findItemByTemplatedId(rootItem, dstId);
        if (!src || !dst) {
            return;
        }
        dst.childItems = src.childItems || [];
        src.childItems = [];
    };
}

/**
 * Finds templated items by their templated id (do not confuse it with native id). Templated id is the id that is generated from the template itself
 * and is stored in item.args object.
 * @param {Item} rootItem templated item
 * @param {String} itemId templated id id. Do not confuse it with native item id (that is always unique per scene)
 */
function findItemByTemplatedId(rootItem, itemId) {
    if (!Array.isArray(rootItem.childItems)) {
        return null;
    }

    /** @type {Array<Item>} */
    let queue = [].concat(rootItem.childItems);

    while(queue.length > 0) {
        const item = queue.shift();
        if (item.args && item.args.templatedId === itemId) {
            return item;
        }
        // we want to stop traversing in case we reach another template root
        if (item.args && item.args.templatedId && !item.args.templateRef && Array.isArray(item.childItems)) {
            queue = queue.concat(item.childItems);
        }
    }
    return null;
}