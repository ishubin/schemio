import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';


function calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer) {
    const worldPoint = schemeContainer.worldPointOnItem(0, 0, destinationItem);
    return schemeContainer.relativePointForItem(worldPoint.x, worldPoint.y, item);
}

class MoveToItemAnimation extends Animation {
    constructor(item, args, destinationPosition, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.originalPosition = {
            x: this.item.area.x,
            y: this.item.area.y
        };
        this.destinationPosition = destinationPosition;
    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animate && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            if (t >= 1.0){
                this.item.area.x = this.destinationPosition.x;
                this.item.area.y = this.destinationPosition.y;
                this.schemeContainer.reindexItemTransforms(this.item);
                return false;
            }

            const convertedT = convertTime(t, this.args.movement);

            this.item.area.x = this.originalPosition.x * (1.0 - convertedT) + this.destinationPosition.x * convertedT;
            this.item.area.y = this.originalPosition.y * (1.0 - convertedT) + this.destinationPosition.y * convertedT;
            this.schemeContainer.reindexItemTransforms(this.item);

            return true;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
            this.schemeContainer.reindexItemTransforms(this.item);
        }
        return false;
    }



    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Move to Item',
    args: {
        destinationItem : {name: 'Destination Item',  type: 'element',value: null, description: 'Other item to which this item should be move'},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'linear', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            const destinationItem = schemeContainer.findFirstElementBySelector(args.destinationItem, item);
            let destinationPosition = null;
            if (destinationItem && destinationItem.id !== item.id) {
                destinationPosition = calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer);
            }
            
            if (destinationPosition) {
                if (args.animate) {
                    AnimationRegistry.play(new MoveToItemAnimation(item, args, destinationPosition, schemeContainer, resultCallback), item.id);
                    if (args.inBackground) {
                        resultCallback();
                    }
                    return;

                } else {
                    item.area.x = destinationPosition.x;
                    item.area.y = destinationPosition.y;
                    schemeContainer.reindexItemTransforms(item);
                }
            }
        }
        resultCallback();
    }
};

