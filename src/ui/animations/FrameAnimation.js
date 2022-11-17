/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';
import Shape from '../components/editor/items/shapes/Shape';
import utils from '../utils';
import { convertTime, Interpolations } from './ValueAnimation';
import { encodeColor, parseColor } from '../colors';
import Animation from './Animation';
import { knownBlendModes } from '../scheme/ItemConst';
import AnimationFunctions from './functions/AnimationFunctions';
import EditorEventBus from '../components/editor/EditorEventBus';


const NUMBER = 'number';
const COLOR = 'color';
const BOOLEAN = 'boolean';
const STRING = 'string';
const CHOICE = 'choice';

const knownPropertyTypes = new Set([
    NUMBER, COLOR, STRING, BOOLEAN, CHOICE
]);

const knownProperties = new Map([
    ['area.x',      {type: NUMBER}],
    ['area.y',      {type: NUMBER}],
    ['area.w',      {type: NUMBER}],
    ['area.h',      {type: NUMBER}],
    ['area.r',      {type: NUMBER}],
    ['area.sx',     {type: NUMBER}],
    ['area.sy',     {type: NUMBER}],
    ['opacity',     {type: NUMBER}],
    ['selfOpacity', {type: NUMBER}],
    ['visible',     {type: BOOLEAN}],
    ['blendMode',   {type: STRING, options: knownBlendModes}],
]);

const knownSchemeProperties = new Map([
    ['style.backgroundColor', {type: COLOR}]
]);


/**
 * Finds supported scheme property descriptor for specified path
 * @param {String} propertyPath
 * @returns
 */
export function findSchemePropertyDescriptor(propertyPath) {
    return knownSchemeProperties.get(propertyPath);
}


/**
 * Find a property descriptor for specified property path. In case the type is not supported for animations it returns null
 * @param {Item} item
 * @param {String} propertyPath
 * @returns
 */
export function findItemPropertyDescriptor(item, propertyPath) {
    const descriptor = knownProperties.get(propertyPath);
    if (descriptor) {
        return descriptor;
    }

    if (propertyPath.startsWith('shapeProps.')) {
        const fields = propertyPath.split('.');
        if (fields.length <= 1) {
            return null;
        }
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const arg = Shape.getShapePropDescriptor(shape, fields[1]);
        if (!arg) {
            return null;
        }

        if (arg.type === COLOR || (arg.type === 'advanced-color' && fields.length === 3 && fields[2] === 'color')) {
            return {type: COLOR};
        } else {
            if (knownPropertyTypes.has(arg.type)) {
                return arg;
            }
        }
    }
    return null;
}

function buildFrameLookup(frames, totalFrames) {
    frames.sort((a, b) => {
        return a.frame - b.frame;
    })
    const frameLookup = [];

    const addBlankFrames = (num, prevIdx, nextIdx) => {
        const blankFrame = {
            prevIdx, nextIdx
        };
        for (let i = 0; i < num; i++) {
            frameLookup.push(blankFrame);
        }
    };


    let previosActiveFrameIdx = -1;
    forEach(frames, f => {
        // protecting from duplicate frames

        if (previosActiveFrameIdx >= 0) {
            if (frameLookup[previosActiveFrameIdx].frame.frame === f.frame) {
                // looks like there is a duplicate
                return;
            }
        }


        const activeFrame = {
            frame: f,
            prevIdx: previosActiveFrameIdx,
            nextIdx: -1
        };

        if (f.frame - 1 > frameLookup.length) {
            // should fill with empty cells first and then add the frame
            addBlankFrames(f.frame - 1 - frameLookup.length, previosActiveFrameIdx, f.frame - 1);
        }
        frameLookup.push(activeFrame);

        if (previosActiveFrameIdx >= 0) {
            frameLookup[previosActiveFrameIdx].nextIdx = f.frame - 1;
        }
        previosActiveFrameIdx = f.frame - 1;
    });
    if (frameLookup.length < totalFrames) {
        addBlankFrames(totalFrames - frameLookup.length, previosActiveFrameIdx, -1);
    }
    return frameLookup;
}

export function interpolateValue(propertyType, value1, value2, t) {
    if (propertyType === NUMBER) {
        return value1 * (1 - t) + t * value2;
    } else if (propertyType === COLOR) {
        const c1 = parseColor(value1)
        const c2 = parseColor(value2);
        const color = {
            r: c1.r * (1 - t) + t * c2.r,
            g: c1.g * (1 - t) + t * c2.g,
            b: c1.b * (1 - t) + t * c2.b,
            a: c1.a * (1 - t) + t * c2.a,
        };
        return encodeColor(color);
    }

    return value1;
}

function interpolateFrameValues(frameNum, prevFrame, nextFrame, propertyType) {
    if (prevFrame.kind === Interpolations.STEP) {
        return prevFrame.value;
    }

    if (propertyType === NUMBER || propertyType === COLOR) {
        let d = nextFrame.frame - prevFrame.frame;
        if (d > 0 && frameNum >= prevFrame.frame && frameNum <= nextFrame.frame) {
            const t = convertTime((frameNum - prevFrame.frame) / d, prevFrame.kind);

            return interpolateValue(propertyType, prevFrame.value, nextFrame.value, t);
        }
    }
    return prevFrame.value;
}


function creatObjectFrameAnimation(editorId, obj, propertyPath, propertyDescriptor, frames, totalFrames, isItem) {
    if (!propertyDescriptor) {
        return null;
    }

    const fields = propertyPath.split('.');

    const frameLookup = buildFrameLookup(frames, totalFrames);

    return {
        toggleFrame(frame) {
            if (frame < 1) {
                return;
            }

            const frameNum = Math.floor(frame);

            let indexFrame = null;
            if (frameNum <= frameLookup.length) {
                indexFrame = frameLookup[frameNum - 1];
            } else {
                indexFrame = frameLookup[frameLookup.length - 1];
            }

            let left = indexFrame;

            if (!indexFrame.frame) {
                if (indexFrame.prevIdx < 0) {
                    return;
                }
                left = frameLookup[indexFrame.prevIdx];
            }
            let right = null;
            if (indexFrame.nextIdx >= 0) {
                right = frameLookup[indexFrame.nextIdx];
            }
            let value = left.frame.value;
            if (right) {
                value = interpolateFrameValues(frame, left.frame, right.frame, propertyDescriptor.type);
            }

            utils.setObjectProperty(obj, fields, value);
            if (isItem) {
                EditorEventBus.item.changed.specific.$emit(editorId, obj.id);
            }
        }
    };
}

function createFunctionFrameAnimation(functionDescriptor, instance, inputTracks, totalFrames) {
    const frameLookupForInput = {};

    forEach(inputTracks, (inputTrack, inputName) => {
        frameLookupForInput[inputName] = buildFrameLookup(inputTrack.frames, totalFrames);

    });
    return {
        toggleFrame(frame) {
            if (frame < 1) {
                return;
            }

            const frameNum = Math.floor(frame);

            const inputValues = {};
            let missingInputValues = false;
            forEach(frameLookupForInput, (frameLookup, inputName) => {
                let indexFrame = null;
                if (frameNum <= frameLookup.length) {
                    indexFrame = frameLookup[frameNum - 1];
                } else {
                    indexFrame = frameLookup[frameLookup.length - 1];
                }

                let left = indexFrame;

                if (!indexFrame.frame) {
                    if (indexFrame.prevIdx < 0) {
                        missingInputValues = true;
                        return;
                    }
                    left = frameLookup[indexFrame.prevIdx];
                }
                let right = null;
                if (indexFrame.nextIdx >= 0) {
                    right = frameLookup[indexFrame.nextIdx];
                }
                let value = left.frame.value;
                if (right) {
                    value = interpolateFrameValues(frame, left.frame, right.frame, functionDescriptor.inputs[inputName].type);
                }

                inputValues[inputName] = value;
            });
            if (!missingInputValues) {
                functionDescriptor.execute(instance, inputValues);
            }
        }
    };
}

function compileAnimationFunctions(framePlayer, functionAnimationTracks, schemeContainer) {
    const animations = [];
    forEach(framePlayer.shapeProps.functions, (framePlayerFunction, playerFunctionId) => {
        if (!functionAnimationTracks[playerFunctionId]) {
            return;
        }

        const functionDescriptor = AnimationFunctions[framePlayerFunction.functionId];
        if (!functionDescriptor) {
            return;
        }
        const preparedInstance = functionDescriptor.create(framePlayerFunction.args, schemeContainer);
        const inputTracks = {};

        // making sure that all inputs have at least one frame
        forEach(functionDescriptor.inputs, (inputDescriptor, inputName) => {
            if (functionAnimationTracks[playerFunctionId][inputName]) {
                inputTracks[inputName] = functionAnimationTracks[playerFunctionId][inputName];
            } else {
                inputTracks[inputName] = {
                    kind      : 'function',
                    functionId: playerFunctionId,
                    property  : inputName,
                    frames    : [{
                        frame: 0,
                        kind : 'linear',
                        value: inputDescriptor.value  // using default value
                    }]
                };
            }
        });

        const animation = createFunctionFrameAnimation(functionDescriptor, preparedInstance, inputTracks, framePlayer.shapeProps.totalFrames);
        if (animation) {
            animations.push(animation);
        }
    });

    return animations;
}

export function compileAnimations(framePlayer, schemeContainer) {
    const animations = [];

    const functionAnimationTracks = {};

    forEach(framePlayer.shapeProps.animations, animation => {
        if (animation.kind === 'item') {
            const item = schemeContainer.findItemById(animation.id);
            if (item) {
                const propertyDescriptor = findItemPropertyDescriptor(item, animation.property);
                const itemAnimation = creatObjectFrameAnimation(schemeContainer.editorId, item, animation.property, propertyDescriptor, animation.frames, framePlayer.shapeProps.totalFrames, true);
                if (itemAnimation) {
                    animations.push(itemAnimation);
                }
            }
        } else if (animation.kind === 'function') {
            if (!functionAnimationTracks.hasOwnProperty(animation.id)) {
                functionAnimationTracks[animation.id] = {};
            }
            functionAnimationTracks[animation.id][animation.property] = animation;
        } else if (animation.kind === 'scheme') {
            const propertyDescriptor = findSchemePropertyDescriptor(animation.property);
            const schemeAnimation = creatObjectFrameAnimation(schemeContainer.editorId, schemeContainer.scheme, animation.property, propertyDescriptor, animation.frames, framePlayer.shapeProps.totalFrames, false);
            if (schemeAnimation) {
                animations.push(schemeAnimation);
            }
        }
    });

    return animations.concat(compileAnimationFunctions(framePlayer, functionAnimationTracks, schemeContainer));
}

const MIN_FPS = 0.01;

export class FrameAnimation extends Animation {
    constructor(fps, totalFrames, compiledAnimations) {
        super();
        this.totalTimePassed = 0;
        this.currentFrame = 0;
        this.startFrame = 1;
        this.fps = fps;
        this.totalFrames = totalFrames;
        this.compiledAnimations = compiledAnimations;
        this.onFrame = null;
        this.onFinish = null;
        this.stopFrame = -1;
    }

    setFrame(frame) {
        this.startFrame = frame;
        this.currentFrame = Math.floor(frame) - 1;
    }

    setStopFrame(stopFrame) {
        this.stopFrame = stopFrame;
    }

    init() {
        this.totalTimePassed = 0;
        return true;
    }

    setCallbacks({onFrame, onFinish}) {
        this.onFrame = onFrame;
        this.onFinish = onFinish;
    }

    play(dt) {
        this.totalTimePassed += dt;
        let frame = this.startFrame + this.totalTimePassed * Math.max(this.fps, MIN_FPS) / 1000;
        let nextFrame = Math.floor(frame);

        if (nextFrame > this.currentFrame) {
            this.currentFrame = nextFrame;
            if (this.onFrame) {
                this.onFrame(this.currentFrame);
            }
        }

        const floorFrame = Math.floor(frame);
        const reachedStopFrame = this.stopFrame > 0 && floorFrame === this.stopFrame;
        if (reachedStopFrame) {
            if (this.onFrame) {
                this.onFrame(this.stopFrame);
            }
            this.toggleFrame(this.stopFrame);
            return false;
        }

        this.toggleFrame(frame);

        if (nextFrame < this.totalFrames) {
            return true;
        }
        return false;
    }

    toggleFrame(frame) {
        this.startFrame = frame;
        this.totalTimePassed = 0;
        this.currentFrame = frame;
        forEach(this.compiledAnimations, animation => {
            animation.toggleFrame(frame);
        });
    }

    destroy() {
        if (this.onFinish) {
            this.onFinish();
        }
    }
}