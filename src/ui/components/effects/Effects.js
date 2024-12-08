/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import utils from '../../utils';
import {forEach} from '../../collections';
import Shape from '../editor/items/shapes/Shape';
import StrokePattern from '../editor/items/StrokePattern';
import {computeSvgFill} from '../editor/items/AdvancedFill.vue';


function svgElement(name, attrs, childElements) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) {
        forEach(attrs, (value, attrName) => {
            el.setAttribute(attrName, value);
        });
    }

    if (childElements) {
        forEach(childElements, child => {
            el.appendChild(child)
        });
    }
    return el;
}

const $ = svgElement;

const effects = {
    'drop-shadow': {
        name: 'Drop Shadow',
        args: {
            color  : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Color'},
            dx     : {type: 'number', value: 10, name: 'Offset X'},
            dy     : {type: 'number', value: 10, name: 'Offset Y'},
            blur   : {type: 'number', value: 5, name: 'Blur', min: 0, max: 100},
            opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
            inside : {type: 'boolean', value: false, name: 'Inside'}
        },

        applyEffect(item, effectIdx, effectArgs) {
            const shape = Shape.find(item.shape);
            if (!shape) {
                return null;
            }

            const path = shape.computeOutline(item);
            if (!path) {
                return null;
            }

            const filterId =  `item-effect-drop-shadow-${item.id}-${effectIdx}`;

            if (effectArgs.inside) {
                return {
                    kind: 'svg-filter',
                    html: $('g', {}, [
                        $('feComponentTransfer', {in: 'SourceAlpha' }, [
                            $('feFuncA', {type: 'table', tableValues: '1 0'})
                        ]),
                        $('feGaussianBlur', {stdDeviation: effectArgs.blur}),
                        $('feOffset', {dx: effectArgs.dx, dy: effectArgs.dy, result: 'offsetblur'}),
                        $('feFlood', {'flood-color': effectArgs.color, result: 'color', 'flood-opacity': effectArgs.opacity / 100.0}),
                        $('feComposite', {in2: 'offsetblur', operator: 'in'}),
                        $('feComposite', {in2: 'SourceAlpha', operator: 'in'}),
                        $('feMerge', {}, [
                            $('feMergeNode', {in: 'SourceGraphic'}),
                            $('feMergeNode'),
                        ])
                    ]).innerHTML
                };
            } else {
                return {
                    kind: 'css-filter',
                    value: `drop-shadow(${effectArgs.dx}px ${effectArgs.dy}px ${effectArgs.blur}px ${effectArgs.color})`
                };
            }
        }
    },

    'blur': {
        name: 'Blur',
        args: {
            size: {type: 'number', value: 5, name: 'Size'},
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `blur(${effectArgs.size}px)`
            };
        }
    },

    'glow': {
        name: 'Glow',
        description: 'Some shapes do not support this effect',
        args: {
            color  : {type: 'color', value: 'rgba(126,237,255,1.0)', name: 'Color'},
            size   : {type: 'number', value: 3, name: 'Size', min: 0, max: 100},
            blur   : {type: 'number', value: 5, name: 'Blur', min: 0, max: 100},
            opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
        },

        applyEffect(item, effectIdx, effectArgs) {
            const shape = Shape.find(item.shape);
            if (!shape) {
                return null;
            }

            const path = shape.computeOutline(item);
            if (!path) {
                return null;
            }

            const filterId =  `item-effect-glow-${item.id}-${effectIdx}`;
            let strokeSize = effectArgs.size;
            const strokeSizeArgDef = Shape.getShapePropDescriptor(shape, 'strokeSize');
            if (strokeSizeArgDef && strokeSizeArgDef.type === 'number') {
                strokeSize = effectArgs.size + item.shapeProps['strokeSize'];
            }

            return {
                kind: 'front',
                html: $('g', {}, [
                    $('defs', {}, [
                        $('filter', {id: filterId, x: '-500%', y: '-500%', width: '2000%', height: '2000%'}, [
                            $('feGaussianBlur', {
                                in: 'SourceGraphic',
                                stdDeviation: effectArgs.blur
                            })
                        ])
                    ]),

                    $('path', {
                        d: path,
                        'data-item-id': item.id,
                        stroke: effectArgs.color,
                        'stroke-width': `${strokeSize}px`,
                        fill: 'none',
                        style: `opacity: ${effectArgs.opacity / 100.0}`,
                        filter: `url(#${filterId})`
                    })
                ]).innerHTML
            };
        }
    },

    'repeat': {
        name: 'Repeat',
        description: 'Some shapes do not support this effect',
        args: {
            repeat: {type: 'number', value: 3, name: 'Repeat', min: 1, max: 20},
            dx    : {type: 'number', value: 10, name: 'Offset X'},
            dy    : {type: 'number', value: -10, name: 'Offset Y'},
            fade  : {type: 'number', value: 0, name: 'Fade (%)', min: 0, max: 100},
        },


        applyEffect(item, effectIdx, effectArgs) {
            const shape = Shape.find(item.shape);
            if (!shape || !shape.computeOutline) {
                return null;
            }

            const outlinePath = shape.computeOutline(item);
            if (!outlinePath) {
                return null;
            }

            const args = Shape.getShapeArgs(shape);
            let fill = 'none';
            if (item.shape === 'image') {
                const crop = item.shapeProps.crop;
                fill = computeSvgFill({
                    type: 'image',
                    image: item.shapeProps.image,
                    stretch: item.shapeProps.stretch,
                    imageBox: {
                        x: 0,
                        y: 0,
                        w: 1,
                        h: 1,
                    }
                }, `effect-fill-${item.id}`);
            } else if (args.fill && args.fill.type === 'advanced-color') {
                fill = computeSvgFill(item.shapeProps.fill, `effect-fill-${item.id}`);
            } else if (args.fill && args.fill.type === 'color') {
                fill = item.shapeProps.fill;
            }
            const strokeColor = args.strokeColor && args.strokeColor.type === 'color' ? item.shapeProps.strokeColor : '#111111';
            const strokeSize = args.strokeSize && args.strokeSize.type === 'number' ? item.shapeProps.strokeSize : 1;
            let strokeDashArray = '';
            if (args.strokePattern && args.strokePattern.type === 'stroke-pattern') {
                strokeDashArray = StrokePattern.createDashArray(item.shapeProps.strokePattern, strokeSize);
            }

            const root = svgElement('g', {});
            for (let i = 0; i < effectArgs.repeat; i++) {
                const x = (effectArgs.repeat - i) * effectArgs.dx;
                const y = (effectArgs.repeat - i) * effectArgs.dy;

                let start = 100;
                let end = 100 - effectArgs.fade;
                let t = (i + 1) / effectArgs.repeat

                let opacity = (start * t + end * (1 - t)) / 100;

                const g = svgElement('g', {
                    transform: `translate(${x}, ${y})`,
                    style: `opacity: ${opacity}`
                });

                g.appendChild(svgElement('path', {
                    d: outlinePath,
                    fill: fill,
                    stroke: strokeColor,
                    'stroke-width': `${strokeSize}px`,
                    'stroke-dasharray': strokeDashArray,
                    'stroke-linejoin': 'round',
                    'data-item-id': item.id
                }));
                root.appendChild(g);
            }
            return {
                kind: 'back',
                html: root.innerHTML
            };
        }
    },

    'invert': {
        name: 'Invert',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0, max: 100}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `invert(${effectArgs.level/100})`
            };
        }
    },

    'brightness': {
        name: 'Brightness',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `brightness(${effectArgs.level/100})`
            };
        }
    },

    'contrast': {
        name: 'Contrast',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `contrast(${effectArgs.level/100})`
            };
        }
    },

    'hue-rotate': {
        name: 'Hue rotate',
        args: {
            degree: {type: 'number', name: 'Degrees', value: 0, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `hue-rotate(${effectArgs.degree}deg)`
            };
        }
    },

    'grayscale': {
        name: 'Grayscale',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `grayscale(${effectArgs.level/100})`
            };
        }
    },

    'saturate': {
        name: 'Saturate',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `saturate(${effectArgs.level/100})`
            };
        }
    },

    'sepia': {
        name: 'Sepia',
        args: {
            level: {type: 'number', name: 'Level (%)', value: 100, min: 0}
        },
        applyEffect(item, effectIdx, effectArgs) {
            return {
                kind: 'css-filter',
                value: `sepia(${effectArgs.level/100})`
            };
        }
    },

    'adjust-color': {
        name: 'Adjust Color',
        args: {
            matrix: {
                type: 'color-matrix',
                name: 'Color matrix',
                value: [[1, 0, 0, 0, 0],
                        [0, 1, 0, 0, 0],
                        [0, 0, 1, 0, 0],
                        [0, 0, 0, 1, 0]
                ]
            }
        },

        applyEffect(item, effectIdx, effectArgs) {
            let matrixEncoded =   '1 0 0 0 0 '
                                + '0 1 0 0 0 '
                                + '0 0 1 0 0 '
                                + '0 0 0 1 0';
            if (Array.isArray(effectArgs.matrix)) {
                matrixEncoded = '';
                effectArgs.matrix.forEach(row => {
                    if (Array.isArray(row)) {
                        matrixEncoded += row.join(' ')
                    } else {
                        matrixEncoded += '0 0 0 0 0';
                    }
                    matrixEncoded += ' ';
                });
            }
            return {
                kind: 'svg-filter',
                html: $('feColorMatrix', {
                    type: 'matrix',
                    values: matrixEncoded
                }).outerHTML
            };
        }
    }
}

/**
 * Generates args with default values for specified effect
 * @param {Effect} effect
 * @returns
 */
export function generateEffectArgs(effect) {
    if (!effect) {
        return {};
    }

    const props = {};
    forEach(effect.args, (arg, argName) => {
        props[argName] = utils.clone(arg.value);
    })
    return props;
}


export function getEffects() {
    return effects;
}

export function findEffect(effectId) {
    return effects[effectId];
}

export function getDefaultEffectId() {
    return 'drop-shadow';
}