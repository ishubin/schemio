import {getStandardRectPins} from './ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'ellipse',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Ellipse',
            iconUrl: '/assets/images/items/ellipse.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },


        computePath(item) {
            const rx = item.area.w / 2;
            const ry = item.area.h / 2;
            return `M 0 ${ry} A ${rx} ${ry} 0 1 1 ${item.area.w} ${ry}  A ${rx} ${ry} 0 1 1 0 ${ry} Z`;
        }
    }
}