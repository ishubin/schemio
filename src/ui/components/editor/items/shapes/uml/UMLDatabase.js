/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults'


const maxSkewRatioToHeight = 3;

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_database',

        menuItems: [{
            group: 'UML',
            name: 'Database',
            iconUrl: '/assets/images/items/uml-database.svg',
            size: {w: 100, h: 130}
        }],

        computePath(item) {
            const   w = item.area.w,
                    h = item.area.h,
                    s = myMath.clamp(item.shapeProps.skew, 0, item.area.h/maxSkewRatioToHeight),
                    d = s / 2,
                    k = item.area.w / 4,
                    cx = w / 2;
            
            return `M ${w} ${s} L ${w} ${h-s} C ${w} ${h-d}  ${w-k} ${h} ${cx} ${h} C ${k} ${h} 0 ${h-d} ${0} ${h-s} L ${0} ${s}`
                 + `C ${0} ${d} ${k} 0 ${cx} 0  C ${w-k} 0 ${w} ${d} ${w} ${s}`
                 + `C ${w} ${s+d} ${w-k} ${2*s} ${cx} ${2*s} C ${k} ${2*s} ${0} ${s+d} ${0} ${s}`;

        },

        getPins(item) {
            return getStandardRectPins(item);
        },

        computeOutline(item) {
            const   w = item.area.w,
                    h = item.area.h,
                    s = myMath.clamp(item.shapeProps.skew, 0, item.area.h/maxSkewRatioToHeight),
                    d = s / 2,
                    k = item.area.w / 4,
                    cx = w / 2;
            
            return `M ${w} ${s} L ${w} ${h-s} C ${w} ${h-d}  ${w-k} ${h} ${cx} ${h} C ${k} ${h} ${0} ${h-d} ${0} ${h-s} L ${0} ${s}`
                 + `C ${0} ${d} ${k} 0 ${cx} 0  C ${w-k} 0 ${w} ${d} ${w} ${s}`;
        },

        controlPoints: {
            make(item) {
                return {
                    skew: {
                        x: item.area.w/2,
                        y: myMath.clamp(item.shapeProps.skew, 0, item.area.h/maxSkewRatioToHeight) * 2
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'skew') {
                    item.shapeProps.skew = myMath.clamp((originalY + dy) / 2, 0, item.area.h/maxSkewRatioToHeight);
                }
            }
        },

        args: {
            skew: {type: 'number', value: 20, name: 'Skew'},
        },
    }
}
