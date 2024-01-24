/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import ValueAnimation  from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';

export default {
    name: 'Hide',

    description: 'Hides your item from scene. It also allows to animate this and to perform a slow transition',
    args: {
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    argsToShortString(args) {
        if (args.animated) {
            return `animated, ${args.animationDuration} sec`
        }
        return 'instant'
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            resultCallback();
            return;
        }
        const initialOpacity = item.opacity;
        if (args.animated) {
            playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                update(t) {
                    item.opacity = initialOpacity  * (1.0 - t);
                    EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                },
                destroy() {
                    item.visible = false;
                    EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), item.id, 'visibility-animation');

            if (args.inBackground) {
                resultCallback();
            }
        } else {
            item.visible = false;
            resultCallback();
        }
    }
};
