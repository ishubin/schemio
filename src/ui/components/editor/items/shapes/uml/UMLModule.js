/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_module',

        menuItems: [{
            group: 'UML',
            name: 'Module',
            iconUrl: '/assets/images/items/uml-module.svg',
            item: {
                textSlots: {
                    title: {text: '<b>Module</b>', halign: 'center'},
                    body: {text: '', halign: 'left'}
                },
            },
            size: {w: 140, h: 100}
        }],

        controlPoints: {
            make(item) {
                return {
                    brick: {
                        x: Math.min(item.shapeProps.brickWidth, item.area.w/2),
                        y: myMath.clamp(item.shapeProps.brickHeight, 0, item.area.h) * 4
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'brick') {
                    item.shapeProps.brickWidth = myMath.clamp(originalX + dx, 0, item.area.w / 2);
                    item.shapeProps.brickHeight = myMath.clamp((originalY + dy) / 4, 0, item.area.h / 4);
                }
            }
        },

        getPins(item) {
            const bw = Math.min(item.shapeProps.brickWidth, item.area.w/2) / 2;
            const w = item.area.w;
            const h = item.area.h;
            const W = item.area.w - bw;

            return [{
                x: bw + W /2, y: h/2
            }, {
                x: bw + W / 2, y: 0,
                nx: 0, ny: -1
            }, {
                x: bw + W / 2, y: h,
                nx: 0, ny: 1
            }, {
                x: bw, y: h/2,
                nx: -1, ny: 0
            }, {
                x: w, y: h/2,
                nx: 1, ny: 0
            }];
        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;

            const w = Math.min(item.shapeProps.brickWidth, item.area.w/2);
            const h = Math.min(item.shapeProps.brickHeight, item.area.h/4);

            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4, h, w);

            return `M ${W-R} ${H}  L ${w/2+R} ${H} `
                    +`a ${R} ${R} 0 0 1 ${-R} ${-R} `
                    +`L ${w/2} ${4*h} L ${w} ${4*h} L ${w} ${3*h} L ${w/2} ${3*h} L ${w/2} ${2*h} L ${w} ${2*h} L ${w} ${h} L ${w/2} ${h} L ${w/2} ${R}`
                    +`a ${R} ${R} 0 0 1 ${R} ${-R}   `
                    +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                    +`M 0 ${h} l ${w} 0  l 0 ${h} l ${-w} 0 Z`
                    +`M 0 ${3*h} l ${w} 0  l 0 ${h} l ${-w} 0 Z`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;

            const w = Math.min(item.shapeProps.brickWidth, item.area.w/2);
            const h = Math.min(item.shapeProps.brickHeight, item.area.h/4);

            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4, h, w);

            return `M ${W-R} ${H}  L ${w/2+R} ${H} `
                    +`a ${R} ${R} 0 0 1 ${-R} ${-R} `
                    +`L ${w/2} ${4*h} L 0 ${4*h} L 0 ${3*h} L ${w/2} ${3*h} L ${w/2} ${2*h} L 0 ${2*h} L 0 ${h} L ${w/2} ${h} L ${w/2} ${R}`
                    +`a ${R} ${R} 0 0 1 ${R} ${-R}   `
                    +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        getTextSlots(item) {
            const w = Math.max(item.shapeProps.brickWidth, 0);

            return [ {
                name: 'body',
                area: {x: w, y: 0, w: Math.max(0, item.area.w - w), h: item.area.h}
            }];
        },

        args: {
            cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
            brickWidth  : {type: 'number', value: '70', name: 'Brick Width'},
            brickHeight : {type: 'number', value: '20', name: 'Brick Height'},
        },
    },
}