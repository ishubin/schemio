/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import EditorEventBus from '../../components/editor/EditorEventBus';

class FlowAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.offset = 0.0;
        this.time = 0.0;
    }

    init() {
        return true;
    }

    play(dt) {
        this.time += dt;
        this.offset -= this.args.speed * dt / 1000.0;
        this.item.meta.strokeOffset = this.offset;
        EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);

        if (!this.args.infinite && this.time > this.args.duration * 1000.0) {
            return false;
        }
        return true;
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}


export default {
    name: 'Flow Animation',

    description: 'Animates displacement of a stroke and simulates a flow animation',

    args: {
        speed         : {name: 'Speed',             type: 'number', value: 30, description: 'Use negative value if you want the animation to be performed backwards'},
        duration      : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {infinite: false}},
        infinite      : {name: 'Infinite animation',type: 'boolean', value: false, description: 'Plays animation indefinitely'},
        inBackground  : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            playInAnimationRegistry(schemeContainer.editorId, new FlowAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
};