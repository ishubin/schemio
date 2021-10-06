import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';


class RotateAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.originalAngle = this.item.area.r;
        this.destinationAngle = parseFloat(args.angle);
    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animate && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            let convertedT = convertTime(t, this.args.movement);
            let proceed = true;
            if (t >= 1.0){
                proceed = false;
                convertedT = 1.0;
                return false;
            }

            this.item.area.r = this.originalAngle * (1.0 - convertedT) + this.destinationAngle * convertedT;
            this.schemeContainer.reindexItemTransforms(this.item);

            EventBus.emitItemChanged(this.item.id);
            return proceed;
        } else {
            this.item.area.r = this.destinationAngle;
            this.schemeContainer.reindexItemTransforms(this.item);
        }

        EventBus.emitItemChanged(this.item.id);
        return false;
    }



    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Rotate',

    description: 'Rotates item by specified angle',

    args: {
        angle           : {name: 'Angle',             type: 'number', value: 0},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animate) {
                AnimationRegistry.play(new RotateAnimation(item, args, schemeContainer, resultCallback), item.id);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.r = parseFloat(args.angle);
                schemeContainer.reindexItemTransforms(item);
            }
        }
        resultCallback();
    }
};

