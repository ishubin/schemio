import utils from '../utils.js';
import Shape from '../components/editor/items/shapes/Shape';
import {getDefaultFont} from './Fonts';
import {forEach} from 'lodash';

export const ItemInteractionMode = {
    NONE:       'none',
    SIDE_PANEL: 'side-panel',
    TOOLTIP:    'tooltip',

    values() {
        return utils.enumerateConstants(this);
    }
};

export function enrichItemTextSlotWithDefaults(textSlot) {
    utils.extendObject(textSlot, {
        text: '',
        color: 'rgba(0,0,0,1.0)',
        halign: 'center',   // can be: left, center, right
        valign: 'middle',    // can be: top, middle, bottom,
        fontSize: 14,
        whiteSpace: 'normal',
        font: getDefaultFont(),
        padding: {
            left: 10,
            right: 10,
            top: 10,
            bottom: 10
        }
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