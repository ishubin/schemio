import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';

export default {
    name: 'Show',
    args: {
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other acctions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            return;
        }
        if (args.animated) {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                init() {
                    item.opacity = 0.0;
                    item.visible = true;
                },
                update(t) {
                    item.opacity = 100.0 * t;
                },
                destroy() {
                    item.visible = true;
                    item.opacity = 100.0;
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
