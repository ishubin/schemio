/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";


function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const s = myMath.clamp(item.shapeProps.skew, 0, w / 2);

    return `M ${s} 0 L ${w} 0 L ${w-s} ${h} L 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_input',

        menuItems: [{
            group: 'UML',
            name: 'Input/Output',
            iconUrl: '/assets/images/items/uml-input.svg',
            size: {w: 140, h: 100}
        }],

        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const s = myMath.clamp(item.shapeProps.skew, 0, item.area.w/2);
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
                r: {
                    x: s/2, y: h/2,
                    nx: -1, ny: 0
                },
                l: {
                    x: w - s/2, y: h/2,
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
                        x: myMath.clamp(item.shapeProps.skew, 0, item.area.w/2),
                        y: 0
                    }
                };
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
