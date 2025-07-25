/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import shortid from 'shortid';
import utils from '../../../utils';
import { traverseItems } from '../../../scheme/Item';
import EditorEventBus from '../EditorEventBus';
import { enrichItemWithDefaults } from '../../../scheme/ItemFixer';
import { createConnectionsFunctions } from '../../../scripting/connections';
import UserEventBus from '../../../userevents/UserEventBus';


const dummyUserEventBus = new UserEventBus();

/**
 * Creates an object that provides various functions, that could be used from inside of
 * template scripts (control handlers, etc.) to manipulate items in the template
 * @param {String} editorId
 * @param {Item} rootItem
 * @param {SchemeContainer} schemeContainer
 * @returns {Object} an object that contains various functions that could be used from template
 */
export function createTemplateFunctions(editorId, rootItem, schemeContainer) {
    return {
        findItemByTemplatedId: createFindItemByTemplatedIdFunc(rootItem),
        moveNativeChildren: moveNativeChildren(rootItem),
        copyNativeChildren: copyNativeChildren(rootItem),
        swapNativeChildren: swapNativeChildren(rootItem),
        duplicateItem: duplicateItem(rootItem),
        updateItem: updateItemFunc(editorId, rootItem),

        Connections: createConnectionsFunctions(schemeContainer, dummyUserEventBus),

        traverseItems: traverseItems,

        calculateTextSize,
        clone: (obj) => utils.clone(obj),
        log: (...args) => console.log(...args)
    }
}

const fontCorrections = {
    'Lucida Sans Unicode': 1.4,
    'Lucida Console': 1.47,
};

export function calculateTextSize(text, font, fontSize) {
    const canvas = calculateTextSize.canvas || (calculateTextSize.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${font}`;
    const metrics = context.measureText(text);
    let wk = 1;
    if (fontCorrections.hasOwnProperty(font)) {
        wk = fontCorrections[font];
    }
    return {
        w: metrics.width * wk,
        h: Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent)
    };
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
 * @param {String} editorId
 * @param {Item} rootItem
 * @returns {function(string,function(Item)):void}
 */
function updateItemFunc(editorId, rootItem) {
    return (itemId, callback) => {
        const item = findItemByTemplatedId(rootItem, itemId);
        if (!item) {
            return;
        }

        callback(item);
        // If template changes only the shape of the item, we need to make sure its shapeProps fields are valid
        enrichItemWithDefaults(item);
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
        EditorEventBus.schemeChangeCommitted.$emit(editorId);
    };
}


/**
 *
 * @param {Item} rootItem
 * @returns {function(string,string):void}
 */
function duplicateItem(rootItem) {
    return (srcId, dstId, name) => {
        const result = findItemAndParentByTemplatedId(rootItem, srcId);
        if (!result) {
            return;
        }
        const item = result.item;
        const parentItem = result.parentItem;

        /** @type {Item} */
        const newItem = {
            id: shortid.generate(),
            name: name,
            args: {
                templated: true,
                templatedId: dstId,
            }
        };
        for (let field in item) {
            if (item.hasOwnProperty(field) && field !== 'childItems' && field !== 'meta' && field !== 'args' && field !== 'id' && field !== 'name') {
                newItem[field] = utils.clone(item[field]);
            }
        }

        parentItem.childItems.push(newItem);
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
 * Create a function for copying native (either non-templated or generated from other template) child items
 * from specified source to specified destination item
 * @param {Item} rootItem
 * @returns {function(string, string): void}
 */
function copyNativeChildren(rootItem) {
    return (srcId, dstId) => {
        const src = findItemByTemplatedId(rootItem, srcId);
        const dst = findItemByTemplatedId(rootItem, dstId);
        if (!src || !dst) {
            return;
        }
        if (!Array.isArray(src.childItems)) {
            return;
        }
        if (!Array.isArray(dst.childItems)) {
            dst.childItems = [];
        }

        src.childItems.forEach(item => {
            if (item.args && item.args.templatedId && !item.args.templateRef) {
                return;
            }
            dst.childItems.push(copyNativeChildItem(item));
        });
    };
}

/**
 *
 * @param {Item} item
 */
function copyNativeChildItem(item) {
    const clonnedItem = utils.clone(item);
    traverseItems([clonnedItem], item => {
        item.id = shortid.generate();
        item.meta = {};
    });

    return clonnedItem;
}

/**
 * @param {Item} rootItem
 * @returns {function(string, string): void}
 */
function swapNativeChildren(rootItem) {
    return (srcId, dstId) => {
        const src = findItemByTemplatedId(rootItem, srcId);
        const dst = findItemByTemplatedId(rootItem, dstId);
        if (!src || !dst) {
            return;
        }
        const temp = dst.childItems;
        dst.childItems = src.childItems || [];
        src.childItems = temp;
    };
}

/**
 * Finds templated items by their templated id (do not confuse it with native id). Templated id is the id that is generated from the template itself
 * and is stored in item.args object.
 * @param {Item} rootItem templated item
 * @param {String} itemId templated id id. Do not confuse it with native item id (that is always unique per scene)
 * @returns {Item}
 */
function findItemByTemplatedId(rootItem, itemId) {
    if (rootItem.args && rootItem.args.templatedId === itemId) {
        return rootItem;
    }
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

/**
 *
 * @param {Item} parentItem
 * @param {String} itemId
 * @returns {Object}
 */
function findItemAndParentByTemplatedId(parentItem, itemId) {
    if (!Array.isArray(parentItem.childItems)) {
        return null;
    }

    for (let i = 0; i < parentItem.childItems.length; i++) {
        const item = parentItem.childItems[i];
        if (item.args && item.args.templated && !item.args.templateRef) {
            if (item.args.templatedId === itemId) {
                return {item, parentItem};
            }
            const result = findItemAndParentByTemplatedId(item, itemId);
            if (result) {
                return result;
            }
        }
    }
    return null;
}