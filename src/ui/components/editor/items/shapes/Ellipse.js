import {getStandardRectPins} from './ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'ellipse',

        menuItems: [{
            group: 'General',
            name: 'Ellipse',
            iconUrl: '/assets/images/items/ellipse.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },


        computePath(item) {
            const rx = item.area.w / 2;
            const ry = item.area.h / 2;
            return `M ${rx} ${item.area.h} a ${rx} ${ry} 0 1 1 1 0 Z`;
        }
    }
}