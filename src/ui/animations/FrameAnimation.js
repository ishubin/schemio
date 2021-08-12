import forEach from 'lodash/forEach';
import Shape from '../components/editor/items/shapes/Shape';
import utils from '../utils';
import EventBus from '../components/editor/EventBus';
import { convertTime, Interpolations } from './ValueAnimation';
import { encodeColor, parseColor } from '../colors';


const NUMBER = 'number';
const COLOR_STRING = 'color-string';
const BOOLEAN = 'boolean';
const STRING = 'string';
const CHOICE = 'choice';

const knownPropertyTypes = new Set([
    NUMBER, COLOR_STRING, STRING, BOOLEAN, CHOICE
]);


const knownProperties = new Map([
    ['area.x',      NUMBER],
    ['area.y',      NUMBER],
    ['area.w',      NUMBER],
    ['area.h',      NUMBER],
    ['area.r',      NUMBER],
    ['opacity',     NUMBER],
    ['selfOpacity', NUMBER],
    ['visible',     BOOLEAN],
    ['blendMode',   STRING],
]);



/**
 * Find a property type for specified property path. In case the type is not supported for animations it returns null
 * @param {Item} item 
 * @param {String} propertyPath 
 * @returns 
 */
export function findItemPropertyType(item, propertyPath) {
    const type = knownProperties.get(propertyPath);
    if (type) {
        return type;
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

        if (arg.type === 'color' || (arg.type === 'advanced-color' && fields.length === 3 && fields[2] === 'color')) {
            return COLOR_STRING;
        } else {
            if (knownPropertyTypes.has(arg.type)) {
                return arg.type;
            }
        }
    }
    return null;
}

function buildFrameLookup(frames, maxFrames) {
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
    if (frameLookup.length < maxFrames) {
        addBlankFrames(maxFrames - frameLookup.length, previosActiveFrameIdx, -1);
    }
    return frameLookup;
}

function interpolateValue(propertyType, value1, value2, t) {
    if (propertyType === NUMBER) {
        return value1 * (1 - t) + t * value2;
    } else if (propertyType === COLOR_STRING) {
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

    if (propertyType === NUMBER || propertyType === COLOR_STRING) {
        let d = nextFrame.frame - prevFrame.frame;
        if (d > 0 && frameNum >= prevFrame.frame && frameNum <= nextFrame.frame) {
            const t = convertTime((frameNum - prevFrame.frame) / d, prevFrame.kind);
            
            return interpolateValue(propertyType, prevFrame.value, nextFrame.value, t);
        }
    }
    return prevFrame.value;
}


function creatItemFrameAnimation(item, propertyPath, frames, maxFrames) {
    const fields = propertyPath.split('.');

    const propertyType = findItemPropertyType(item, propertyPath);
    if (!propertyType) {
        return null;
    }
    const frameLookup = buildFrameLookup(frames, maxFrames);

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
                value = interpolateFrameValues(frame, left.frame, right.frame, propertyType);
            }

            utils.setObjectProperty(item, fields, value);
            EventBus.emitItemChanged(item.id);
        }
    }
}

export function compileAnimations(framePlayer, schemeContainer) {
    const animations = [];
    forEach(framePlayer.shapeProps.animations, animation => {
        if (animation.kind === 'item') {
            const item = schemeContainer.findItemById(animation.id);
            if (item) {
                const itemAnimation = creatItemFrameAnimation(item, animation.property, animation.frames, framePlayer.shapeProps.totalFrames);
                if (itemAnimation) {
                    animations.push(itemAnimation);
                }
            }
        }
    });
    return animations;
}


