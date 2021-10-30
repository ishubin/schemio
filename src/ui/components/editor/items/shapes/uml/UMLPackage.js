/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_package',

        menuItems: [{
            group: 'UML',
            name: 'Package',
            iconUrl: '/assets/images/items/uml-package.svg',
            size: {w: 140, h: 100}
        }],

        controlPoints: {
            make(item) {
                return {
                    brick: {
                        x: Math.min(item.shapeProps.brickWidth, item.area.w/2),
                        y: myMath.clamp(item.shapeProps.brickHeight, 0, item.area.h/2)
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'brick') {
                    item.shapeProps.brickWidth = myMath.clamp(originalX + dx, 0, item.area.w / 2);

                    item.shapeProps.brickHeight = myMath.clamp((originalY + dy), 0, item.area.h / 2);
                }
            }
        },


        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const bh = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);
            const H = h - bh;

            return [{
                x: w/2, y: bh + H/2,
            }, {
                x: w / 2, y: bh,
                nx: 0, ny: -1
            }, {
                x: w / 2, y: h,
                nx: 0, ny: 1
            }, {
                x: 0, y: bh + H/2,
                nx: -1, ny: 0
            }, {
                x: w, y: bh + H/2,
                nx: 1, ny: 0
            }];

        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const BW = Math.min(Math.max(0, item.shapeProps.brickWidth), item.area.w/2);
            const BH = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);

            return `M 0 0  L ${BW} 0 L ${BW} ${BH} L 0 ${BH} Z`
                    +`M ${0} ${BH} L ${W} ${BH} L ${W} ${H} L 0 ${H} Z`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const BW = Math.min(Math.max(0, item.shapeProps.brickWidth), item.area.w/2);
            const BH = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);

            return `M 0 0  L ${BW} 0 L ${BW} ${BH}  L ${W} ${BH} L ${W} ${H} L 0 ${H} Z`;
        },

        args: {
            brickWidth: {type: 'number', value: 60, name: 'Brick width', min: 0},
            brickHeight: {type: 'number', value: 20, name: 'Brick height', min: 0},
        },
    }
}