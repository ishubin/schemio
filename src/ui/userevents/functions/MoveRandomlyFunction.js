/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';


class MoveRandomlyAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;

        this.itemInitialPosition = {
            x: this.item.area.x,
            y: this.item.area.y
        };

        this.point1 = {
            x: this.item.area.x,
            y: this.item.area.y
        };
        this.point2 = this.pickRandomPosition();
        this.point3 = this.pickRandomPosition();
        this._t = 0;
    }

    init() {
        return true;
    }

    pickRandomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const R = Math.random() * this.args.radius;
        return {
            x: R * Math.cos(angle) + this.itemInitialPosition.x,
            y: R * Math.sin(angle) + this.itemInitialPosition.y,
        };
    }

    play(dt) {
        if (this.args.duration > 0.00001 && this.elapsedTime < this.args.duration * 1000) {
            this.elapsedTime += dt;

            this._t += dt * this.args.speed / 1000;
            if (this._t >= 1.0) {
                this._t = 0;
                this.point1 = {
                    x: this.item.area.x,
                    y: this.item.area.y,
                };
                this.point2 = this.pickRandomPosition();
                this.point3 = this.pickRandomPosition();
            }

            const t = convertTime(this._t, 'ease-in-out');



            this.item.area.x = Math.pow(1 - t, 2) * this.point1.x  + 2 * (1 - t) * t * this.point2.x + t * t * this.point3.x;
            this.item.area.y = Math.pow(1 - t, 2) * this.point1.y  + 2 * (1 - t) * t * this.point2.y + t * t * this.point3.y;

            this.schemeContainer.reindexItemTransforms(this.item);
            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            return true;
        } else {
            this.item.area.x = this.itemInitialPosition.x;
            this.item.area.y = this.itemInitialPosition.y;
            this.schemeContainer.reindexItemTransforms(this.item);
            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
        }
        return false;
    }



    destroy() {
        this.item.area.x = this.itemInitialPosition.x;
        this.item.area.y = this.itemInitialPosition.y;
        this.schemeContainer.reindexItemTransforms(this.item);

        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Move Randomly',

    description: 'Moves item in a chaotic manner around its original location',

    args: {
        radius          : {name: 'Moving Radius',     type: 'number', value: 20, description: 'Radius within which it will perform random movements'},
        speed           : {name: 'Moving Speed',      type: 'number', value: 1.0, description: 'Speed of each random movements'},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            AnimationRegistry.play(new MoveRandomlyAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
            if (args.inBackground) {
                resultCallback();
            }
            return;
        }
        resultCallback();
    }
};

