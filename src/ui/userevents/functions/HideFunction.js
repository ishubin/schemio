import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation  from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';

export default {
    name: 'Hide',

    description: 'Hides your item from scene. It also allows to animate this and to perform a slow transition',
    args: {
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            resultCallback();
            return;
        }
        const initialOpacity = item.opacity;
        if (args.animated) {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                update(t) {
                    item.opacity = initialOpacity  * (1.0 - t);
                    EventBus.emitItemChanged(item.id);
                },
                destroy() {
                    item.visible = false;
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
            item.visible = false;
            resultCallback();
        }
    }
};
