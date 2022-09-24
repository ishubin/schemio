/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';
import myMath from '../../myMath';
import utils from '../../utils';



class ScaleAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.originalArea = utils.clone(item.area);
        this.destinationScale = {
            sx: parseFloat(args.scaleX),
            sy: parseFloat(args.scaleY),
        };

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
            }

            this.item.area.sx = this.originalArea.sx * (1.0 - convertedT) + this.destinationScale.sx * convertedT;
            this.item.area.sy = this.originalArea.sy * (1.0 - convertedT) + this.destinationScale.sy * convertedT;

            const wp = myMath.worldPointInArea(this.originalArea.w * this.originalArea.px, this.originalArea.h * this.originalArea.py, this.originalArea, this.item.meta.transformMatrix);
            const p = myMath.findTranslationMatchingWorldPoint(wp.x, wp.y, this.item.area.w * this.item.area.px, this.item.area.h * this.item.area.py, this.item.area, this.item.meta.transformMatrix);
            if (p) {
                this.item.area.x = p.x;
                this.item.area.y = p.y;
            }


            EventBus.emitItemChanged(this.item.id);
            this.schemeContainer.reindexItemTransforms(this.item);

            return proceed;
        } else {
            this.item.area.sx = this.destinationScale.sx;
            this.item.area.sy = this.destinationScale.sy;
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
    name: 'Scale',

    description: 'Changes width and height of the item',

    args: {
        scaleX          : {name: 'Scale X',           type: 'number', value: 1.5},
        scaleY          : {name: 'Scale Y',           type: 'number', value: 1.5},
        animate         : {name: 'Animate',           type: 'boolean',value: true},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    argsToShortString(args) {
        if (args.animated) {
            return `animated, ${args.animationDuration} sec`
        }
        return `x: ${args.x}, y: ${args.y} ` + (args.animate ? 'animated' : '');
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animate) {
                AnimationRegistry.play(new ScaleAnimation(item, args, schemeContainer, resultCallback), item.id);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.sx = parseFloat(args.scaleX);
                item.area.sy = parseFloat(args.scaleY);
                EventBus.emitItemChanged(item.id);
                schemeContainer.reindexItemTransforms(item);
            }
        }
        resultCallback();
    }
};


