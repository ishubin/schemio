import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';

class ShowAnimation extends Animation {
    constructor(item, args) {
        super();
        this.item = item;
        this.args = args;
        this.time = 0;
    }

    init() {
        this.item.opacity = 0.0;
        this.item.visible = true;
        return true;
    }

    play(dt) {
        this.time += dt;
        if (this.time > this.args.animationDuration * 1000.0) {
            return false;
        }
        let t = 0.0;
        if (this.args.animationDuration > 0.00001) {
            t = this.time / (this.args.animationDuration * 1000.0);
        }

        // using ease-out animation
        this.item.opacity = 100.0 * (1 - (t-1)*(t-1));
        return true;
    }

    destroy() {
        this.item.visible = true;
        this.item.opacity = 100.0;
    }
}

export default {
    name: 'Show',
    args: {
        animated: {name: 'Animated', type: 'boolean', value: true},
        animationDuration: {name: 'Animation duration (sec)', type: 'number', value: 0.5},
    },

    execute(item, args) {
        if (item) {
            if (args.animated) {
                AnimationRegistry.play(new ShowAnimation(item, args), item.id);
            } else {
                item.visible = true;
            }
        }
    }
};
