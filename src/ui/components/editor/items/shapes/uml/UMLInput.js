import myMath from "../../../../../myMath";

function makeSkewControlPoint(item) {
    return {
        x: myMath.clamp(item.shapeProps.skew, 0, item.area.w/2),
        y: 0
    };
}

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, w / 2);

    return `M ${s} 0 L ${w} 0 L ${w-s} ${h} L 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

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
                    item.shapeProps.skew = myMath.clamp((originalX + dx), 0, item.area.w/2);
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}
