function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        // id is used in order to register in Shape Registry
        // this will be the identifier that is specified with "shape" field in items
        id: 'rect',

        // menuItems is used in order to display shape in the items menu (left panel)
        menuItems: [{
            group: 'General',
            name: 'Rect',
            iconUrl: '/assets/images/items/rect.svg',
            item: {
                shapeProps: {cornerRadius: 0}
            }
        }, {
            group: 'General',
            name: 'Rounded Rect',
            iconUrl: '/assets/images/items/rounded-rect.svg',
            item: {
                shapeProps: {cornerRadius: 20}
            }
        }],

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        editorProps: {},

        controlPoints: {
            make(item, pointId) {
                if (!pointId) {
                    return {
                        cornerRadius: makeCornerRadiusControlPoint(item),
                    };
                } else if (pointId === 'cornerRadius') {
                    return makeCornerRadiusControlPoint(item);
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, item.area.w - Math.max(item.area.w/2, originalX + dx));
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: 0, name: 'Corner radius', min: 0},
        }
    }
};