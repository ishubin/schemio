/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import { convertTime } from '../../animations/ValueAnimation';
import MoveAlongPathAnimationFunction from '../../animations/functions/MoveAlongPathAnimationFunction';
import EditorEventBus from '../../components/editor/EditorEventBus';
import SchemeContainer from '../../scheme/SchemeContainer';


class MoveAlongPathAnimation extends Animation {
    /**
     *
     * @param {Item} item
     * @param {*} args
     * @param {SchemeContainer} schemeContainer
     * @param {*} resultCallback
     */
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        /** @type {SchemeContainer} */
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

            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
            return true;
        }
        return false;
    }

    moveToPathLength(length) {
        MoveAlongPathAnimationFunction.execute({
            path: this.domPath,
            item: this.item,
            pathItem: this.pathItem,
            schemeContainer: this.schemeContainer,
            totalLength: this.pathTotalLength,
            rotateItem: this.args.rotateItem,
            rotationOffset: this.args.rotationOffset
        }, {
            distance: 100 * length / Math.max(1, this.pathTotalLength),
            rotation: 0
        });
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Move Along Path',

    description: 'Moves item along the outline of the other item. It is best to use this effect when moving item along the custom curve',

    args: {
        path            : {name: 'Path',              type: 'element',value: null},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-in-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce']},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, min: 0, softMax: 10, step: 0.1},
        startPosition   : {name: 'Start position (%)',type: 'number', value: 0, description: 'Initial position on the path in percentage to its total length', min: 0, max: 100},
        endPosition     : {name: 'End position (%)',  type: 'number', value: 100, description: 'Final position on the path in percentage to its total length', min: 0, max: 100},
        rotateItem      : {name: 'Rotate item',       type: 'boolean',value: false, description: 'Adjust rotation of the item to path'},
        rotationOffset  : {name: 'Rotation offset',   type: 'number', value: 0, description: 'Rotation angle offset', depends: {rotateItem: true}, min: -360, max: 360},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            playInAnimationRegistry(schemeContainer.editorId, new MoveAlongPathAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
            if (args.inBackground) {
                resultCallback();
            }
            return;
        }
        resultCallback();
    }
};

