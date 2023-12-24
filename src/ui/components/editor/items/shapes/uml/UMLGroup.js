/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_group',

        menuItems: [{
            group: 'UML',
            name: 'Group',
            iconUrl: '/assets/images/items/uml-group.svg',
            item: {
                textSlots: {
                    title: {text: 'Group', bold: true, color: '#969696', fontSize: 16, halign: 'center', valign: 'middle', paddingLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0},
                },
                shapeProps: {
                    fill: {type: 'none'},
                    strokeSize: 3,
                    strokeColor: 'rgba(160,160,160,1.0)'
                }
            },
            size: {w: 140, h: 100}
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const cornerRadius = Math.max(0, item.shapeProps.cornerRadius);
            const R = Math.min(cornerRadius, item.area.w/4, item.area.h/4);
            const gw = item.area.w - 2 * R;
            const gap = myMath.clamp(item.shapeProps.gap, 0, gw);

            let gapStart = 0;
            let gapEnd = 0;

            if (item.shapeProps.align === 'begin') {
                gapStart = 0;
                gapEnd = gw - gap;
            } else if (item.shapeProps.align === 'middle') {
                gapStart = (gw - gap) / 2;
                gapEnd = gapStart;
            } else {
                gapStart = gw - gap;
                gapEnd = 0;
            }

            if (item.shapeProps.pos === 'bottom') {
                return `M ${W-R} 0  a ${R} ${R} 0 0 1 ${R} ${R} ` // top edge
                    + `L ${W} ${H-R} a ${R} ${R} 0 0 1 ${-R} ${R}` // right edge
                    + `L ${W-R-gapEnd} ${H} M ${R+gapStart} ${H} L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R} ` // bottom edge
                    + `L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R} L ${W-R} 0` // left edge
                ;
            } else {
                return `M ${W-R-gapEnd} 0  L ${W-R} 0 a ${R} ${R} 0 0 1 ${R} ${R} ` // top edge
                    + `L ${W} ${H-R} a ${R} ${R} 0 0 1 ${-R} ${R}` // right edge
                    + `L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R} ` // bottom edge
                    + `L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  ` // left edge
                    + `L ${R+gapStart} 0`
                ;
            }
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const cornerRadius = Math.max(0, item.shapeProps.cornerRadius);
            const R = Math.min(cornerRadius, item.area.w/4, item.area.h/4);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        getTextSlots(item) {
            const R = Math.min(Math.max(0, item.shapeProps.cornerRadius), item.area.w/4, item.area.h/4);
            const gw = item.area.w - 2 * R;
            const gap = myMath.clamp(item.shapeProps.gap, 0, gw);

            let gapStart = 0;
            if (item.shapeProps.align === 'begin') {
                gapStart = 0;
            } else if (item.shapeProps.align === 'middle') {
                gapStart = (gw - gap) / 2;
            } else {
                gapStart = gw - gap;
            }

            const textHeight = myMath.clamp(item.area.h/2, 10, 50);

            const y0 = item.shapeProps.pos === 'bottom' ? item.area.h : 0;

            return [{
                name: 'title',
                area: {x: R + gapStart, y: -textHeight/2 + y0, w: gap, h: textHeight}
            }];
        },

        controlPoints: {
            make(item) {
                const R = Math.min(Math.max(0, item.shapeProps.cornerRadius), item.area.w/4, item.area.h/4);
                const gw = item.area.w - 2 * R;
                const gap = myMath.clamp(item.shapeProps.gap, 0, gw);
                let gapX = 0;

                if (item.shapeProps.align === 'begin') {
                    gapX = R + gap;
                } else if (item.shapeProps.align === 'middle') {
                    gapX = (item.area.w + gap) / 2;
                } else {
                    gapX = item.area.w - R - gap;
                }
                return {
                    cornerRadius: {
                        x: item.area.w - item.shapeProps.cornerRadius,
                        y: 0
                    },
                    gap: {
                        x: gapX,
                        y: item.shapeProps.pos === 'top' ? 0 : item.area.h
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'gap') {
                    const R = Math.min(Math.max(0, item.shapeProps.cornerRadius), item.area.w/4, item.area.h/4);
                    const gw = item.area.w - 2 * R;
                    let gap = 0;
                    let gapX = originalX + dx;

                    if (item.shapeProps.align === 'begin') {
                        gap = gapX - R;
                    } else if (item.shapeProps.align === 'middle') {
                        gap = gapX * 2 - item.area.w;
                    } else {
                        gap = item.area.w - R - gapX ;
                    }
                    item.shapeProps.gap = myMath.clamp(gap, 0, gw);
                } else if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = myMath.clamp(item.area.w - originalX - dx, 0, Math.min(item.area.w/4, item.area.h/4));
                }
            }
        },

        args: {
            gap         : {type: 'number', value: 150, name: 'Gap size', min: 0},
            pos         : {type: 'choice', value: 'top', name: 'Title placement', options: ['top', 'bottom']},
            align       : {type: 'choice', value: 'middle', name: 'Title alignment', options: ['begin', 'middle', 'end']},
            cornerRadius: {type: 'number', value: 20, name: 'Corner radius', min: 0},
        }
    }
}