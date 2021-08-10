import forEach from 'lodash/forEach';
import Shape from '../components/editor/items/shapes/Shape';
import utils from '../utils';
import EventBus from '../components/editor/EventBus';


const NUMBER = 'number';

const knownPropertyTypes = new Map([
    ['area.x', NUMBER],
    ['area.y', NUMBER],
    ['opacity', NUMBER],
    ['selfOpacity', NUMBER],
]);


/**
 * Find a property type for specified property path. In case the type is not supported for animations it returns null
 * @param {Item} item 
 * @param {String} propertyPath 
 * @returns 
 */
export function findItemPropertyType(item, propertyPath) {
    const type = knownPropertyTypes.get(propertyPath);
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

        if (arg.type === NUMBER) {
            return NUMBER;
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


class ItemFrameAnimation {
    constructor(item, propertyPath, frames, maxFrames) {
        this.frames = frames;
        this.propertyPath = propertyPath.split('.');

        this.propertyType = findItemPropertyType(item, propertyPath);
        this.frameLookup = buildFrameLookup(frames, maxFrames);

        this.getItem = () => {
            return item;
        };
    }

    toggleFrame(frame) {
        if (!this.propertyType || frame < 1) {
            return;
        }
        const item = this.getItem();
        if (!item) {
            return null;
        }

        let indexFrame = null;
        if (frame <= this.frameLookup.length) {
            indexFrame = this.frameLookup[frame - 1];
        } else {
            indexFrame = this.frameLookup[this.frameLookup.length - 1];
        }

        if (indexFrame.frame) {
            utils.setObjectProperty(item, this.propertyPath, indexFrame.frame.value);
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
                animations.push(new ItemFrameAnimation(item, animation.property, animation.frames, framePlayer.shapeProps.totalFrames));
            }
        }
    });
    return animations;
}


