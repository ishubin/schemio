import htmlSanitize, { stripAllHtml } from "../../htmlSanitize";
import { forEachObject } from "../collections";
import EditorEventBus from "../components/editor/EditorEventBus";
import Shape from "../components/editor/items/shapes/Shape";
import myMath from "../myMath";
import { localPointOnItem, worldPointOnItem } from "../scheme/ItemMath";
import { List } from "../templater/list";
import { Vector } from "../templater/vector";
import Events from "../userevents/Events";
import { sendEventToChildren } from "../userevents/functions/SendEventToChildrenFunction";
import { sendEventToParent } from "../userevents/functions/SendEventToParentFuction";


const IS_SOFT = true;


/**
 *
 * @param {Item} item
 * @param {SchemeContainer} schemeContainer
 * @param {Object} userEventBus
 * @returns {Object|null}
 */
export function createItemScriptWrapper(item, schemeContainer, userEventBus) {
    if (!item) {
        return null;
    }
    const emitItemChanged = () => {
        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
    };

    const withFloatValue = (callback) => {
        return (value) => {
            const fValue = parseFloat(value);
            if (isNaN(fValue)) {
                return;
            }
            callback(fValue);
            emitItemChanged();
        };
    };

    const withTransformUpdate = (callback) => {
        return (value) => {
            const fValue = parseFloat(value);
            if (isNaN(fValue)) {
                return;
            }
            callback(fValue);
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        };
    };

    const withTextSlot = (name, callback) => {
        if (!item || !item.textSlots || !item.textSlots.hasOwnProperty(name)) {
            return;
        }
        callback(item.textSlots[name]);
        emitItemChanged();
    };

    const shape = Shape.find(item.shape);

    const itemScope = {
        findParent: () => {
            let parentId = null;
            if (item && item.meta) {
                parentId = item.meta.parentId
            }
            return createItemScriptWrapper(schemeContainer.findItemById(parentId), schemeContainer, userEventBus);
        },

        getId() {
            return item.id;
        },

        getName() {
            return item.name;
        },

        getTags() {
            const tags = Array.isArray(item.tags) ? item.tags : [];
            return new List(...tags);
        },

        hasTag(tag) {
            if (!Array.isArray(item.tags)) {
                return false;
            }
            return item.tags.indexOf(tag) >= 0;
        },

        setVar(name, value) {
            if (!item.args) {
                item.args = {};
            }
            if (!item.args.customVars) {
                item.args.customVars = {};
            }

            item.args.customVars[name] = value;
        },

        getVar(name, defaultValue) {
            if (!item.args || !item.args.customVars || !item.args.customVars.hasOwnProperty(name)) {
                return defaultValue;
            }
            return item.args.customVars[name];
        },

        getPosX: () => item.area.x,
        getPosY: () => item.area.y,
        getPos: () => new Vector(item.area.x, item.area.y),
        getWidth: () => item.area.w,
        getHeight: () => item.area.h,
        getAngle: () => item.area.r,
        getScaleX: () => item.area.sx,
        getScaleY: () => item.area.sy,
        getShape: () => item.shape,

        /**
         * Converts local point to world
         * @param {Number} x
         * @param {Number} y
         */
        worldPoint: (x, y) => Vector.fromPoint(worldPointOnItem(x, y, item)),

        /**
         * Converts world point to local
         * @param {Number} x
         * @param {Number} y
         */
        localPoint: (x, y) => Vector.fromPoint(localPointOnItem(x, y, item)),

        getArg: (argName, defaultValue) => {
            if (item.args && item.args.hasOwnProperty(argName)) {
                return item.args[argName];
            }
            return defaultValue;
        },
        setArg: (argName, value) => {
            if (!item.args) {
                item.args = {};
            }
            item.args[argName] = value;
        },

        /**
         * Changes item translation so that its specified local point matches world point
         * @param {Number} x - x axis in local coordinates
         * @param {Number} y - y axis in local coordinates
         * @param {Number} wx - x axis in world coordinates
         * @param {Number} wy - y axis in world coordinates
         */
        matchWorld: (x, y, wx, wy) => {
            const translation = myMath.findTranslationMatchingWorldPoint( wx, wy, x, y, item.area, item.meta.transformMatrix);
            if (!translation) {
                return;
            }
            item.area.x = translation.x;
            item.area.y = translation.y;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },

        getWorldPos: () => Vector.fromPoint(worldPointOnItem(item.area.px * item.area.w, item.area.py * item.area.h, item)),
        setWorldPos: (x, y) => {
            let dstX = x, dstY = y;
            if (x instanceof Vector) {
                const v = x;
                dstX = v.x;
                dstY = v.y;
            }
            const p = myMath.findTranslationMatchingWorldPoint(dstX, dstY, item.area.px * item.area.w, item.area.py * item.area.h, item.area, item.meta.transformMatrix);
            if (!p) {
                return;
            }
            item.area.x = p.x;
            item.area.y = p.y;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },

        setAngle: withTransformUpdate(r => item.area.r = r),

        setPosX: withTransformUpdate(x => item.area.x = x),
        setPosY: withTransformUpdate(y => item.area.y = y),
        setPos: (x, y) => {
            let dstX = x, dstY = y;
            if (x instanceof Vector) {
                const v = x;
                dstX = v.x;
                dstY = v.y;
            }

            item.area.x = dstX;
            item.area.y = dstY;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },
        setWidth: withTransformUpdate(w => item.area.w = w),
        setHeight: withTransformUpdate(h => item.area.h = h),
        setScaleX: withTransformUpdate(sx => item.area.sx = sx),
        setScaleY: withTransformUpdate(sy => item.area.sy = sy),

        getOpacity: () => item.opacity,
        getSelfOpacity: () => item.selfOpacity,
        isVisible: () => item.visible && item.opacity !== 0,

        setOpacity: withFloatValue(opacity => item.opacity = opacity),
        setSelfOpacity: withFloatValue(opacity => item.SelfOpacity = opacity),

        getText: (slotName) => {
            if (!item.textSlots || !item.textSlots[slotName]) {
                return '';
            }
            const text = item.textSlots[slotName].text || '';
            return stripAllHtml(text.trim());
        },
        setText: (slotName, text) => withTextSlot(slotName, slot => slot.text = htmlSanitize('' + text)),
        setTextColor: (slotName, color) => withTextSlot(slotName, slot => slot.color = '' + color),
        setTextSize: (slotName, size) => {
            if (!isNaN(size)) {
                withTextSlot(slotName, slot => slot.fontSize = size);
            }
        },

        show() {
            // this is a special case when this function is invoked after Hide animation
            // Hide animation brings opacity all the way to 0,
            // if we don't handle it, it would be confusing for users
            if (!item.visible && item.opacity === 0) {
                item.opacity = 100;
            }
            item.visible = true;
            emitItemChanged();
        },

        hide() {
            item.visible = false;
            emitItemChanged();
        },

        sendEvent(eventName, ...args) {
            userEventBus.emitItemEvent(item.id, eventName, ...args);
        },

        sendEventToChildren(eventName, ...args) {
            sendEventToChildren(item, eventName, userEventBus, args);
        },

        sendEventToParent(eventName, ...args) {
            sendEventToParent(item, eventName, userEventBus, schemeContainer, args);
        },

        findChildItemByName(name) {
            return createItemScriptWrapper(findChildItemByName(item, name), schemeContainer, userEventBus);
        },

        tag(tagName) {
            if (!Array.isArray(item.tags)) {
                item.tags = [];
            }
            if (item.tags.indexOf(tagName) >= 0) {
                return;
            }

            item.tags.push(tagName);
            schemeContainer.indexItemTags(item.id, [tagName]);
        },

        findChildItemsByTag(tag) {
            const items = findChildItemsByTag(item, tag);
            return new List(...items.map(item => createItemScriptWrapper(item, schemeContainer, userEventBus)));
        },

        distanceToItem(anotherItem) {
            return distanceBetweenItems(item, anotherItem);
        },
        getValue() {
            if (item.args && item.args.hasOwnProperty('value')) {
                return item.args.value;
            }
            return 0;
        },
        setValue(value) {
            if (!item.args) {
                item.args = {};
            }
            item.args.value = value;
            EditorEventBus.item.userEvent.$emit(schemeContainer.editorId, item.id, Events.standardEvents.valueChange.id, value);
            emitItemChanged();
        },

        duplicate(newName) {
            const clonedItems = schemeContainer.cloneItems([item], true, false);
            const clonedItem = clonedItems[0];
            if (newName) {
                clonedItem.name = newName;
            }
            const parentItem = item.meta.parentId ? schemeContainer.findItemById(item.meta.parentId) : null;
            schemeContainer.addItem(clonedItem, parentItem);
            schemeContainer.indexUserEventsForItems([clonedItem], userEventBus, () => {});
            return createItemScriptWrapper(clonedItem, schemeContainer, userEventBus);
        },


        remove() {
            schemeContainer.deleteItem(item);
            userEventBus.clearEventsForItem(item.id);
        },

        removeChildItemsByTag(tagName) {
            const items = findChildItemsByTag(item, tagName);
            schemeContainer.deleteItems(items);
        },

        // remounts item to another item
        mount(otherItem) {
            if (!otherItem) {
                schemeContainer.remountItemToRoot(item.id);
            } else {
                schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, otherItem.getId());
            }
            schemeContainer.reindexItems();
        },
        mountChild(childItem) {
            if (childItem) {
                schemeContainer.remountItemInsideOtherItemAtTheBottom(childItem.getId(), item.id);
                schemeContainer.reindexItems();
            }
        },
        mountRoot: () => {
            schemeContainer.remountItemToRoot(item.id);
            schemeContainer.reindexItems();
        },

        assignEvent: (eventName, callback) => {
            userEventBus.subscribeItemEvent(item.id, item.name, eventName, callback);
        },

        getOutline: () => getItemOutlineFunction(item, schemeContainer),

        ...generateGettersAndSettersForShapeProps(item, shape, schemeContainer)
    };

    if (shape && shape.scriptFunctions) {
        const updatedScope = {
            ...itemScope,
            ...shape.scriptFunctions(schemeContainer.editorId, schemeContainer, item),
        };

        updatedScope.debugItem = createDebugItemFunc(updatedScope, item, schemeContainer.editorId);
        return updatedScope;
    }

    itemScope.debugItem = createDebugItemFunc(itemScope, item, schemeContainer.editorId);

    return itemScope;
}

/**
 * @param {Item} item
 * @param {*} shape
 * @param {SchemeContainer} schemeContainer
 */
function generateGettersAndSettersForShapeProps(item, shape, schemeContainer) {
    if (!shape) {
        return {};
    }
    const shapeArgs = Shape.getShapeArgs(shape);

    const methods = {};

    forEachObject(shapeArgs, (arg, name) => {
        const upperName = name.substring(0, 1).toUpperCase() + name.substring(1);
        methods['set' + upperName] = createShapePropSetter(item, name, arg, schemeContainer);
        methods['get' + upperName] = createShapePropGetter(item, name);
    });

    if (item.shape === 'math_block' && methods.hasOwnProperty('setExpression')) {
        methods.setExpression = createDelayedShapePropSetter(item, 'expression', methods.setExpression);
    }
    return methods;
}

/**
 * This function is a hack used to ensure that KaTeX formula does not get rerendered too often from user scripts.
 * In case of large formulas and if they get updated too fast - it can cause a browser crash
 * Thus this function ensures that the update of property is triggered not faster than every 80ms (12,5 fps)
 * @param {Item} item
 * @param {String} propName
 * @param {function(any):void} setter
 * @returns
 */
function createDelayedShapePropSetter(item, propName, setter) {
    const minTimeDiff = 80;

    return (value) => {
        if (!item.meta.hasOwnProperty('delayedPropSetterTimers')) {
            item.meta.delayedPropSetterTimers = {};
        }

        if (!item.meta.delayedPropSetterTimers.hasOwnProperty(propName)) {
            item.meta.delayedPropSetterTimers[propName] = {
                time: performance.now(),
                timerId: null,
                targetValue: value
            };
            setter(value);
            return;
        }

        const timer = item.meta.delayedPropSetterTimers[propName];

        const now = performance.now();
        const timeDiff = now - timer.time;
        if (timeDiff > minTimeDiff) {
            timer.time = now;
            if (timer.timerId) {
                clearTimeout(timer.timerId);
                timer.timerId = null;
            }
            timer.targetValue = value;
            setter(value);
        } else {
            timer.value = value;
            if (!timer.timerId) {
                timer.timerId = setTimeout(() => {
                    setter(item.meta.delayedPropSetterTimers[propName].value);
                    clearTimeout(item.meta.delayedPropSetterTimers[propName].timerId);
                    item.meta.delayedPropSetterTimers[propName].timerId = null;
                }, minTimeDiff - timeDiff);
            }
        }
    };
}

/**
 *
 * @param {Item} item
 * @param {String} name
 * @param {*} argDef
 * @param {SchemeContainer} schemeContainer
 * @returns
 */
function createShapePropSetter(item, name, argDef, schemeContainer) {
    return (value) => {
        item.shapeProps[name] = value;
        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id, 'shapeProps.' +  name);
    };
}

function createShapePropGetter(item, name) {
    return () => {
        return item.shapeProps[name];
    };
}

function findChildItemByName(item, name) {
    if (!item || !Array.isArray(item.childItems)) {
        return null;
    }

    let searchedItems = [].concat(item.childItems);

    // doing breadth search first
    while(searchedItems.length > 0) {
        const childItem = searchedItems.shift();
        if (!childItem) {
            return null;
        }
        if (childItem.name === name) {
            return childItem;
        }

        if (Array.isArray(childItem.childItems)) {
            searchedItems = searchedItems.concat(childItem.childItems);
        }
    }

    return null;
}

/**
 * @param {Item} item
 * @param {String} tag
 * @returns {Array<Item>}
 */
function findChildItemsByTag(item, tag) {
    if (!item || !Array.isArray(item.childItems)) {
        return [];
    }

    /** @type {Array<Item>} */
    let searchedItems = [].concat(item.childItems);

    const results = [];

    // doing breadth search first
    while(searchedItems.length > 0) {
        const childItem = searchedItems.shift();
        if (!childItem) {
            return results;
        }
        if (Array.isArray(childItem.tags) && childItem.tags.findIndex(itemTag => itemTag === tag) >= 0) {
            results.push(childItem);
        }

        if (Array.isArray(childItem.childItems)) {
            searchedItems = searchedItems.concat(childItem.childItems);
        }
    }

    return results;
}

function distanceBetweenItems(item1, item2) {
    const p1 = worldPointOnItem(item1.area.px * item1.area.w, item1.area.py * item1.area.h, item1);
    const p2 = worldPointOnItem(item2.area.px * item2.area.w, item2.area.py * item2.area.h, item2);

    return myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y)
}


function createDebugItemFunc(itemScope, item, editorId) {
    return () => {
        let text = `Item "${item.name}"\nx = ${item.area.x} y = ${item.area.y} width = ${item.area.w} height = ${item.area.h}`;
        const wp = worldPointOnItem(0, 0, item);
        text += `\nWorld: x = ${wp.x} y = ${wp.x}`;
        text += `\nRotation: ${item.area.r}`;
        text += `\nShape: ${item.shape}`;
        text += '\nFunctions:';
        for (let key in itemScope) {
            text += `\n    - ${key}`;
        }

        EditorEventBus.scriptLog.$emit(editorId, 'info', text);
        console.log(text);
    }
}

/**
 * @param {Item} item
 * @param {SchemeContainer} schemeContainer
 */
function getItemOutlineFunction(item, schemeContainer) {
    const svgPath = schemeContainer.getSvgOutlineOfItem(item);
    if (!svgPath) {
        return null;
    }

    return {
        getLength() {
            return svgPath.getTotalLength();
        },

        /**
         * @param {Number} length - length of the path
         */
        getWorldPointAtLength(length) {
            const p = svgPath.getPointAtLength(length);
            return Vector.fromPoint(worldPointOnItem(p.x, p.y, item));
        }
    };
}