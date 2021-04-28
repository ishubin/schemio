import myMath from "../../../../../myMath";

const maxSkewRatio = 2;

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, Math.min(w/maxSkewRatio, h/maxSkewRatio));
    return `M ${w} ${s} L ${w} ${h} L 0 ${h} L 0 0 L ${w-s} 0 Z  M ${w-s} 0 L ${w-s} ${s} L ${w} ${s}`;
}

function computeOutline(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, Math.min(w/maxSkewRatio, h/maxSkewRatio));
    return `M ${w} ${s} L ${w} ${h} L 0 ${h} L 0 0 L ${w-s} 0 Z`;
}

function makeSkewControlPoint(item) {
    return {
        x: item.area.w - myMath.clamp(item.shapeProps.skew, 0, Math.min(item.area.w / maxSkewRatio, item.area.h/maxSkewRatio)),
        y: 0
    };
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_note',

        menuItems: [{
            group: 'UML',
            name: 'Note',
            iconUrl: '/assets/images/items/uml-note.svg',
        }],

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computeOutline(item);
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
                    item.shapeProps.skew = myMath.clamp(item.area.w - originalX - dx, 0, Math.min(item.area.w/maxSkewRatio, item.area.h/maxSkewRatio));
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}




