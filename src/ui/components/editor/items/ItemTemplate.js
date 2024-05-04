/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import shortid from "shortid";
import { forEachObject } from "../../../collections";
import { traverseItems, traverseItemsConditionally } from "../../../scheme/Item";
import { enrichItemWithDefaults } from "../../../scheme/ItemFixer";
import { compileJSONTemplate, compileTemplateCall, compileTemplateExpressions } from "../../../templater/templater";
import { createTemplateFunctions } from "./ItemTemplateFunctions";
import { List } from "../../../templater/list";

const defaultEditor = {
    panels: []
};

function mockedFunc() {
}

/**
 * @param {String} editorId
 * @param {function(Object): Object} editorJSONBuilder
 * @param {Array<String>} initBlock
 * @param {Item} templateRootItem
 * @param {Object} data
 * @param {Array<String>} selectedItemIds
 */
function buildEditor(editorId, editorJSONBuilder, initBlock, templateRootItem, data, selectedItemIds) {
    // cloning selected items to make sure that the script cannot mutate items
    const extraData = {
        selectedItemIds: new List(...selectedItemIds),
        ...createTemplateFunctions(editorId, templateRootItem)
    };
    const finalData = {...data, ...extraData};

    const editor = editorJSONBuilder(finalData).editor;
    if (!editor || !Array.isArray(editor.panels)) {
        return defaultEditor;
    }

    return {
        panels: editor.panels.map(panel => {
            let condition = () => true;
            if (panel.condition) {
                condition = compileTemplateCall(panel.condition, finalData);
            }
            let click = null;
            if (panel.click) {
                const clickCallback = compileTemplateExpressions(initBlock.concat([panel.click]), {});
                click = (panelItem) => {
                    // panel click callback is supposed to return the object that contains the top-level scope fields
                    // This can be used in order to update template args in the template root item
                    const lastTemplateArgs = templateRootItem.args && templateRootItem.args.templateArgs ? templateRootItem.args.templateArgs : {};
                    // overriding scope with the last version of template args saved in the template root item.
                    // This part is important as it could be that the template args have changed through user clicking template controls
                    // and right after selecting a new item and clicking the editor panel item. Because of the last action the TemplateProperties component
                    // has not been updated and therefore the "data" variable in this function contains outdated template args

                    const clickData = {
                        ...lastTemplateArgs,
                        width: templateRootItem.area.w,
                        height: templateRootItem.area.h,
                        ...extraData,
                        on: mockedFunc,
                        panelItem
                    };
                    return clickCallback(clickData);
                };
            }

            const panelItems = (panel.items || []).map(item => {
                enrichItemWithDefaults(item);
                return item;
            });

            return {
                ...panel,
                items: panelItems,
                condition,
                click
            };
        }).filter(panel => {
            if (!panel.click) {
                return false;
            }
            const result = panel.condition();
            return result;
        })
    };
}

/**
 * @param {String} editorId
 * @param {ItemTemplate} template
 * @param {String} templateRef
 * @returns {CompiledItemTemplate}
 */
export function compileItemTemplate(editorId, template, templateRef) {
    const initBlock = toExpressionBlock(template.init);
    const compiledControlBuilder = compileJSONTemplate({
        '$-eval': initBlock,
        controls: template.controls || []
    });

    const itemBuilder = compileJSONTemplate({
        '$-eval': initBlock,
        item: template.item,
    });

    const editorJSONBuilder = compileJSONTemplate({
        '$-eval': initBlock,
        editor: template.editor || defaultEditor,
    });


    const eventExpressions = compileTemplateExpressions(initBlock, {});

    const defaultArgs = {};
    forEachObject(template.args, (arg, argName) => {
        defaultArgs[argName] = arg;
    });

    return {
        name       : template.name,
        description: template.description,
        preview    : template.preview,
        defaultArea: template.defaultArea || {x: 0, y: 0, w: 350, h: 200, px: 0.5, py: 0.5, sx: 1, sy: 1},
        templateRef: templateRef,
        args       : template.args || {},
        defaultArgs: defaultArgs,

        /**
         * @param {Item} rootItem
         * @param {String} eventName
         * @param  {...any} eventArgs
         * @returns {Object|null} returns updated template args. null if there were no subscribers for the event
         */
        triggerTemplateEvent : (rootItem, eventName, ...eventArgs) => {
            const allEventHandlers = [];
            const data = {
                ...defaultArgs,
                ...rootItem.args.templateArgs,
                ...createTemplateFunctions(editorId, rootItem),
                width: rootItem.area.w,
                height: rootItem.area.h,
                on: (eventName, callback) => {
                    allEventHandlers.push({eventName, callback});
                }
            };
            const updatedData = eventExpressions(data);

            let eventCalled = false;
            allEventHandlers.forEach(handler => {
                if (handler.eventName !== eventName) {
                    return;
                }
                handler.callback(...eventArgs);
                eventCalled = true;
            });

            if (!eventCalled) {
                return null;
            }

            const templateArgs = {};
            forEachObject(template.args, (argDef, argName) => {
                templateArgs[argName] = updatedData[argName];
            });
            if (updatedData.hasOwnProperty('width')) {
                templateArgs.width = updatedData.width;
            }
            if (updatedData.hasOwnProperty('height')) {
                templateArgs.height = updatedData.height;
            }
            return templateArgs;
        },
        buildItem : (args, width, height) => itemBuilder({
            ...args, width, height,
            on: mockedFunc
        }).item,
        buildEditor: (templateRootItem, args, width, height, selectedItemIds) => buildEditor(editorId, editorJSONBuilder, initBlock, templateRootItem, {...args, width, height, on: mockedFunc}, selectedItemIds),
        buildControls: (args, width, height) => compiledControlBuilder({...args, width, height, on: mockedFunc}).controls.map(control => {
            const controlExpressions = [].concat(initBlock).concat(toExpressionBlock(control.click));
            const clickExecutor = compileTemplateExpressions(controlExpressions, {...args, width, height, on: mockedFunc});
            return {
                ...control,

                /**
                 * @param {Item} item
                 * @returns {Object} updated data object which can be used to update the template args.
                 *                  Keep in mind that this object contains not only template args,
                 *                  but everything that was declared in the global scope of the template script
                 */
                click: (item) => {
                    return clickExecutor({control, ...createTemplateFunctions(editorId, item)});
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
    const item = template.buildItem(args, width, height);
    item.area.w = width;
    item.area.h = height;

    traverseItems([item], (it, parentItem) => {
        if (!it.args) {
            it.args = {};
        }
        // locking items by default unless a template specifically defines locking
        if (parentItem !== null && !it.hasOwnProperty('locked')) {
            it.locked = true;
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


/**
 * @param {Item} rootItem
 * @param {CompiledItemTemplate} template
 * @param {Object} templateArgs
 * @param {Number} width
 * @param {Number} height
 * @returns
 */
export function regenerateTemplatedItem(rootItem, template, templateArgs, width, height) {
    if (templateArgs.hasOwnProperty('width')) {
        width = templateArgs.width;
        rootItem.area.w = width;
    }
    if (templateArgs.hasOwnProperty('height')) {
        height = templateArgs.height;
        rootItem.area.h = height;
    }
    const finalArgs = {...template.getDefaultArgs()};
    forEachObject(template.args, (argDef, argName) => {
        if (templateArgs.hasOwnProperty(argName)) {
            finalArgs[argName] = templateArgs[argName];
        }
    });
    const regeneratedRootItem = generateItemFromTemplate(template, finalArgs, width, height);

    /** @type {Map<String, Item>} */
    const regeneratedItemsById = new Map();

    traverseItems([regeneratedRootItem], (item, parentItem) => {
        if (parentItem) {
            item.meta.parentId = parentItem.id;
        }
        regeneratedItemsById.set(item.id, item);
    });

    const idOldToNewConversions = new Map();
    if (rootItem.args.templatedId) {
        idOldToNewConversions.set(rootItem.args.templatedId, rootItem.id);
    }

    const forDeletion = [];

    // stores ids of templated items that were present in the origin rootItem
    // this way we can find out whether new templated items were added
    const existingTemplatedIds = new Set();
    traverseItemsConditionally([rootItem], (item, parentItem, sortOrder) => {
        if (!item.args || !item.args.templatedId) {
            return false;
        }

        if (parentItem && item.args.templateRef) {
            // this means that another template was attached to this template
            // therefor it should stop traversing its children so it does not confuse it for items of current template
            return false;
        }

        existingTemplatedIds.add(item.args.templatedId);
        idOldToNewConversions.set(item.args.templatedId, item.id);

        const regeneratedItem = regeneratedItemsById.get(item.args.templatedId);
        if (!regeneratedItem) {
            if (!parentItem || !Array.isArray(parentItem.childItems)) {
                // we don't want to delete root item but we do want to keep traversing its children
                return true;
            }

            forDeletion.push({parentItem, sortOrder});
            return false;
        }

        for (let key in regeneratedItem) {
            let shouldCopyField = regeneratedItem.hasOwnProperty(key) && key !== 'id' && key !== 'meta' && key !== 'childItems' && key !== '_childItems' && key !== 'textSlots';
            // for root item we should ignore area, name, tags, description as it is defined by user and not by template
            if (shouldCopyField && !parentItem) {
                shouldCopyField = key !== 'name' && key !== 'description' && key !== 'tags' && key !== 'area';
            }
            const propMatcher = createTemplatePropertyMatcher(regeneratedItem.args ? (regeneratedItem.args.templateIgnoredProps || []) : []);
            if (shouldCopyField) {
                if (key === 'shapeProps' && regeneratedItem.shapeProps) {
                    if (!item.shapeProps) {
                        item.shapeProps = {};
                    }
                    forEachObject(regeneratedItem.shapeProps, (value, propName) => {
                        if (!propMatcher(`shapeProps.${propName}`)) {
                            item.shapeProps[propName] = value;
                        }
                    });
                } else {
                    if (!propMatcher(key)) {
                        if (key === 'behavior') {
                            item.behavior = mergeItemBehavior(regeneratedItem.behavior, item.behavior);
                        } else {
                            item[key] = regeneratedItem[key];
                        }
                    }
                }
            }
        }
        return true;
    });

    for (let i = forDeletion.length - 1; i >= 0; i--) {
        const {parentItem, sortOrder} = forDeletion[i];
        parentItem.childItems.splice(sortOrder, 1);
    }

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

        if (parentItem) {
            addNewGeneratedItemToOrigin(item, parentItem.id, sortOrder);
        }
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
        return [block.join('\n')];
    }
    if (typeof block === 'string') {
        return [block];
    }
    return [];
}


/**
 * @param {Array<String>} props
 */
function createTemplatePropertyMatcher(props) {
    if (!Array.isArray(props)) {
        return () => false;
    }

    const regexEpressions = props.map(prop => new RegExp(prop));

    return (property) => {
        for (let i = 0; i < regexEpressions.length; i++) {
            if (regexEpressions[i].test(property)) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Removes any template specific arguments so that the item is not regenerated anymore
 * @param {Item} rootItem
 */
export function breakItemTemplate(rootItem) {
    traverseItems([rootItem], item => {
        if (item.args) {
            delete item.args.templateArgs;
            delete item.args.templateIgnoredProps;
            delete item.args.templateRef;
            delete item.args.templatedId;
            delete item.args.templated;
        }
        if (item.meta) {
            delete item.meta.templateRef;
            delete item.meta.templateRootId;
            delete item.meta.templated;
        }
    });
}


/**
 * Detects user added events and merges them with the templated ones
 * @param {ItemBehavior} templatedBehavior
 * @param {ItemBehavior} oldBehavior
 * @returns {ItemBehavior}
 */
function mergeItemBehavior(templatedBehavior, oldBehavior) {
    const events = [];

    /** @type {Map<String,Array<ItemBehaviorEvent>>} */
    const oldEvents = new Map();

    oldBehavior.events.forEach(event => {
        if (!oldEvents.has(event.event)) {
            oldEvents.set(event.event, [event]);
        } else {
            oldEvents.get(event.event).push(event);
        }
    });

    const uniqueEventIds = new Set();

    /** @type {function(ItemBehaviorEvent):void} */
    const pushEvent = (event) => {
        const id = uniqueEventIds.has(event.id) ? shortid.generate() : event.id;
        events.push({...event, id});
    };

    templatedBehavior.events.forEach(event => {
        const oldEventsArray = oldEvents.get(event.event);
        if (oldEventsArray) {
            oldEventsArray.shift();
        }
        pushEvent(event);
    });

    oldEvents.forEach(oldEventsArray => {
        if (oldEventsArray.length === 0) {
            return;
        }

        oldEventsArray.forEach(event => {
            pushEvent(event);
        });
    });

    return {...templatedBehavior, events};
}