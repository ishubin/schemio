import utils from '../utils.js';
import Shape from '../components/editor/items/shapes/Shape';
import {getDefaultFont, getAllFonts} from './Fonts';
import forEach from 'lodash/forEach';
import map from 'lodash/map';

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
    {field: 'halign', name: 'Horizontal Align', type: 'choice', options: ['left', 'center', 'right']},
    {field: 'valign', name: 'Vertical Align', type: 'choice', options: ['top', 'middle', 'bottom']},
    {field: 'fontSize', name: 'Font Size', type: 'number'},
    {field: 'whiteSpace', name: 'White Space', type: 'choice', options: textWhiteSpaceOptions},
    {field: 'font', name: 'Font', type: 'choice', options: map(getAllFonts(), font => font.name)},
    {field: 'paddingLeft', name: 'Padding Left', type: 'number'},
    {field: 'paddingRight', name: 'Padding Right', type: 'number'},
    {field: 'paddingTop', name: 'Padding Top', type: 'number'},
    {field: 'paddingBottom', name: 'Padding Bottom', type: 'number'},
];

export function enrichItemTextSlotWithDefaults(textSlot) {
    utils.extendObject(textSlot, {
        text         : '',
        color        : 'rgba(0,0,0,1.0)',
        halign       : 'center',            // can be: left, center, right
        valign       : 'middle',            // can be: top, middle, bottom,
        fontSize     : 14,
        whiteSpace   : 'normal',
        font         : getDefaultFont(),
        paddingLeft  : 10,
        paddingRight : 10,
        paddingTop   : 10,
        paddingBottom: 10
    });
    return textSlot;
}

const STANDARD_SHAPE_PROPS = {
    fill         : {type: 'solid', color: 'rgba(240,240,240,1.0)'},
    strokeColor  : 'rgba(30,30,30,1.0)',
    strokeSize   : 2,
    strokePattern: 'solid'
};

function enrichItemWithStandardShapeProps(item) {
    forEach(STANDARD_SHAPE_PROPS, (value, argName) => {
        if (!item.shapeProps.hasOwnProperty(argName)) {
            item.shapeProps[argName] = value;
        }
    });
}

export function enrichItemWithDefaults(item) {
    const props = {
        area: {x:0, y: 0, w: 0, h: 0, r: 0, type: 'relative'},
        opacity: 100.0,
        selfOpacity: 100.0,
        visible: true,
        groups: [],
        blendMode: 'normal',
        textSlots: {},
        description: '',
        interactionMode: ItemInteractionMode.SIDE_PANEL,
        shapeProps: {},
        behavior: {
            events: []
        }
    };
    if (Array.isArray(item.behavior)) {
        item.behavior = {events: []};
    }
    utils.extendObject(item, props);

    const shape = Shape.find(item.shape);
    forEach(shape.args, (arg, argName) => {
        props.shapeProps[argName] = arg.value;
        if (!item.shapeProps.hasOwnProperty(argName)) {
            item.shapeProps[argName] = arg.value;
        }
    });

    if (shape.shapeType === 'standard') {
        enrichItemWithStandardShapeProps(item);
    }

    const textSlots = shape.getTextSlots(item);
    forEach(textSlots, slot => {
        const itemTextSlot = item.textSlots[slot.name] || {};
        item.textSlots[slot.name] = enrichItemTextSlotWithDefaults(itemTextSlot);
    });
}