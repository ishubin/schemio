/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from '../../../../myMath';
import {getStandardRectPins} from './ShapeDefaults'


export function createRoundRectPath(w, h, r1, r2, r3, r4) {
    r1 = Math.min(r1, w/2, h/2);
    r2 = Math.min(r2, w/2, h/2);
    r3 = Math.min(r3, w/2, h/2);
    r4 = Math.min(r4, w/2, h/2);

    return `M ${w-r3} ${h}  L ${r4} ${h} a ${r4} ${r4} 0 0 1 ${-r4} ${-r4}  L 0 ${r1}  a ${r1} ${r1} 0 0 1 ${r1} ${-r1}   L ${w-r2} 0   a ${r2} ${r2} 0 0 1 ${r2} ${r2}  L ${w} ${h-r3}   a ${r3} ${r3} 0 0 1 ${-r3} ${r3} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        // id is used in order to register in Shape Registry
        // this will be the identifier that is specified with "shape" field in items
        id: 'rect',

        // menuItems is used in order to display shape in the items menu (left panel)
        menuItems: [{
            group: 'Basic Shapes',
            name: 'Rect',
            iconUrl: '/assets/images/items/rect.svg',
            item: {
                shapeProps: {cornerRadius: 0}
            }
        }, {
            group: 'Basic Shapes',
            name: 'Rounded Rect',
            iconUrl: '/assets/images/items/rounded-rect.svg',
            item: {
                shapeProps: {cornerRadius: 20}
            }
        }, {
            group: 'General',
            name: 'Overlay',
            iconUrl: '/assets/images/items/overlay.svg',
            ignoreRecentProps: true,
            description: `
                It lets you create a clickable area on the image (or any other element of the scheme) and treat it like an object.
                E.g. you can select it, trigger events or connect it to other items on the page.
            `,
            item: {
                cursor: 'pointer',
                opacity: 5,
                shapeProps: {
                    cornerRadius: 0
                },
                behavior: {
                    events: [{
                        event: 'mousein',
                        actions: [{
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'opacity',
                                value: 50,
                                animated: true,
                                animationDuration: 0.2,
                                transition: 'ease-in-out'
                            }
                        }]
                    }, {
                        event: 'mouseout',
                        actions: [ {
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'opacity',
                                value: 5,
                                animated: true,
                                animationDuration: 0.2,
                                transition: 'ease-in-out'
                            }
                        } ]
                    }]
                },
            }
        }, {
            group: 'General',
            name: 'Button',
            iconUrl: '/assets/images/items/button.svg',
            ignoreRecentProps: true,
            item: {
                cursor: 'pointer',
                opacity: 100,
                shapeProps: {
                    cornerRadius: 20,
                    fill: {
                        type: 'gradient',
                        color: 'rgba(29, 108, 176, 1)',
                        gradient: {
                            colors: [ {
                                c: 'rgba(25, 121, 204, 1)',
                                p: 0
                            }, {
                                c: 'rgba(86, 172, 246, 1)',
                                p: 100
                            } ],
                            type: 'linear',
                            direction: 0
                        }
                    },
                    strokeColor: 'rgba(39, 132, 211, 1)',
                    strokeSize: 2,
                    strokePattern: 'solid'
                },
                textSlots: {
                    body: {
                        bold: true,
                        text: '<p>Button</p>',
                        color: 'rgba(255, 255, 255, 1)',
                        halign: 'center',
                        valign: 'middle',
                    }
                },
                behavior: {
                    events: [{
                        event: 'mousein',
                        actions: [{
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'opacity',
                                value: 90
                            }
                        }]
                    }, {
                        event: 'mouseout',
                        actions: [ {
                            element: 'self',
                            method: 'set',
                            args: {
                                field: 'opacity',
                                value: 100
                            }
                        } ]
                    }]
                },
            },
            previewArea: {x: 0, y: 0, w: 140, h: 60, r: 0},
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            let r2 = item.shapeProps.cornerRadius;
            let r3 = item.shapeProps.cornerRadius;
            let r4 = item.shapeProps.cornerRadius;
            if (item.shapeProps.varCorners) {
                r2 = item.shapeProps.r2;
                r3 = item.shapeProps.r3;
                r4 = item.shapeProps.r4;
            }

            return createRoundRectPath(item.area.w, item.area.h, item.shapeProps.cornerRadius, r2, r3, r4);
        },

        editorProps: {},

        controlPoints: {
            make(item) {
                if (item.shapeProps.varCorners) {
                    return {
                        r1: {
                            x: Math.max(0, Math.min(item.shapeProps.cornerRadius, item.area.w/2)),
                            y: 0
                        },
                        r2: {
                            x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.r2, item.area.w/2)),
                            y: 0
                        },
                        r3: {
                            x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.r3, item.area.w/2)),
                            y: item.area.h
                        },
                        r4: {
                            x: Math.max(0, Math.min(item.shapeProps.r4, item.area.w/2)),
                            y: item.area.h
                        }
                    };
                } else {
                    return {
                        cornerRadius: {
                            x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                            y: 0
                        }
                    }
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'r1') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(Math.min(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'r2') {
                    item.shapeProps.r2 = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'r3') {
                    item.shapeProps.r3 = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'r4') {
                    item.shapeProps.r4 = Math.max(0, myMath.roundPrecise(Math.min(item.area.w/2, originalX + dx), 1));
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: 0, name: 'Corner radius', min: 0, softMax: 100},
            varCorners  : {type: 'boolean', value: false, name: 'Varied Cornerns'},
            r2          : {type: 'number', value: 0, name: 'Corner radius 2', min: 0, softMax: 100, depends: {varCorners: true}},
            r3          : {type: 'number', value: 0, name: 'Corner radius 3', min: 0, softMax: 100, depends: {varCorners: true}},
            r4          : {type: 'number', value: 0, name: 'Corner radius 4', min: 0, softMax: 100, depends: {varCorners: true}},
        }
    }
};