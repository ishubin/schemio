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
    // 'behavior.dropTo'          : {type: 'element', name: 'Drop to'},
    // 'behavior.dragPath'        : {type: 'element', name: 'Drag path'},
    // 'behavior.dragPathAlign'   : {type: 'boolean', name: 'Drag path align'},
    // 'behavior.dragPathRotation': {type: 'number', name: 'Drag path rotation'},
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

export function traverseItems(items, callback) {
    _traverseItems(items, null, callback);
}

function _traverseItems(items, parentItem, callback) {
    if (!Array.isArray(items)) {
        return;
    }

    items.forEach(item => {
        callback(item, parentItem);
        if (item.childItems) {
            _traverseItems(item.childItems, item, callback);
        }
        if (item._childItems) {
            _traverseItems(item._childItems, item, callback);
        }
    });
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