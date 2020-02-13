import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';

export default {
    name: 'Hide',
    args: {
        animated: {name: 'Animated', type: 'boolean', value: true},
        animationDuration: {name: 'Animation duration (sec)', type: 'number', value: 0.5},
    },

    execute(item, args) {
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
                }
            }), item.id);
        } else {
            item.visible = false;
        }
    }
};
