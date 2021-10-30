/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';


function calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer) {
    const worldPoint = schemeContainer.worldPointOnItem(0, 0, destinationItem);
    return schemeContainer.relativePointForItem(worldPoint.x, worldPoint.y, item);
}

class MoveToItemAnimation extends Animation {
    constructor(item, args, destinationPosition, destinationAngle, destinationWidth, destinationHeight, schemeContainer, resultCallback) {
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
        this.originalAngle = item.area.r;
        this.destinationAngle = destinationAngle;

        this.originalWidth = item.area.w;
        this.destinationWidth = destinationWidth;
        this.originalHeight = item.area.h;
        this.destinationHeight = destinationHeight;
    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animate && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            let shouldProceedAnimating = true;
            
            let convertedT = convertTime(t, this.args.movement);

            if (t >= 1.0){
                convertedT = 1.0;
                shouldProceedAnimating = false;
            }

            this.item.area.x = this.originalPosition.x * (1.0 - convertedT) + this.destinationPosition.x * convertedT;
            this.item.area.y = this.originalPosition.y * (1.0 - convertedT) + this.destinationPosition.y * convertedT;

            if (this.args.rotate) {
                this.item.area.r = this.originalAngle * (1.0 - convertedT) + this.destinationAngle * convertedT;
            }
            if (this.args.alignWidth) {
                this.item.area.w = this.originalWidth * (1.0 - convertedT) + this.destinationWidth * convertedT;
            }
            if (this.args.alignHeight) {
                this.item.area.h = this.originalHeight * (1.0 - convertedT) + this.destinationHeight * convertedT;
            }
            EventBus.emitItemChanged(this.item.id);
            this.schemeContainer.reindexItemTransforms(this.item);

            return shouldProceedAnimating;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
            EventBus.emitItemChanged(this.item.id);
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

    description: 'Moves item into another item. It also lets rotation and scale align to the destination item with a smooth transition',

    args: {
        destinationItem : {name: 'Destination Item',  type: 'element',value: null, description: 'Other item to which this item should be moved'},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-in-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        rotate          : {name: 'Rotate',            type: 'boolean',value: false, description: 'Align rotation of items'},
        rotationOffset  : {name: 'Rotation Offset',   type: 'number', value: 0.0, depends: {rotate: true}, description: 'Rotation angle offset'},
        alignWidth      : {name: 'Align Width',       type: 'boolean',value: false, description: 'Adjust items width so that it fits to the width of its destination item'},
        alignHeight     : {name: 'Align Height',      type: 'boolean',value: false, description: 'Adjust items height so that it fits to the height of its destination item'},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            const destinationItem = schemeContainer.findFirstElementBySelector(args.destinationItem, item);
            let destinationAngle = 0;
            let destinationPosition = null;
            let destinationWidth = item.area.w;
            let destinationHeight = item.area.h;

            if (destinationItem && destinationItem.id !== item.id) {
                destinationPosition = calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer);

                destinationWidth = destinationItem.area.w;
                destinationHeight = destinationItem.area.h;
            }

            
            if (destinationPosition) {
                if (args.animate) {
                    AnimationRegistry.play(new MoveToItemAnimation(item, args, destinationPosition, destinationAngle, destinationWidth, destinationHeight, schemeContainer, resultCallback), item.id);
                    if (args.inBackground) {
                        resultCallback();
                    }
                    return;

                } else {
                    item.area.x = destinationPosition.x;
                    item.area.y = destinationPosition.y;
                    if (args.rotate) {
                        item.area.r = destinationAngle + args.rotationOffset;
                    }

                    if (args.alignWidth) {
                        item.area.w = destinationWidth;
                    }
                    if (args.alignHeight) {
                        item.area.h = destinationHeight;
                    }
                    EventBus.emitItemChanged(item.id);
                    schemeContainer.reindexItemTransforms(item);
                }
            }
        }
        resultCallback();
    }
};

