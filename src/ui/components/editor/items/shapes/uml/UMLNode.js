/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from '../../../../../myMath';
import {getStandardRectPins} from '../ShapeDefaults'


const calculateD = (item) => {
    let D = item.shapeProps.depth;
    const minD = Math.min(item.area.w, item.area.h) / 2;
    if (D > minD) {
        D =  minD;
    }
    return D;
};


export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_node',

        menuItems: [{
            group: 'UML',
            name: 'Node',
            iconUrl: '/assets/images/items/uml-node.svg',
            size: {w: 140, h: 100}
        }],

        controlPoints: {
            make(item) {
                const D = calculateD(item);
                return {
                    depth: {
                        x: myMath.clamp(item.area.w - D, 0, item.area.w),
                        y: myMath.clamp(D, 0, item.area.h),
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'depth') {
                    item.shapeProps.depth = myMath.clamp(originalY + dy, 0, Math.min(item.area.w, item.area.h) / 2);
                }
            }
        },

        getPins(item) {
            return getStandardRectPins(item);
        },

        getTextSlots(item) {
            const D = calculateD(item);
            return [{
                name: 'body',
                area: {x: 0, y: D, w: item.area.w - D, h: item.area.h - D}
            }];
        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const D = calculateD(item);
            return `M 0 ${D}  L ${W-D} ${D}  L ${W-D} ${H} L 0 ${H} Z`
                    +`M 0 ${D} L ${D} 0 L ${W} 0 L ${W-D} ${D} Z`
                    +`M ${W-D} ${D} L ${W} 0 L ${W} ${H-D} L ${W-D} ${H} Z`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const D = calculateD(item);
            return `M 0 ${D}  L ${D} 0  L ${W} 0  L ${W} ${H-D} L ${W-D} ${H} L 0 ${H} Z`;
        },

        args: {
            depth: {type: 'number', value: 20, name: 'Depth'},
        },
    }
}