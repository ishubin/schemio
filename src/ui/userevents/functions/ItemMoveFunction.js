import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';

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
        this.pathTotalLength = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.connectorSourceItem = null;
    }

    init() {
        if (this.args.animate && this.args.usePath && this.args.path) {
            if (this.args.path.connector) {
                const connector = this.schemeContainer.findConnectorById(this.args.path.connector);
                if (connector) {
                    this.connectorSourceItem = this.schemeContainer.findItemById(connector.meta.sourceItemId);
                }
                this.domPath = document.getElementById(`connector-${this.args.path.connector}-path`);
                this.offsetX = -this.item.area.w/2;
                this.offsetY = -this.item.area.h/2;
            } else if (this.args.path.item) {
                this.domPath = document.getElementById(`item-svg-path-${this.args.path.item}`);

                const otherItem = this.schemeContainer.findItemById(this.args.path.item);
                if (otherItem) {
                    this.offsetX = otherItem.area.x - this.item.area.w/2;
                    this.offsetY = otherItem.area.y - this.item.area.h/2;
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
                    if (this.args.reverse) {
                        this.moveToPathLength(0);
                    } else {
                        this.moveToPathLength(this.pathTotalLength);
                    }
                } else {
                    this.item.area.x = this.destinationPosition.x;
                    this.item.area.y = this.destinationPosition.y;
                }
                return false;
            }

            const convertedT = this.convertTime(t);

            if (this.domPath) {
                if (this.args.reverse) {
                    this.moveToPathLength((1.0 - convertedT) * this.pathTotalLength);
                } else {
                    this.moveToPathLength(convertedT * this.pathTotalLength);
                }
            } else {
                this.item.area.x = this.originalPosition.x * (1.0 - convertedT) + this.destinationPosition.x * convertedT;
                this.item.area.y = this.originalPosition.y * (1.0 - convertedT) + this.destinationPosition.y * convertedT;
            }

            return true;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
        }
        return false;
    }

    moveToPathLength(length) {
        const point = this.domPath.getPointAtLength(length);
        let worldPoint = point;
        if (this.connectorSourceItem) {
            worldPoint = this.schemeContainer.worldPointOnItem(point.x, point.y, this.connectorSourceItem);
        }

        // bringing transform back from world to local so that also works correctly for sub-items
        let localPoint = worldPoint;
        if (this.item.meta && this.item.meta.parentId) {
            const parentItem = this.schemeContainer.findItemById(this.item.meta.parentId);
            if (parentItem) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, parentItem);
            }
        }
        this.item.area.x = localPoint.x + this.offsetX;
        this.item.area.y = localPoint.y + this.offsetY;
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
        reverse         : {name: 'Reverse',           type: 'boolean',value: false, depends: {animate: true, usePath: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animate) {
                AnimationRegistry.play(new MoveAnimation(item, args, schemeContainer, resultCallback), item.id);
            } else {
                item.area.x = args.x;
                item.area.y = args.y;
            }
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
};
