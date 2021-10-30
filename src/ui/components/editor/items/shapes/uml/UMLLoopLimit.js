/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults';

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, Math.min(w / 4, h/2));
    return `M ${s} 0 L ${w-s} 0 L ${w} ${s} L ${w} ${h} L 0 ${h} L 0 ${s} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_loop_limit',

        menuItems: [{
            group: 'UML',
            name: 'Loop Limit',
            iconUrl: '/assets/images/items/uml-loop-limit.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            return computePath(item);
        },

        controlPoints: {
            make(item) {
                return {
                    skew: {
                        x: item.area.w - myMath.clamp(item.shapeProps.skew, 0, Math.min(item.area.w / 4, item.area.h/2)),
                        y: 0
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'skew') {
                    item.shapeProps.skew = myMath.clamp(item.area.w - originalX - dx, 0, Math.min(item.area.w/4, item.area.h/2));
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}



