import {getStandardRectPins} from './ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'empty',

        id: 'none',

        menuItems: [{
            group: 'General',
            name: 'Text',
            iconUrl: '/assets/images/items/text.svg',
            item: {
                textSlots: {
                    body: {
                        text: 'Text ...'
                    }
                },
            }
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;
            return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
        },
        args: {},
    }
}