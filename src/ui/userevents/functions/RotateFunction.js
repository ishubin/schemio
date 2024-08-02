/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';


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
        if (this.args.animated && this.args.duration > 0.00001) {
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
            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.updateChildTransforms(this.item);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
            return proceed;
        } else {
            this.item.area.r = this.destinationAngle;
            this.schemeContainer.updateChildTransforms(this.item);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
        }

        EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
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
        animated        : {name: 'Animated',          type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animated: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions', depends: {animated: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animated) {
                playInAnimationRegistry(schemeContainer.editorId, new RotateAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.r = parseFloat(args.angle);
                schemeContainer.updateChildTransforms(item);
                EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                schemeContainer.readjustItemAndDescendants(item.id);
            }
        }
        resultCallback();
    }
};

