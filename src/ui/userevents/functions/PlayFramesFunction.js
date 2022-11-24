/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from "../../animations/AnimationRegistry";


export default {
    name: 'Play Frames',

    description: 'Triggers animations in specified frame player',

    supportedShapes: ['frame_player'],

    args: {
        startFrame: {type: 'number', value: 1, min: 1, name: 'Starting frame'},
        partial   : {type: 'boolean', value: false, name: 'Play partial', description: 'Play only until specified stop frame'},
        stopFrame : {type: 'number', value: 1, min: 1, name: 'Stop frame', depends: {partial: true}}
    },

    argsToShortString(args) {
        return `from ${args.startFrame} `
        + (args.partial ? `till ${args.stopFrame}` : 'till end');
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            resultCallback();
            return;
        }
        const frameAnimation = schemeContainer.getFrameAnimation(item.id);
        if (!frameAnimation) {
            resultCallback();
            return;
        }

        frameAnimation.setFrame(args.startFrame);
        if (args.partial) {
            frameAnimation.setStopFrame(args.stopFrame);
        } else {
            frameAnimation.setStopFrame(-1);
        }
        playInAnimationRegistry(schemeContainer.editorId, frameAnimation, item.id, 'frame-player');
        resultCallback();
    }
}