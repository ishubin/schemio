import utils from '../utils.js';
import Shape from '../components/editor/items/shapes/Shape';
import {getDefaultFont} from './Fonts';

export const ItemInteractionMode = {
    NONE:       'none',
    SIDE_PANEL: 'side-panel',
    TOOLTIP:    'tooltip',

    values() {
        return utils.enumerateConstants(this);
    }
};

export function enrichItemWithDefaults(item) {
    const props = {
        area: {x:0, y: 0, w: 0, h: 0, r: 0, type: 'relative'},
        groups: [],
        opacity: 100.0,
        selfOpacity: 100.0,
        visible: true,
        blendMode: 'normal',
        text: '',
        textProps: {
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
        },
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
    if (item.shape) {
        const shape = Shape.find(item.shape);
        if (shape) {
            _.forEach(shape.args, (arg, argName) => {
                props.shapeProps[argName] = arg.value;
            });
        }
    }
    utils.extendObject(item, props);
}