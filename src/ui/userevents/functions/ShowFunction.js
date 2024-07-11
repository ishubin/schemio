/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';

export default {
    name: 'Show',

    description: 'Makes your item visible on scene. You can also make it with a slow transition.',

    args: {
        targetOpacity       : {name: 'Target opacity', type: 'number', value: 100},
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    menuOptions: [{
        name: 'Show (animated)',
        args: {
            animated: true
        }
    }, {
        name: 'Show (instantly)',
        args: {
            animated: false
        }
    }],

    argsToShortString(args) {
        if (args.animated) {
            return `animated, ${args.animationDuration} sec`
        }
        return 'instant'
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            return;
        }
        if (args.animated) {
            playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                init() {
                    item.opacity = 0.0;
                    item.visible = true;
                    EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                },
                update(t) {
                    item.opacity = args.targetOpacity * t;
                    EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                },
                destroy() {
                    item.visible = true;
                    item.opacity = args.targetOpacity;
                    schemeContainer.updateVisibility(item);
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
            item.visible = true;
            item.opacity = args.targetOpacity;
            schemeContainer.updateVisibility(item);
            EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
            resultCallback();
        }
    }
};
