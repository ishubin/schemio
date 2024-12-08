/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import utils from '../../utils';
import {forEach} from '../../collections';
import DropShadowEffect from './DropShadowEffect';
import GlowEffect from './GlowEffect';
import RepeatEffect from './RepeatEffect';
import { svgElement } from './SvgBuilder';
import AdjustColorEffect from './AdjustColorEffect';
import SketchEffect from './SketchEffect';



const $ = svgElement;

const effects = {
    'drop-shadow': DropShadowEffect,

    'blur': {
        name: 'Blur',
        supportsCascade: true,
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

    'glow': GlowEffect,
    'repeat': RepeatEffect,

    'invert': {
        name: 'Invert',
        supportsCascade: true,
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
        supportsCascade: true,
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
        supportsCascade: true,
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
        supportsCascade: true,
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
        supportsCascade: true,
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
        supportsCascade: true,
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
        supportsCascade: true,
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

    'adjust-color': AdjustColorEffect,

    'sketch': SketchEffect,
};

/**
 * Generates args with default values for specified effect
 * @param {ItemEffect} effect
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