/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from "../../animations/AnimationRegistry";


export default {
    name: 'Play Frames',
    
    description: 'Triggers animations in specified frame player',

    supportedShapes: ['frame_player'],

    args: {
        startFrame: {type: 'number', value: 1, min: 1, name: 'Starting Frame'}
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
        AnimationRegistry.play(frameAnimation, item.id);
        resultCallback();
    }
}