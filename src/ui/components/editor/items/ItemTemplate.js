import shortid from "shortid";
import { forEachObject } from "../../../collections";
import { traverseItems } from "../../../scheme/Item";
import { enrichItemWithDefaults } from "../../../scheme/ItemFixer";
import { compileJSONTemplate, compileTemplateExpressions } from "../../../templater/templater";

/**
 *
 * @param {ItemTemplate} template
 * @param {String} templateRef
 * @returns {CompiledItemTemplate}
 */
export function compileItemTemplate(template, templateRef) {
    const initBlock = toExpressionBlock(template.init)
    const compiledControlBuilder = compileJSONTemplate({
        '$-eval': initBlock,
        controls: template.controls || []
    });

    return {
        name       : template.name,
        description: template.description,
        preview    : template.preview,
        defaultArea: template.defaultArea || {x: 0, y: 0, w: 350, h: 200, px: 0.5, py: 0.5, sx: 1, sy: 1},
        templateRef: templateRef,
        args       : template.args || {},
        buildItem  : compileJSONTemplate({
            '$-eval': template.init || [],
            ...template.item
        }),
        buildControls: (data, width, height) => compiledControlBuilder({...data, width, height}).controls.map(control => {
            const controlExpressions = [].concat(initBlock).concat(toExpressionBlock(control.click))
            const clickExecutor = compileTemplateExpressions(controlExpressions, {...data, width, height});
            return {
                ...control,
                click: () => {
                    return clickExecutor();
                }
            }
        }),

        getDefaultArgs() {
            const args = {};
            forEachObject(template.args || {}, (arg, argName) => {
                args[argName] = arg.value;
            });
            return args;
        }
    };
}

/**
 * @param {CompiledItemTemplate} template
 * @param {Object} args
 * @param {Number} width
 * @param {Number} height
 * @returns {Item}
 */
export function generateItemFromTemplate(template, args, width, height) {
    const item = template.buildItem({ ...args, width, height });
    item.area.w = width;
    item.area.h = height;

    traverseItems([item], it => {
        if (!it.args) {
            it.args = {};
        }
        // Storing id of every item in its args so that later, when regenerating templated item that is already in scene,
        // we can reconstruct other user made items that user attached to templated items
        it.args.templatedId = it.id;
        it.args.templated = true;
        enrichItemWithDefaults(it);
    });

    item.args.templateRef = template.templateRef;
    item.args.templateArgs = args;
    return item;
}


export function regenerateTemplatedItem(rootItem, template, templateArgs, width, height) {
    const regeneratedRootItem = generateItemFromTemplate(template, templateArgs, width, height);
    const regeneratedItemsById = new Map();
    traverseItems(regeneratedRootItem.childItems, (item, parentItem) => {
        if (parentItem) {
            item.meta.parentId = parentItem.id;
        }
        regeneratedItemsById.set(item.id, item);
    });

    const idOldToNewConversions = new Map();
    if (rootItem.args.templatedId) {
        idOldToNewConversions.set(rootItem.args.templatedId, rootItem.id);
    }

    // stores ids of templated items that were present in the origin rootItem
    // this way we can find out whether new templated items were added
    const existingTemplatedIds = new Set();
    traverseItems([rootItem], (item, parentItem, sortOrder) => {
        if (!item.args || !item.args.templatedId) {
            return;
        }

        existingTemplatedIds.add(item.args.templatedId);
        idOldToNewConversions.set(item.args.templatedId, item.id);

        const regeneratedItem = regeneratedItemsById.get(item.args.templatedId);
        if (!regeneratedItem) {
            if (!parentItem || !Array.isArray(parentItem.childItems)) {
                return;
            }

            parentItem.childItems.splice(sortOrder, 1);
            return;
        }

        for (let key in regeneratedItem) {
            let shouldCopyField = regeneratedItem.hasOwnProperty(key) && key !== 'id' && key !== 'meta' && key !== 'childItems' && key !== '_childItems';
            // for root item we should ignore area as it is defined by user and not by template
            if (!parentItem && key === 'area') {
                shouldCopyField = false;
            }
            if (shouldCopyField) {
                item[key] = regeneratedItem[key];
            }
        }
    });

    const findItemByTemplatedId = (items, templatedId) => {
        let queue = [].concat(items);
        while(queue.length > 0) {
            const item = queue.shift();
            if (item.args && item.args.templatedId === templatedId) {
                return item;
            }

            if (item.childItems && item.childItems.length > 0) {
                queue = queue.concat(item.childItems);
            }
        }
        return null;
    }

    const addNewGeneratedItemToOrigin = (templatedItem, templatedParentId, sortOrder) => {
        const parentItem = findItemByTemplatedId([rootItem], templatedParentId);
        if (!parentItem) {
            return;
        }
        traverseItems([templatedItem], item => {
            const newId = shortid.generate();
            idOldToNewConversions.set(item.id, newId);
            item.id = newId;
        });

        if (!parentItem.childItems) {
            parentItem.childItems = [];
        }
        parentItem.childItems.splice(Math.max(sortOrder, parentItem.childItems.length), 0, templatedItem);
    };

    const expectedSortOrders = new Map();

    traverseItems([regeneratedRootItem], (item, parentItem, sortOrder) => {
        expectedSortOrders.set(item.id, sortOrder);
        if (existingTemplatedIds.has(item.id || !parentItem)) {
            return;
        }

        addNewGeneratedItemToOrigin(item, parentItem.id, sortOrder);
    });

    const swappingItems = [];

    traverseItems([rootItem], (item, parentItem, sortOrder) => {
        if (!parentItem || !item.args || !item.args.templatedId) {
            return;
        }

        if (!expectedSortOrders.has(item.args.templatedId)) {
            return;
        }

        const expectedSortOrder = expectedSortOrders.get(item.args.templatedId);
        if (sortOrder !== expectedSortOrder) {
            swappingItems.push({parentItem, expectedSortOrder, sortOrder});
        }
    });

    swappingItems.forEach(({parentItem, expectedSortOrder, sortOrder}) => {
        const item = parentItem.childItems[sortOrder];
        parentItem.childItems.splice(sortOrder, 1)
        if (expectedSortOrder > sortOrder) {
            expectedSortOrder--;
        }

        parentItem.childItems.splice(expectedSortOrder, 0, item);
    });

    return idOldToNewConversions;
}

/**
 *
 * @param {Array<String>|String|undefined} block
 * @returns {Array<String>}
 */
function toExpressionBlock(block) {
    if (Array.isArray(block)) {
        return block;
    }
    if (typeof block === 'string') {
        return [block];
    }
    return [];
}