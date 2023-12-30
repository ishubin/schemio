/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from '../../../../myMath';
import {createRoundRectPath, getStandardRectPins} from './ShapeDefaults'

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
            return createRoundRectPath(item.area.w, item.area.h, item.shapeProps.cornerRadius);
        },

        editorProps: {},

        controlPoints: {
            make(item) {
                return {
                    cornerRadius: {
                        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                        y: 0
                    }
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: 0, name: 'Corner radius', min: 0},
        }
    }
};