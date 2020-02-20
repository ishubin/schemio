import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';

export default {
    name: 'Hide',
    args: {
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other acctions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            return;
        }
        const initialOpacity = item.opacity;
        if (args.animated) {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                update(t) {
                    item.opacity = initialOpacity  * (1.0 - t);
                },
                destroy() {
                    item.visible = false;
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), item.id);

            if (args.inBackground) {
                resultCallback();
            }
        } else {
            item.visible = false;
            resultCallback();
        }
    }
};
