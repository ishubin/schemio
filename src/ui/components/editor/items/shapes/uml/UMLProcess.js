import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults';

const maxSkewRatio = 4;

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, w/maxSkewRatio);
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z  M ${s} 0 L ${s} ${h} M ${w-s} 0 L ${w-s} ${h}`;
}

function computeOutline(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
}


export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_process',

        menuItems: [{
            group: 'UML',
            name: 'Process',
            iconUrl: '/assets/images/items/uml-process.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computeOutline(item);
        },

        controlPoints: {
            make(item) {
                return {
                        skew: {
                        x: item.area.w - myMath.clamp(item.shapeProps.skew, 0, item.area.w / maxSkewRatio),
                        y: 0
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'skew') {
                    item.shapeProps.skew = myMath.clamp(item.area.w - originalX - dx, 0, item.area.w/maxSkewRatio);
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}