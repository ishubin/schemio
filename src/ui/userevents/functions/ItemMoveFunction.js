import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';


class MoveAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
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
        this.destinationPosition = {
            x: parseFloat(args.x),
            y: parseFloat(args.y),
        }

        this.domPath = null;
        this.pathItem = null;
        this.pathTotalLength = 1.0;
        
    }

    init() {
        if (this.args.animate && this.args.usePath && this.args.path) {

            const element = this.schemeContainer.findFirstElementBySelector(this.args.path, this.item);

            if (element) {
                const shape = Shape.find(element.shape);
                if (shape) {
                    const path = shape.computeOutline(element);
                    if (path) {
                        this.domPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        this.domPath.setAttribute('d', path);
                        this.pathItem = element;
                    }
                }
            }

            if (this.domPath) {
                this.pathTotalLength = this.domPath.getTotalLength();
            }
        }
        return true;
    }

    play(dt) {
        if (this.args.animate && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            if (t >= 1.0){
                if (this.domPath) {
                    this.moveToPathLength(this.pathTotalLength * this.args.endPosition / 100.0);
                } else {
                    this.item.area.x = this.destinationPosition.x;
                    this.item.area.y = this.destinationPosition.y;
                    this.schemeContainer.reindexItemTransforms(this.item);
                }
                return false;
            }

            const convertedT = this.convertTime(t);

            if (this.domPath) {
                this.moveToPathLength(this.pathTotalLength * (this.args.startPosition * (1.0 - convertedT) + this.args.endPosition * convertedT) / 100.0);
            } else {
                this.item.area.x = this.originalPosition.x * (1.0 - convertedT) + this.destinationPosition.x * convertedT;
                this.item.area.y = this.originalPosition.y * (1.0 - convertedT) + this.destinationPosition.y * convertedT;
                this.schemeContainer.reindexItemTransforms(this.item);
            }

            return true;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
            this.schemeContainer.reindexItemTransforms(this.item);
        }
        return false;
    }

    moveToPathLength(length) {
        const point = this.domPath.getPointAtLength(length);
        let worldPoint = this.schemeContainer.worldPointOnItem(point.x, point.y, this.pathItem);

        // bringing transform back from world to local so that also works correctly for sub-items
        let localPoint = worldPoint;
        if (this.item.meta && this.item.meta.parentId) {
            const parentItem = this.schemeContainer.findItemById(this.item.meta.parentId);
            if (parentItem) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, parentItem);
            }
        }
        this.item.area.x = localPoint.x - this.item.area.w / 2;
        this.item.area.y = localPoint.y - this.item.area.h / 2;
        this.schemeContainer.reindexItemTransforms(this.item);
    }

    /**
     * This fuction converts t according to movement type. This is needed in order to get smooth animation or any other effect.
     * @param {Float} t - time of animation in ratio to animation length (from 0.0 to 1.0)
     */
    convertTime(t) {
        if (this.args.movement === 'smooth') {
            return Math.sin(t*Math.PI/2.0);
        } else if (this.args.movement === 'ease-in') {
            return t*t;
        } else if (this.args.movement === 'ease-out') {
            return 1 - (t-1)*(t-1);
        } else if (this.args.movement === 'ease-in-out') {
            return 0.5 - Math.cos(t * Math.PI) / 2;
        } else if (this.args.movement === 'bounce') {
            return 1 - Math.pow(3, -10 * t) * Math.cos(10 * Math.PI *t);
        }
        return t;
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Move',
    args: {
        x               : {name: 'X',                 type: 'number', value: 50},
        y               : {name: 'Y',                 type: 'number', value: 50},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'linear', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        usePath         : {name: 'Move Along Path',   type: 'boolean',value: false, depends: {animate: true}},
        path            : {name: 'Path',              type: 'element',value: null, depends: {animate: true, usePath: true}},
        startPosition   : {name: 'Start position (%)',type: 'number', value: 0, depends: {animate: true, usePath: true}, description: 'Initial position on the path in percentage to its total length'},
        endPosition     : {name: 'End position (%)',  type: 'number', value: 100, depends: {animate: true, usePath: true}, description: 'Final position on the path in percentage to its total length'},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animate) {
                AnimationRegistry.play(new MoveAnimation(item, args, schemeContainer, resultCallback), item.id);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.x = args.x;
                item.area.y = args.y;
                schemeContainer.reindexItemTransforms(item);
            }
        }
        resultCallback();
    }
};
