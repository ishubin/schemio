import myMath from "../../../../../myMath";

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const r = item.area.h / 2;
    const x2 = myMath.clamp(w-r, 0);
    const r2 = Math.min(r, w-x2);
    return `M 0 0 L ${x2} 0 A ${r2} ${r} 0 0 1 ${x2} ${h} L 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_delay',

        menuItems: [{
            group: 'UML',
            name: 'Delay',
            iconUrl: '/assets/images/items/uml-delay.svg',
        }],

        computePath(item) {
            return computePath(item);
        },

        args: { },
    }
}

