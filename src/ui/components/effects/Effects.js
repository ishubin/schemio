import utils from '../../utils';
import forEach from 'lodash/forEach';
import Shape from '../editor/items/shapes/Shape';


function svgElement(name, attrs, childElements) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    forEach(attrs, (value, attrName) => {
        el.setAttribute(attrName, value);
    });

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