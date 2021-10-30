/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';



class ScaleAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.originalArea = {
            x: item.area.x,
            y: item.area.y,
            w: item.area.w,
            h: item.area.h
        };
        this.destinationScale = {
            w: parseFloat(args.width),
            h: parseFloat(args.height),
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

            this.item.area.w = this.originalArea.w * (1.0 - convertedT) + this.destinationScale.w * convertedT;
            this.item.area.h = this.originalArea.h * (1.0 - convertedT) + this.destinationScale.h * convertedT;


            EventBus.emitItemChanged(this.item.id);
            this.schemeContainer.reindexItemTransforms(this.item);

            return proceed;
        } else {
            this.item.area.w = this.destinationScale.w;
            this.item.area.h = this.destinationScale.h;
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
        width           : {name: 'Width',             type: 'number', value: 100},
        height          : {name: 'Height',            type: 'number', value: 100},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
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
                item.area.w = parseFloat(args.width);
                item.area.h = parseFloat(args.height);
                EventBus.emitItemChanged(item.id);
                schemeContainer.reindexItemTransforms(item);
            }
        }
        resultCallback();
    }
};


