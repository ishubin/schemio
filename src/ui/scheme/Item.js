/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import utils from '../utils.js';
import Shape from '../components/editor/items/shapes/Shape';
import {getDefaultFont, getAllFonts} from './Fonts';
import {forEach, map, find} from '../collections.js';
import { defaultifyObject } from '../../defaultify';

export const ItemInteractionMode = {
    NONE:       'none',
    SIDE_PANEL: 'side-panel',
    TOOLTIP:    'tooltip',

    values() {
        return utils.enumerateConstants(this);
    }
};

export const textWhiteSpaceOptions = [{
    name: 'Wrap', value: 'normal'
}, {
    name: 'No Wrap', value: 'nowrap'
}, {
    name: 'Preserved', value: 'pre'
}, {
    name: 'Preserved + Wrap', value: 'pre-wrap'
}];

export const textSlotProperties = [
    {field: 'color', name: 'Color', type: 'color'},
    {field: 'bold', name: 'Bold', type: 'boolean'},
    {field: 'halign', name: 'Horizontal Align', type: 'choice', options: ['left', 'center', 'right']},
    {field: 'valign', name: 'Vertical Align', type: 'choice', options: ['top', 'middle', 'bottom']},
    {field: 'fontSize', name: 'Font Size', type: 'number'},
    {field: 'whiteSpace', name: 'White Space', type: 'choice', options: textWhiteSpaceOptions.map(x => x.value)},
    {field: 'font', name: 'Font', type: 'choice', options: map(getAllFonts(), font => font.name)},
    {field: 'paddingLeft', name: 'Padding Left', type: 'number'},
    {field: 'paddingRight', name: 'Padding Right', type: 'number'},
    {field: 'paddingTop', name: 'Padding Top', type: 'number'},
    {field: 'paddingBottom', name: 'Padding Bottom', type: 'number'},
    {field: 'letterSpacing', name: 'Letter spacing', type: 'number', min: 0},
];

export function prettyTextSlotProperty(propertyName) {
    for (let i = 0; i < textSlotProperties.length; i++) {
        if (textSlotProperties[i].field === propertyName) {
            return textSlotProperties[i].name;
        }
    }
    return propertyName;
}


export const DragType = {
    none: {
        id: 'none',
        name: 'None',
        description: 'Cannot be dragged'
    },
    free: {
        id: 'free',
        name: 'Free',
        description: 'Can be dragged and dropped anywhere on the scene'
    },
    path: {
        id: 'path',
        name: 'Path',
        description: 'Can be dragged only along specified path'
    },
    dragndrop: {
        id: 'dragndrop',
        name: 'Drag-n-drop',
        description: 'Can be dragged but has to be dropped to designated drop area, otherwise the item will return to its original position'
    }
}

export const defaultTextSlotProps = {
    text         : '',
    bold         : false,
    color        : 'rgba(0,0,0,1.0)',
    halign       : 'center',            // can be: left, center, right
    valign       : 'middle',            // can be: top, middle, bottom,
    fontSize     : 14,
    whiteSpace   : 'normal',
    font         : getDefaultFont(),
    paddingLeft  : 0,
    paddingRight : 0,
    paddingTop   : 0,
    paddingBottom: 0,
    letterSpacing: 0,
};


export const STANDARD_SHAPE_PROPS = {
    fill         : {type: 'solid', color: 'rgba(240,240,240,1.0)'},
    strokeColor  : 'rgba(30,30,30,1.0)',
    strokeSize   : 2,
    strokePattern: 'solid'
};

const defaultArea = {
    x:0, y: 0,
    w: 0, h: 0,
    r: 0,
    px: 0.5, py: 0.5, // pivot point coords relative to items width and height
    sx: 1.0,
    sy: 1.0
};

export const coreItemPropertyTypes = {
    opacity                    : {type: 'number', name: 'Opacity'},
    selfOpacity                : {type: 'number', name: 'Self opacity'},
    visible                    : {type: 'boolean', name: 'Visible'},
    clip                       : {type: 'boolean', name: 'Clip'},
    'behavior.dragging'        : {type: 'choice', name: 'Dragging', options: ['none', 'free', 'path', 'dragndrop']},
};

export const defaultItemDefinition = {
    area: defaultArea,
    opacity: 100,
    selfOpacity: 100,
    visible: true,
    tags: [],
    links: [],
    blendMode: 'normal',
    cursor: 'default',
    shape: 'none',
    clip: false,
    effects: [],
    textSlots: {
        '*': defaultTextSlotProps
    },
    description: '',
    interactionMode: ItemInteractionMode.TOOLTIP,
    behavior: {
        events: [],
        // specifies whether the item can be dragged
        // possible values are:
        //     - none        = no dragging
        //     - free        = free dragging
        //     - path        = user can drag the item but it is constrained by the path of specified items
        //     - dragndrop = user can only drag from one place to another
        dragging: 'none',
        dropTo: '',
        // element selector that contraints the dragging within the outline of specified item or group of items
        dragPath: '',
        // specifies whether it should align itself according to the path vector
        dragPathAlign: false,
        // correction angle for when the item is dragged by the path
        dragPathRotation: 0
    },
    shapeProps: {},
    tooltipBackground: 'rgba(230,230,230,1.0)',
    tooltipColor: 'rgba(30,30,30,1.0)',
};

export const defaultItem = {
    cursor: 'default',
    area: defaultArea,
    shape: 'empty',
    opacity: 100.0,
    blendMode: 'normal',
    name: '',
    description: '',
    links: [],
    textSlots: {},
    behavior: {
        events: [],
        // specifies whether the item can be dragged
        // possible values are:
        //     - none        = no dragging
        //     - free        = free dragging
        //     - path        = user can drag the item but it is constrained by the path of specified items
        //     - drag-n-drop = user can only drag from one place to another
        dragging: 'none',
        dropTo: '',
        // element selector that contraints the dragging within the outline of specified item or group of items
        dragPath: '',
    },

    // childItems: [], // used dynamically in case there are child items
    // _childItems: [], // used dynamically by components and it stores items that were copied from the referrence item. This field is ignored when saving or exporting
};

const shapePropsDefaults = {};

function getShapePropsDefaults(shapeId) {
    if (shapePropsDefaults[shapeId]) {
        return shapePropsDefaults[shapeId];
    }

    const shape = Shape.find(shapeId);
    if (shape) {
        shapePropsDefaults[shapeId] = {};
        forEach(shape.args, (arg, argName) => {
            shapePropsDefaults[shapeId][argName] = utils.clone(arg.value);
        });
        if (shape.shapeType === 'standard') {
            forEach(STANDARD_SHAPE_PROPS, (value, argName) => {
                shapePropsDefaults[shapeId][argName] = utils.clone(value);
            });
        }
        return shapePropsDefaults[shapeId];
    }

    return {};
}


export function defaultifyItem(item) {
    const shapeId = item.shape;
    const resultedItem = defaultifyObject(item, defaultItemDefinition);

    const resultedShapeProps = defaultifyObject(resultedItem.shapeProps, getShapePropsDefaults(shapeId));
    if (resultedShapeProps) {
        resultedItem.shapeProps = resultedShapeProps;
    } else {
        delete resultedItem.shapeProps;
    }
    return resultedItem;
}

/**
 * @param {Array<Item>} items
 * @param {TraverseItemCallback} callback
 */
export function traverseItems(items, callback) {
    _traverseItems(items, null, callback);
}

/**
 * @param {Array<Item>} items
 * @param {TraverseItemCallback} callback
 */
export function traverseItemsConditionally(items, callback) {
    _traverseItems(items, null, callback, true);
}

/**
 *
 * @param {Array<Item>} items
 * @param {Item} parentItem
 * @param {TraverseItemCallback} callback
 * @param {Boolean} conditionalTraversing whether to traverse items conditionally
 */
function _traverseItems(items, parentItem, callback, conditionalTraversing) {
    if (!Array.isArray(items)) {
        return;
    }

    items.forEach((item, sortOrder) => {
        const result = callback(item, parentItem, sortOrder);
        if (conditionalTraversing && !result) {
            // not traversing child items
            return;
        }

        if (item.childItems) {
            _traverseItems(item.childItems, item, callback, conditionalTraversing);
        }
        if (item._childItems) {
            const result = _traverseItems(item._childItems, item, callback, conditionalTraversing);
        }
    });
}

/**
 * @callback ItemPredicate
 * @param {Item} item
 * @returns {Boolean}
 */

/**
 * Finds item that matches the predicate using the breadth-first search algorithm
 * @param {Array<Item>} items
 * @param {ItemPredicate} predicate
 * @returns {Item}
 */
export function findFirstItemBreadthFirst(items, predicate) {
    let queue = [].concat(items);
    while(queue.length > 0) {
        const item = queue.shift();

        if (predicate(item)) {
            return item;
        }
        if (item.childItems && item.childItems.length > 0) {
            queue = queue.concat(item.childItems);
        }
        if (item._childItems && item._childItems.length > 0) {
            queue = queue.concat(item._childItems);
        }
    }
    return null;
}

/**
 * Finds item that matches the predicate using backwards depth-first search
 * This is usefull for testing elements in the order of top rendered first
 * @param {Array<Item>} items
 * @param {ItemPredicate} predicate
 * @returns {Item}
 */
export function findFirstItemBackwards(items, predicate) {
    for(let i = items.length - 1; i >= 0; i--) {
        const item = items[i];

        if (item.childItems) {
            const result = findFirstItemBackwards(item.childItems, predicate);
            if (result) {
                return result;
            }
        }
        if (item._childItems) {
            const result = findFirstItemBackwards(item._childItems, predicate);
            if (result) {
                return result;
            }
        }

        if (predicate(item)) {
            return item;
        }
    }

    return null;
}


/**
 *
 * @param {Item} item
 * @returns true if item has meaningfull description
 */
export function hasItemDescription(item) {
    /*
    This is very dirty but it is the simplest way to check if the item has a proper description
    If would only check for non-empty strings, then it would still show side panel
    even when description is an empty paragraph like "<p></p>"
    This happens when you use rich text editor and delete the entire description.
    Obviously it would be better to check for actual text elements inside the strings but it is also an overkill.
    */
    return item.description.trim().length > 8;
}

const _supportedStyleTypes = new Set([
    'color', 'advanced-color', 'stroke-pattern', 'path-cap', 'number'
]);

/**
 * Applies item styling (shapeProps) to item based on the shapeProps of reference item
 * It only applies simple props and does not change element selectors, path-points etc.
 * @param {Item} referenceItem
 * @param {Item} dstItem
 */
export function applyStyleFromAnotherItem(referenceItem, dstItem) {
    const srcShape = Shape.find(referenceItem.shape);
    if (!srcShape) {
        return;
    }

    const dstShape = Shape.find(dstItem.shape);
    if (!dstShape) {
        return;
    }

    forEach(referenceItem.shapeProps, (value, propName) => {
        const propDescriptor = Shape.getShapePropDescriptor(srcShape, propName);
        const dstPropDescriptor = Shape.getShapePropDescriptor(dstShape, propName);
        if (propDescriptor && dstPropDescriptor
            && propDescriptor.type === dstPropDescriptor.type
            && _supportedStyleTypes.has(propDescriptor.type)
            ) {
            dstItem.shapeProps[propName] = utils.clone(value);
        }
    });

    forEach(referenceItem.textSlots, (refTextSlot, slotName) => {
        if (!dstItem.textSlots.hasOwnProperty(slotName)) {
            return;
        }

        forEach(defaultTextSlotProps, (val, propName) => {
            if (propName === 'text') {
                return;
            }
            dstItem.textSlots[slotName][propName] = utils.clone(refTextSlot[propName]);
        })
    });
}

export function getItemPropertyDescriptionForShape(shape, propertyPath) {
    const corePropType = coreItemPropertyTypes[propertyPath];
    if (corePropType) {
        return corePropType;
    }
    if (shape && propertyPath.indexOf('shapeProps.') === 0) {
        const shapeArgName = propertyPath.substr('shapeProps.'.length);

        if (shape.shapeType === 'standard' && Shape.standardShapeProps.hasOwnProperty(shapeArgName)) {
            return Shape.standardShapeProps[shapeArgName];
        }
        if (shape.args.hasOwnProperty(shapeArgName)) {
            return shape.args[shapeArgName];
        }
    } else if (propertyPath.indexOf('textSlots.') === 0) {
        const secondDotPosition = propertyPath.indexOf('.', 'textSlots.'.length + 1);
        const textSlotField = propertyPath.substr(secondDotPosition + 1);
        const argumentDescription = find(textSlotProperties, textSlotProperty => textSlotProperty.field === textSlotField);
        if (argumentDescription) {
            return argumentDescription;
        }
    }
    return null;
}


export function computeRectPath(item) {
    const W = item.area.w;
    const H = item.area.h;
    return `M ${W} ${H}  L 0 ${H} L 0 ${0}  L ${W} 0  L ${W} ${H} Z`;
}

/**
 * Computes rect path in such a way that it cannot be filled. Used for items that don't need even layer (e.g. hud, dummy)
 * @param {*} item
 * @returns
 */
export function computeBrokenRectPath(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0 L ${w} 0  M ${w} 0 L ${w} ${h} M ${w} ${h} L 0 ${h} M 0 ${h} L 0 0`;
}
