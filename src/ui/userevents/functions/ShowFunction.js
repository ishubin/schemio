import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation, { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';

export default {
    name: 'Show',

    description: 'Makes your item visible on scene. You can also make it with a slow transition.',

    args: {
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            return;
        }
        if (args.animated) {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                init() {
                    item.opacity = 0.0;
                    item.visible = true;
                    EventBus.emitItemChanged(item.id);
                },
                update(t) {
                    item.opacity = 100.0 * t;
                    EventBus.emitItemChanged(item.id);
                },
                destroy() {
                    item.visible = true;
                    item.opacity = 100.0;
                    EventBus.emitItemChanged(item.id);
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), item.id);
            if (args.inBackground) {
                resultCallback();
            }
        } else {
            item.visible = true;
            if (item.opacity < 0.5) {
                item.opacity = 100.0;
            }
            resultCallback();
        }
    }
};
