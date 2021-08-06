import utils from '../../utils';
import forEach from 'lodash/forEach';
import Shape from '../editor/items/shapes/Shape';
import StrokePattern from '../editor/items/StrokePattern';


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

const effects = {
    'drop-shadow': {
        name: 'Drop Shadow',
        type: 'back',
        args: {
            color  : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Color'},
            dx     : {type: 'number', value: 10, name: 'Offset X'},
            dy     : {type: 'number', value: 10, name: 'Offset Y'},
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

            const filterId =  `item-effect-drop-shadow-${item.id}-${effectIdx}`;

            return svgElement('g', {}, [
                svgElement('defs', {}, [
                    svgElement('filter', {id: filterId}, [
                        svgElement('feGaussianBlur', {
                            in: 'SourceGraphic',
                            stdDeviation: effectArgs.blur
                        })
                    ])
                ]),

                svgElement('path', {
                    d: path,
                    stroke: 'none',
                    fill: effectArgs.color,
                    transform: `translate(${effectArgs.dx} ${effectArgs.dy})`,
                    style: `opacity: ${effectArgs.opacity / 100.0}`,
                    filter: `url(#${filterId})`
                })
            ]).innerHTML;
        }
    },

    'blur': {
        name: 'Blur',
        type: 'svg-filter',
        args: {
            size: {type: 'number', value: 5, name: 'Size'},
        },
        applyEffect(item, effectIdx, effectArgs) {
            return svgElement('feGaussianBlur', {
                in: 'SourceGraphic',
                stdDeviation: effectArgs.size
            }).outerHTML;
        }
    },

    'glow': {
        name: 'Glow',
        type: 'front',
        args: {
            color  : {type: 'color', value: 'rgba(126,237,255,1.0)', name: 'Color'},
            size   : {type: 'number', value: 3, name: 'Blur', min: 0, max: 100},
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

            return svgElement('g', {}, [
                svgElement('defs', {}, [
                    svgElement('filter', {id: filterId}, [
                        svgElement('feGaussianBlur', {
                            in: 'SourceGraphic',
                            stdDeviation: effectArgs.blur
                        })
                    ])
                ]),

                svgElement('path', {
                    d: path,
                    'data-item-id': item.id,
                    stroke: effectArgs.color,
                    'stroke-width': `${strokeSize}px`,
                    fill: 'none',
                    style: `opacity: ${effectArgs.opacity / 100.0}`,
                    filter: `url(#${filterId})`
                })
            ]).innerHTML;
        }
    },

    'repeat': {
        name: 'Repeat',
        type: 'back',
        args: {
            repeat: {type: 'number', value: 3, name: 'Repeat', min: 1, max: 20},
            dx    : {type: 'number', value: 10, name: 'Offset X'},
            dy    : {type: 'number', value: -10, name: 'Offset Y'},
            fade  : {type: 'number', value: 0, name: 'Fade (%)', min: 0, max: 100},
        },


        applyEffect(item, effectIdx, effectArgs) {
            const shape = Shape.find(item.shape);
            if (!shape) {
                return null;
            }

            const itemStandardCurves = Shape.computeStandardCurves(item, shape);
            if (!itemStandardCurves) {
                return null;
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

                let strokeDashArray = '';
                if (shape.shapeType === 'standard') {
                    strokeDashArray = StrokePattern.createDashArray(item.shapeProps.strokePattern, item.shapeProps.strokeSize);
                }



                forEach(itemStandardCurves, curve => {
                    g.appendChild(svgElement('path', {
                        d: curve.path,
                        fill: curve.fill,
                        stroke: curve.strokeColor,
                        'stroke-width': `${curve.strokeSize}px`,
                        'stroke-dasharray': strokeDashArray,
                        'stroke-linejoin': 'round',
                    }));
                });
                root.appendChild(g);
            }
            return root.innerHTML;
        }
    },
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

export function getEffectById(effectId) {
    return effects[effectId];
}

export function getDefaultEffectId() {
    return 'drop-shadow';
}