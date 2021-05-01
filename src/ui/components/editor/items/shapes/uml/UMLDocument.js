function computePath(item) {
    const d = item.area.h / 8;
    const w = item.area.w;
    const h = item.area.h - d;
    const k = h / 2;
    return `M 0 0 L ${w} 0 L ${w} ${h} C ${w/2} ${h-k} ${w/2} ${h+k} 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_document',

        menuItems: [{
            group: 'UML',
            name: 'Document',
            iconUrl: '/assets/images/items/uml-document.svg',
        }],

        getPins(item) {
            const d = item.area.h / 8;
            const w = item.area.w;
            const h = item.area.h - d;
            const k = h / 2;
            return [{
                x: w/2, y: h/2,
            }, {
                x: w / 2, y: 0,
                nx: 0, ny: -1
            }, {
                x: w / 2, y: h,
                nx: 0, ny: 1
            }, {
                x: 0, y: h/2,
                nx: -1, ny: 0
            }, {
                x: w, y: h/2,
                nx: 1, ny: 0
            }];

        },

        computePath(item) {
            return computePath(item);
        },

        args: { },
    }
}

