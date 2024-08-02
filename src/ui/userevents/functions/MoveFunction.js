/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';
import SchemeContainer from '../../scheme/SchemeContainer';


class MoveAnimation extends Animation {

    /**
     *
     * @param {Item} item
     * @param {Object} args
     * @param {SchemeContainer} schemeContainer
     * @param {function} resultCallback
     */
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
        this.destinationPosition = args.kind === 'relative'? {
            x: this.item.area.x + parseFloat(args.x),
            y: this.item.area.y + parseFloat(args.y),

        } : {
            x: parseFloat(args.x),
            y: parseFloat(args.y),
        }
    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animated && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            if (t >= 1.0){
                this.item.area.x = this.destinationPosition.x;
                this.item.area.y = this.destinationPosition.y;
                this.schemeContainer.updateChildTransforms(this.item);
                return false;
            }

            const convertedT = convertTime(t, this.args.movement);

            this.item.area.x = this.originalPosition.x * (1.0 - convertedT) + this.destinationPosition.x * convertedT;
            this.item.area.y = this.originalPosition.y * (1.0 - convertedT) + this.destinationPosition.y * convertedT;
            this.schemeContainer.updateChildTransforms(this.item);

            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
            return true;
        } else {
            this.item.area.x = this.destinationPosition.x;
            this.item.area.y = this.destinationPosition.y;
            this.schemeContainer.updateChildTransforms(this.item);
            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
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
        kind            : {name: 'Position', type: 'choice', value: 'absolute', options: ['absolute', 'relative'],
            description: 'Specifies type of movement. "absolute" movement uses "x" and "y" as is, '
                +'while "relative" movement specifies that item should move by specified "x" and "y"'
        },
        x               : {name: 'X',                 type: 'number', value: 50},
        y               : {name: 'Y',                 type: 'number', value: 50},
        animated        : {name: 'Animated',          type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animated: true}},
        movement        : {name: 'Movement',          type: 'choice', value: 'linear', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions', depends: {animated: true}}
    },

    argsToShortString(args) {
        const deltaLabel = args.kind === 'relative' ? 'Δ': '';
        return `${deltaLabel}x: ${args.x}, ${deltaLabel}y: ${args.y} ` + (args.animated ? 'animated' : '');
    },

    /**
     *
     * @param {Item} item
     * @param {*} args
     * @param {SchemeContainer} schemeContainer
     * @param {*} userEventBus
     * @param {*} resultCallback
     * @returns
     */
    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animated) {
                playInAnimationRegistry(schemeContainer.editorId, new MoveAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                if (args.kind === 'relative') {
                    item.area.x += args.x;
                    item.area.y += args.y;
                } else {
                    item.area.x = args.x;
                    item.area.y = args.y;
                }
                schemeContainer.updateChildTransforms(item);
                EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                schemeContainer.readjustItemAndDescendants(item.id);
            }
        }
        resultCallback();
    }
};
