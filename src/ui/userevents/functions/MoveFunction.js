/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EventBus from '../../components/editor/EventBus';


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

            EventBus.emitItemChanged(this.item.id);
            return true;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
            this.schemeContainer.reindexItemTransforms(this.item);
            EventBus.emitItemChanged(this.item.id);
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
    name: 'Move',

    description: 'Moves item to specified location in local coords',

    args: {
        x               : {name: 'X',                 type: 'number', value: 50},
        y               : {name: 'Y',                 type: 'number', value: 50},
        animate         : {name: 'Animate',           type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animate: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'linear', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animate: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions', depends: {animate: true}}
    },

    argsToShortString(args) {
        return `x: ${args.x}, y: ${args.y} ` + (args.animate ? 'animated' : '');
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animate) {
                AnimationRegistry.play(new MoveAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
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
