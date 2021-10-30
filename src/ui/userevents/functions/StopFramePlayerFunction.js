/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export default {
    name: 'Stop Frame Player',
    
    description: 'Stops currently running animation in specified frame player',

    supportedShapes: ['frame_player'],

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

        frameAnimation.enabled = false;
        resultCallback();
    }
}
