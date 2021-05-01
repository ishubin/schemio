import myMath from "../../../../../myMath";


const maxSkewRatioToHeight = 3;

function makeSkewControlPoint(item) {
    return {
        x: item.area.w - myMath.clamp(item.shapeProps.skew, 0, item.area.w/maxSkewRatioToHeight),
        y: item.area.h/2
    };
}

function computePath(item) {
    const   w = item.area.w,
            h = item.area.h,
            s = myMath.clamp(item.shapeProps.skew, 0, item.area.w/maxSkewRatioToHeight),
            d = s / 2,
            k = item.area.h / 4,
            cy = h / 2;

    return `M ${w} ${h} L ${s} ${h}  Q 0 ${h-k} 0 ${cy}  Q 0 ${k} ${s} 0 L ${w} 0 Q ${w-s} ${k} ${w-s} ${cy} Q ${w-s} ${h-k} ${w} ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_storage',

        menuItems: [{
            group: 'UML',
            name: 'Storage',
            iconUrl: '/assets/images/items/uml-storage.svg',
        }],

        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const s = myMath.clamp(item.shapeProps.skew, 0, item.area.w/maxSkewRatioToHeight);

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
                x: w-s, y: h/2,
                nx: 1, ny: 0
            }];
        },

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computePath(item);
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
                    item.shapeProps.skew = myMath.clamp((item.area.w - originalX - dx), 0, item.area.w/maxSkewRatioToHeight);
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}


