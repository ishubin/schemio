import myMath from "../../../../../myMath";

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(h/2, 0, w);

    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} L ${s} ${h/2} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_receive_signal',

        menuItems: [{
            group: 'UML',
            name: 'Receive Signal',
            iconUrl: '/assets/images/items/uml-receive-signal.svg',
        }],

        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const s = myMath.clamp(h/2, 0, w);

            return [{
                x: w/2, y: h/2,
            }, {
                x: w / 2, y: 0,
                nx: 0, ny: -1
            }, {
                x: w / 2, y: h,
                nx: 0, ny: 1
            }, {
                x: s, y: h/2,
                nx: -1, ny: 0
            }, {
                x: w, y: h/2,
                nx: 1, ny: 0
            }];
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


