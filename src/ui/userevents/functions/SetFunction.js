/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import utils from '../../../ui/utils.js';
import {playInAnimationRegistry} from '../../animations/AnimationRegistry.js';
import ValueAnimation from '../../animations/ValueAnimation.js';
import { encodeColor, parseColor } from '../../colors.js';
import EditorEventBus from '../../components/editor/EditorEventBus.js';
import Shape from '../../components/editor/items/shapes/Shape.js';
import { getEffects } from '../../components/effects/Effects.js';
import { getItemPropertyDescriptionForShape } from '../../scheme/Item.js';


function playAnimation(editorId, item, args, resultCallback, updateCallback) {
    playInAnimationRegistry(editorId, new ValueAnimation({
        durationMillis: args.animationDuration * 1000.0,
        animationType: args.transition,
        update: updateCallback,
        destroy() {
            resultCallback();
        }
    }), item.id, `set-func-${args.field}`);
}


/**
 * @param {Item} item
 * @param {String} effectId
 * @returns {ItemEffect|null}
 */
export function findItemEffectById(item, effectId) {
    if (!Array.isArray(item.effects)) {
        return null;
    }

    return item.effects.find(effect => effect.id === effectId);
}

export function isArgTypeSupportedInSetFunction(argType) {
    return argType === 'number'
        || argType === 'color'
        || argType === 'advanced-color'
        || argType === 'boolean'
        || argType === 'string'
        || argType === 'text';
}

/*
 * @param {String} fieldPath - path of effect argument in the form of `effects.${effectId}.${argName}`
 */
export function fieldPathToEffectData(fieldPath) {
    if (!fieldPath.startsWith('effects.')) {
        return null;
    }
    const firstDotIdx = fieldPath.indexOf('.');
    const secondDotIdx = fieldPath.indexOf('.', firstDotIdx + 1);
    const effectId = fieldPath.substring(firstDotIdx + 1, secondDotIdx);
    const argName = fieldPath.substring(secondDotIdx + 1);

    return {
        effectId, argName
    };
}

/**
 * @param {Item} item
 * @param {String} fieldPath
 */
export function getEffectArgumentDescription(item, fieldPath) {
    const data = fieldPathToEffectData(fieldPath);
    if (!data || !Array.isArray(item.effects)) {
        return null;
    }

    const itemEffect = item.effects.find(effect => effect.id === data.effectId);
    if (!itemEffect) {
        return null;
    }

    const effect = getEffects()[itemEffect.effect];
    if (!effect && !effect.args[data.argName]) {
        return null;
    }

    return effect.args[data.argName];
}

export function supportsAnimationForSetFunction(argType) {
    return argType === 'number' || argType === 'color' || argType === 'advanced-color';
}

function animateGradientColor(editorId, item, args, options) {
    const {startGradient, endGradient, onUpdate, onFinish} = options;
    if (startGradient.colors.length !== endGradient.colors.length) {
        return false;
    }

    onUpdate({
        type: 'gradient',
        gradient: {
            ...startGradient,
            type: endGradient.type
        }
    });

    const originalDirection = startGradient.direction;

    const decodedColors = [];
    for (let i = 0; i < endGradient.colors.length; i++) {
        decodedColors[i] = {
            start: parseColor(startGradient.colors[i].c),
            startPos: startGradient.colors[i].p,
            end: parseColor(endGradient.colors[i].c),
            endPos: endGradient.colors[i].p,
        }
    }

    playAnimation(editorId, item, args, onFinish, t => {
        onUpdate({
            type: 'gradient',
            gradient: {
                direction: originalDirection * (1 - t) + endGradient.direction * t,
                colors: decodedColors.map((c, i) => {
                    return {
                        c: encodeColor({
                            r: c.start.r * (1 - t) + c.end.r * t,
                            g: c.start.g * (1 - t) + c.end.g * t,
                            b: c.start.b * (1 - t) + c.end.b * t,
                            a: c.start.a * (1 - t) + c.end.a * t,
                        }),
                        p: c.startPos * (1 - t) + c.endPos * t
                    }
                }),
                type: endGradient.type
            }
        });
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
    });
    return true;
}

function animateAdvancedColor(editorId, item, args, options) {
    const {startValue, onUpdate, onFinish} = options;
    if (typeof args.value !== 'object' || typeof startValue !== 'object') {
        return false;
    }
    if (args.value.type === 'solid' && startValue.type === 'solid') {
        const startColor = parseColor(startValue.color);
        const endColor = parseColor(args.value.color);
        playAnimation(editorId, item, args, onFinish, (t) => {
            onUpdate({
                type: 'solid',
                color: encodeColor({
                    r: startColor.r * (1 - t) + endColor.r * t,
                    g: startColor.g * (1 - t) + endColor.g * t,
                    b: startColor.b * (1 - t) + endColor.b * t,
                    a: startColor.a * (1 - t) + endColor.a * t,
                })
            });
            EditorEventBus.item.changed.specific.$emit(editorId, item.id);
        });
        return true;
    }
    if (args.value.type === 'gradient' && startValue.type === 'gradient') {
        return animateGradientColor(editorId, item, args, {
            startGradient: startValue.gradient,
            endGradient: args.value.gradient,
            onUpdate,
            onFinish
        });
    }
    return false;
}

function animateValue(editorId, item, args, options) {
    const {property, startValue, onUpdate, onFinish} = options;
    if (property.type === 'number') {
        playAnimation(editorId, item, args, onFinish, (t) => {
            onUpdate(startValue * (1 - t) + args.value * t);
            EditorEventBus.item.changed.specific.$emit(editorId, item.id);
        });
    } else if (property.type === 'color') {
        const startColor = parseColor(startValue);
        const endColor = parseColor(args.value);
        playAnimation(editorId, item, args, onFinish, (t) => {
            onUpdate(encodeColor({
                r: startColor.r * (1 - t) + endColor.r * t,
                g: startColor.g * (1 - t) + endColor.g * t,
                b: startColor.b * (1 - t) + endColor.b * t,
                a: startColor.a * (1 - t) + endColor.a * t,
            }));
            EditorEventBus.item.changed.specific.$emit(editorId, item.id);
        });
    } else if (property.type === 'advanced-color') {
        if (!animateAdvancedColor(editorId, item, args, options)) {
            onUpdate(args.value);
            EditorEventBus.item.changed.specific.$emit(editorId, item.id);
            onFinish();
        }
    }
}


export default {
    name: 'Set',

    args: {
        field               : {name: 'Field', type: 'text', value: ''},
        value               : {name: 'Value', type: 'any', value: null},
        animated            : {name: 'Animated', type: 'boolean', value: false},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item || !args.hasOwnProperty('field') || !args.hasOwnProperty('value')) {
            resultCallback();
            return;
        }

        if (args.field.startsWith('effects.')) {
            this.executeEffectField(item, args, schemeContainer, userEventBus, resultCallback);
        } else {
            this.executeRegularField(item, args, schemeContainer, userEventBus, resultCallback);
        }
    },

    /**
     *
     * @param {Item} item
     * @param {*} args
     * @param {*} schemeContainer
     * @param {*} userEventBus
     * @param {*} resultCallback
     * @returns
     */
    executeEffectField(item, args, schemeContainer, userEventBus, resultCallback) {
        const data = fieldPathToEffectData(args.field);
        if (!data) {
            resultCallback();
            return;
        }

        const itemEffect = item.effects.find(effect => effect.id === data.effectId);
        if (!itemEffect) {
            resultCallback();
            return;
        }

        const effect = getEffects()[itemEffect.effect];
        if (!effect) {
            resultCallback();
            return;
        }
        const property = effect.args[data.argName];
        if (args.animated && property && supportsAnimationForSetFunction(property.type)) {
            if (args.inBackground) {
                resultCallback();
            }
            animateValue(schemeContainer.editorId, item, args, {
                property,
                startValue: itemEffect.args[data.argName],
                onUpdate: (value) => {
                    itemEffect.args[data.argName] = value;
                },
                onFinish: () => {
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            });
        } else {
            itemEffect.args[data.argName] = args.value;
            EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
            resultCallback();
        }
    },

    executeRegularField(item, args, schemeContainer, userEventBus, resultCallback) {
        const property = getItemPropertyDescriptionForShape(Shape.find(item.shape), args.field);

        if (args.animated && property && supportsAnimationForSetFunction(property.type)) {
            if (args.inBackground) {
                resultCallback();
            }
            animateValue(schemeContainer.editorId, item, args, {
                property,
                startValue: utils.getObjectProperty(item, args.field),
                onUpdate: (value) => {
                    utils.setObjectProperty(item, args.field, value);
                },
                onFinish: () => {
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            });
        } else {
            utils.setObjectProperty(item, args.field, args.value);
            if (args.field === 'visible') {
                schemeContainer.updateVisibility(item);
            }
            EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
            resultCallback();
        }
    }
};
