import AnimationRegistry from '../animations/AnimationRegistry';
import Animation from '../animations/Animation';

class MoveAnimation extends Animation {
    constructor(item, args) {
        super();
        this.item = item;
        this.args = args;
        this.elapsedTime = 0.0;
        this.originalPosition = {
            x: this.item.area.x,
            y: this.item.area.y
        };
        this.destinationPosition = {
            x: parseFloat(args.x),
            y: parseFloat(args.y),
        }
    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animate && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));
            const smoothedT = Math.sin(t*Math.PI/2.0);

            this.item.area.x = this.originalPosition.x * (1.0 - smoothedT) + this.destinationPosition.x * smoothedT;
            this.item.area.y = this.originalPosition.y * (1.0 - smoothedT) + this.destinationPosition.y * smoothedT;

            if (t < 1.0) {
                return true;
            }
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
        }
        return false;
    }

    destroy() {
    }
}

export default {
    name: 'Move',
    args: {
        x:          {name: 'X',             type: 'number', value: 50},
        y:          {name: 'Y',             type: 'number', value: 50},
        animate:    {name: 'Animate',       type: 'boolean',value: false},
        duration:   {name: 'Duration (sec)',type: 'number', value: 2.0},
    },

    execute(item, args) {
        if (item) {
            AnimationRegistry.play(new MoveAnimation(item, args), item.id);
        }
    }
};
