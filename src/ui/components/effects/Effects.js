import utils from '../../utils';
import forEach from 'lodash/forEach';

const effects = {
    'drop-shadow': {
        name: 'Drop Shadow',
        args: {
            color  : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Color'},
            dx     : {type: 'number', value: 10, name: 'Offset X'},
            dy     : {type: 'number', value: 10, name: 'Offset Y'},
            blur   : {type: 'number', value: 5, name: 'Blur', min: 0, max: 100},
            opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
        },

        applySVGFilterEffect(item, effectArgs) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
            el.setAttribute('dx', effectArgs.dx);
            el.setAttribute('dy', effectArgs.dy);
            el.setAttribute('stdDeviation', effectArgs.blur);
            el.setAttribute('flood-color', effectArgs.color);
            el.setAttribute('flood-opacity', effectArgs.opacity / 100.0);

            return el.outerHTML;
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

export function getEffectById(effectId) {
    return effects[effectId];
}

export function getDefaultEffectId() {
    return 'drop-shadow';
}