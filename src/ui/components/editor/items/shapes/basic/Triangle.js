/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'basic_triangle',

        computePath(item) {
            const xs = item.area.w * item.shapeProps.skewP / 100.0;
            return `M 0 ${item.area.h}  L ${xs} 0  L ${item.area.w} ${item.area.h} Z`;
        },

        controlPoints: {
            make(item) {
                return {
                    skewP: {
                        x: item.area.w * item.shapeProps.skewP / 100,
                        y: 0
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'skewP') {
                    if (item.area.w > 0.01) {
                        item.shapeProps.skewP = myMath.roundPrecise1(myMath.clamp((100 * (originalX + dx) / item.area.w), 0, 100));
                    }
                }
            }
        },

        getPins(item) {
            const s = item.area.w * item.shapeProps.skewP / 100;
            return {
                c: {
                    x: (s + item.area.w)/3,
                    y: item.area.h*2/3
                },
                c1: {
                    x: s,
                    y: 0,
                },
                c2: {
                    x: item.area.w,
                    y: item.area.h
                },
                c3: {
                    x: 0,
                    y: item.area.h
                },
                e1: {
                    x: s/2,
                    y: item.area.h/2
                },
                e2: {
                    x: s + (item.area.w - s) / 2,
                    y: item.area.h/2
                },
                e3: {
                    x: item.area.w/2,
                    y: item.area.h
                }
            };
        },

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Triangle',
            iconUrl: '/assets/images/items/basic-triangle.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skewP: 50}
            }
        }, {
            group: 'Basic Shapes',
            name: 'Left Triangle',
            iconUrl: '/assets/images/items/basic-triangle-left.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skewP: 0}
            }
        }, {
            group: 'Basic Shapes',
            name: 'Right Triangle',
            iconUrl: '/assets/images/items/basic-triangle-right.svg',
            item: {
                textSlots: { body: { valign: 'bottom', halign: 'center' } },
                shapeProps: {skewP: 100}
            }
        }],

        args: {
            skewP: {type: 'number', value: 50, min: 0, max: 100, name: 'Skew (%)'}
        }
    }
}