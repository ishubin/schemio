import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults';

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(h/2, 0, w);

    return `M 0 0 L ${w-s} 0 L ${w} ${h/2} L ${w-s} ${h} L 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_send_signal',

        menuItems: [{
            group: 'UML',
            name: 'Send Signal',
            iconUrl: '/assets/images/items/uml-send-signal.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computePath(item);
        },

        args: { },
    }
}

