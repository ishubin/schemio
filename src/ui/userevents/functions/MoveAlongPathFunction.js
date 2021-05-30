import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import { convertTime } from '../../animations/ValueAnimation';


class MoveAlongPathAnimation extends Animation {
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
        this.domPath = null;
        this.pathItem = null;
        this.pathTotalLength = 1.0;
        
    }

    init() {
        if (this.args.path) {
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
        if (this.domPath && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            if (t >= 1.0){
                this.moveToPathLength(this.pathTotalLength * this.args.endPosition / 100.0);
                return false;
            }

            const convertedT = convertTime(t, this.args.movement);
            this.moveToPathLength(this.pathTotalLength * (this.args.startPosition * (1.0 - convertedT) + this.args.endPosition * convertedT) / 100.0);

            return true;
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

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Move Along Path',
    args: {
        path            : {name: 'Path',              type: 'element',value: null},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-in-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce']},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, min: 0},
        startPosition   : {name: 'Start position (%)',type: 'number', value: 0, description: 'Initial position on the path in percentage to its total length'},
        endPosition     : {name: 'End position (%)',  type: 'number', value: 100, description: 'Final position on the path in percentage to its total length'},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            AnimationRegistry.play(new MoveAlongPathAnimation(item, args, schemeContainer, resultCallback), item.id);
            if (args.inBackground) {
                resultCallback();
            }
            return;
        }
        resultCallback();
    }
};

