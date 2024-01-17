/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";


const maxSkewRatioToHeight = 3;


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

            return {
                c: {
                    x: w/2, y: h/2,
                },
                t: {
                    x: w / 2, y: 0,
                    nx: 0, ny: -1
                },
                b: {
                    x: w / 2, y: h,
                    nx: 0, ny: 1
                },
                l: {
                    x: 0, y: h/2,
                    nx: -1, ny: 0
                },
                r: {
                    x: w-s, y: h/2,
                    nx: 1, ny: 0
                }
            };
        },

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computePath(item);
        },

        controlPoints: {
            make(item) {
                return {
                    skew: {
                        x: item.area.w - myMath.clamp(item.shapeProps.skew, 0, item.area.w/maxSkewRatioToHeight),
                        y: item.area.h/2
                    },
                };
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


