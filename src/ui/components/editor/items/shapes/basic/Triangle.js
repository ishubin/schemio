import myMath from "../../../../../myMath";

function makeSkewControlPoint(item) {
    return {
        x: item.area.w * item.shapeProps.skew / 100,
        y: 0
    }
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'basic_triangle',

        computePath(item) {
            const xs = item.area.w * item.shapeProps.skew / 100.0;
            return `M 0 ${item.area.h}  L ${xs} 0  L ${item.area.w} ${item.area.h} Z`;
        },

        controlPoints: {
            make(item, pointId) {
                if (!pointId) {
                    return {
                        skew: makeSkewControlPoint(item),
                    };
                } else if (pointId === 'skew') {
                    return makeSkewControlPoint(item);
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'skew') {
                    if (item.area.w > 0.01) {
                        item.shapeProps.skew = myMath.roundPrecise1(myMath.clamp((100 * (originalX + dx) / item.area.w), 0, 100));
                    }
                }
            }
        },

        getPins(item) {
            const s = item.area.w * item.shapeProps.skew / 100;
            return [{
                x: (s + item.area.w)/3,
                y: item.area.h*2/3
            }, {
                x: s,
                y: 0,
            }, {
                x: item.area.w,
                y: item.area.h
            }, {
                x: 0,
                y: item.area.h
            }, {
                x: s/2,
                y: item.area.h/2
            }, {
                x: s + (item.area.w - s) / 2,
                y: item.area.h/2
            }, {
                x: item.area.w/2,
                y: item.area.h
            }];
        },

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Triangle',
            iconUrl: '/assets/images/items/basic-triangle.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skew: 50}
            }
        }, {
            group: 'Basic Shapes',
            name: 'Left Triangle',
            iconUrl: '/assets/images/items/basic-triangle-left.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skew: 0}
            }
        }, {
            group: 'Basic Shapes',
            name: 'Right Triangle',
            iconUrl: '/assets/images/items/basic-triangle-right.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skew: 100}
            }
        }],

        args: {
            skew: {type: 'number', value: 50, min: 0, max: 100, name: 'Skew (%)'}
        }
    }
}