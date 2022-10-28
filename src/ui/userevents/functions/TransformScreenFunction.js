/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import EventBus from '../../components/editor/EventBus';
import ValueAnimation from '../../animations/ValueAnimation';
import AnimationRegistry from '../../animations/AnimationRegistry';

export default {
    name: 'Transform Screen (Hidden)',

    description: 'Animates changing screen transform',

    args: {
        x    : {name: 'x', type: 'number', value: 0},
        y    : {name: 'y', type: 'number', value: 0},
        scale: {name: 'scale', type: 'number', value: 0},
    },

    argsToShortString(args) {
        if (args.animated) {
            return `animated, ${args.animationDuration} sec`
        }
        return 'instant'
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        resultCallback();

        const oldX = schemeContainer.screenTransform.x;
        const oldY = schemeContainer.screenTransform.y;
        const oldZoom = schemeContainer.screenTransform.scale;

        AnimationRegistry.play(new ValueAnimation({
            durationMillis: 500.0,
            animationType: 'ease-in-out',
            update: (t) => {
                schemeContainer.screenTransform.scale = (oldZoom * (1.0-t) + args.scale * t);
                schemeContainer.screenTransform.x = oldX * (1.0-t) + args.x * t;
                schemeContainer.screenTransform.y = oldY * (1.0-t) + args.y * t;
            },
            destroy: () => {
                EventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, schemeContainer.screenTransform);
                if (!args.inBackground) {
                    resultCallback();
                }
            }
        }));
    }
};


