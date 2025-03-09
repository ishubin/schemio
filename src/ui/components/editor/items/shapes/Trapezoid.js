/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "../../../../myMath";
import { computeNPolyWithRoundingCorners, computeNPolyWithSharpCorners } from "./NPoly";


function computeTrapezoidPath(item) {
    const topLength = item.area.w * item.shapeProps.topRatio / 100.0;
    const topOffset = (item.area.w - topLength) * item.shapeProps.offset / 100.0;

    const segmentPoints = [
        {x: 0, y: item.area.h},
        {x: topOffset, y: 0},
        {x: topOffset + topLength, y: 0},
        {x: item.area.w, y: item.area.h},
    ];

    if (item.shapeProps.rounding > 0) {
        return computeNPolyWithRoundingCorners(segmentPoints, item.shapeProps.rounding);
    } else {
        return computeNPolyWithSharpCorners(segmentPoints);
    }
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'trapezoid',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Trapezoid',
            iconUrl: '/assets/images/items/trapezoid.svg',
        }],

        getPins(item) {
            const topLength = item.area.w * item.shapeProps.topRatio / 100.0;
            const topOffset = (item.area.w - topLength) * item.shapeProps.offset / 100.0;
            return {
                t: {
                    x: topOffset + topLength / 2, y: 0
                },
                b: {
                    x: item.area.w / 2, y: item.area.h
                },
                l: {
                    x: topOffset / 2, y: item.area.h / 2
                },
                r: {
                    x: (item.area.w + topOffset + topLength) / 2, y: item.area.h / 2
                }
            };
        },


        computePath(item) {
            return computeTrapezoidPath(item);
        },

        controlPoints: {
            make(item) {
                const topLength = item.area.w * item.shapeProps.topRatio / 100.0;
                const topOffset = (item.area.w - topLength) * item.shapeProps.offset / 100.0;
                return {
                    offset: {
                        x: topOffset,
                        y: 0
                    },
                    topRatio: {
                        x: item.area.w * item.shapeProps.topRatio / 100.0,
                        y: item.area.h
                    }
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                const topLength = item.area.w * item.shapeProps.topRatio / 100.0;
                const x = originalX + dx;

                if (controlPointName === 'offset') {
                    const topSpace = item.area.w - topLength;
                    if (myMath.tooSmall(topSpace)) {
                        item.shapeProps.offset = 0;
                        return;
                    }
                    item.shapeProps.offset = myMath.clamp(myMath.roundPrecise1(100 * x / topSpace), 0, 100);
                } else if (controlPointName === 'topRatio') {
                    if (myMath.tooSmall(item.area.w)) {
                        return;
                    }
                    item.shapeProps.topRatio = myMath.clamp(100 * x / item.area.w, 0, 100);
                }
            }
        },

        args: {
            topRatio: {type: 'number', value: 50, min: 0, max: 100, name: 'Top ratio (%)'},
            offset: {type: 'number', value: 50, min: 0, max: 100, name: 'Offset (%)'},
            rounding: {type: 'number', value: 0, name: 'Rounding (%)', min: 0, max: 100},
        }
    }
}