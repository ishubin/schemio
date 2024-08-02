/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import EditorEventBus from '../../components/editor/EditorEventBus';


class BlinkEffectAnimation extends Animation {
    constructor(editorId, item, args, resultCallback) {
        super();
        this.editorId = editorId;
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.domContainer = null;
        this.domBlinker = null;

        this.opacity = 0;
        this.itemOriginalOpacity = 100;
        this.phase = 0; // 0 - fade in, 1 - pulsate, 2 - fade out
        this.pulsatingTime = 0;
        this.phaseOffset = 0;
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);

        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return false;
        }

        if (this.args.fade) {
            const delta = this.args.maxOpacity - this.args.minOpacity;
            this.phase = 1;
            if (delta > 0.001) {
                this.phaseOffset = Math.asin(2 * (this.item.opacity - this.args.minOpacity) / delta - 2);
            }

        } else {
            this.domBlinker = this.svg('path', {
                'd':            shape.computeOutline(this.item),
                'stroke-width': 3,
                'stroke':       this.args.color,
                'fill':         this.args.color,
                'style':        `opacity: ${this.args.minOpacity}`
            });

            this.domContainer.appendChild(this.domBlinker);
        }

        return true;
    }

    play(dt) {
        this.elapsedTime += dt;

        this.t += this.args.speed * dt / 10000;

        let shouldContinue = false;
        if (this.args.fade) {
            shouldContinue = this.playFade(dt);
        } else {
            shouldContinue = this.playBlinker(dt);
        }

        return this.args.infinite ? true : shouldContinue;
    }

    playFade(dt) {
        const speedRatio = 100;

        if (this.phase === 1) {
            this.pulsatingTime += dt;
            const t = Math.sin(this.pulsatingTime * this.args.speed / (speedRatio *100.0) + this.phaseOffset) / 2 + 0.5;
            this.item.opacity = this.args.minOpacity * (1 - t) + this.args.maxOpacity * t;

            if (!this.args.infinite && this.args.duration * 1000 - this.elapsedTime < Math.min(500, this.args.duration * 1000 / 20)) {
                this.phase = 2;
            }
        }

        if (this.phase === 2) {
            this.item.opacity += this.args.speed * dt / speedRatio;
            if (this.item.opacity >= this.itemOriginalOpacity) {
                this.item.opacity = this.itemOriginalOpacity;
                return false;
            }
        }

        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);

        return this.elapsedTime < this.args.duration * 1000.0;
    }

    playBlinker(dt) {
        if (this.phase === 0) {
            if (this.opacity < this.args.minOpacity / 100) {
                this.opacity += this.args.speed * dt / 10000;
            } else {
                this.opacity = this.args.minOpacity / 100;
                this.phase = 1;
            }
        } else if (this.phase === 1) {
            this.pulsatingTime += dt;
            this.opacity = ((Math.sin(this.pulsatingTime * this.args.speed / 10000.0) / 2 + 0.5) * (this.args.maxOpacity - this.args.minOpacity) + this.args.minOpacity) / 100.0;

            if (!this.args.infinite && this.args.duration * 1000 - this.elapsedTime < Math.min(500, this.args.duration * 1000 / 20)) {
                this.phase = 2;
            }
        } else {
            this.opacity -= this.args.speed * dt / 10000;
            if (this.opacity < 0) {
                return false;
            }
        }

        this.domBlinker.setAttribute('style', `opacity: ${this.opacity}`);

        return this.elapsedTime < this.args.duration * 1000.0;
    }

    destroy() {
        this.item.opacity = this.itemOriginalOpacity;

        if (!this.args.inBackground) {
            this.resultCallback();
        }
        if (this.domBlinker) {
            this.domContainer.removeChild(this.domBlinker);
        }
    }

}

export default {
    name: 'Blink Effect',

    description: 'Generates a pulsating effect in which item fades in and out or glows with specified color',

    args: {
        fade            : {name: 'Fade in/out',       type: 'boolean', value: true },
        color           : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)', depends: {fade: false}},
        speed           : {name: 'Speed',             type: 'number', value: 50},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {infinite: false}},
        infinite        : {name: 'Infinite animation',type: 'boolean', value: false, description: 'Plays animation indefinitely'},
        minOpacity      : {name: 'Min Opacity (%)',   type: 'number', value: 5},
        maxOpacity      : {name: 'Max Opacity (%)',   type: 'number', value: 80},
        inBackground    : {name: 'In Background',     type: 'boolean', value: false, description: 'Play animation in background without blocking invocation of other acctions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            playInAnimationRegistry(schemeContainer.editorId, new BlinkEffectAnimation(schemeContainer.editorId, item, args, resultCallback), item.id, this.name);

            if (args.inBackground) {
                resultCallback();
            }
        }
    }
}