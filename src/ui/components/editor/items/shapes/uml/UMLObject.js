/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_object',

        menuItems: [{
            group: 'UML',
            name: 'Object',
            iconUrl: '/assets/images/items/uml-object.svg',
            item: {
                textSlots: {
                    title: {text: '<b>Object</b>', fontSize: 16, halign: 'center', valign: 'middle', paddingLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0},
                    body: {text: '', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top', paddingLeft: 5, paddingTop: 5, paddingRight: 5, paddingBottom: 5}
                },
            },
            size: {w: 140, h: 100}
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

            const nameLineTop = Math.min(item.area.h, Math.max(item.shapeProps.headerHeight, item.shapeProps.cornerRadius));

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                +`M 0 ${nameLineTop} l ${W} 0`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        getTextSlots(item) {
            return [{
                name: 'title',
                area: {x: 0, y: 0, w: item.area.w, h: item.shapeProps.headerHeight}
            }, {
                name: 'body',
                area: {x: 0, y: item.shapeProps.headerHeight, w: item.area.w, h: Math.max(10, item.area.h - item.shapeProps.headerHeight)}
            }];
        },

        controlPoints: {
            make(item) {
                return {
                    headerHeight: {
                        x: item.area.w / 2,
                        y: item.shapeProps.headerHeight
                    },
                    cornerRadius: {
                        x: item.area.w - item.shapeProps.cornerRadius,
                        y: 0
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'headerHeight') {
                    item.shapeProps.headerHeight = myMath.clamp(originalY + dy, 0, item.area.h);
                } else if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = myMath.clamp(item.area.w - originalX - dx, 0, Math.min(item.area.w/4, item.area.h/4));
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
            headerHeight: {type: 'number', value: 30, name: 'Header Height'}
        }
    }
}