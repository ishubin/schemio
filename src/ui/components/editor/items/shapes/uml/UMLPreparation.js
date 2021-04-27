import myMath from "../../../../../myMath";

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, w / 3);
    const cy = h/2;
    return `M ${s} 0 L ${w-s} 0 L ${w} ${cy} L ${w-s} ${h} L ${s} ${h} L 0 ${cy} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_preparation',

        menuItems: [{
            group: 'UML',
            name: 'Preparation',
            iconUrl: '/assets/images/items/uml-preparation.svg',
        }],

        computePath(item) {
            return computePath(item);
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}


