/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import myMath from '../../myMath';

class DrawEffectAnimation extends Animation {
    constructor(item, args, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.domContainer = null;
        this.domPath = null;
        this.time = 0.0;

        this.backupOpacity = 1.0;
        this.domAnimationPath = null;
        this.pathLength = 0;
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);

        const shape = Shape.find(this.item.shape);
        if (shape) {
            const path = shape.computeOutline(this.item);
            if (path) {
                this.domPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this.domPath.setAttribute('d', path);
                this.pathLength = this.domPath.getTotalLength();
            }
        }

        if (!this.domContainer || !this.domPath) {
            return false;
        }

        this.domAnimationPath = this.svg('path', {
            'd': this.domPath.getAttribute('d'),
            'stroke-dasharray': this.pathLength,
            'stroke-dashoffset': this.pathLength,
            'stroke-width': this.args.strokeSize || 1,
            'stroke': this.args.color,
            'fill': 'none',
            'stroke-linejoin': 'round',
        });
        this.domContainer.appendChild(this.domAnimationPath);

        let opacity = window.getComputedStyle(this.domPath).opacity;
        if (opacity && opacity > 0.0) {
            this.backupOpacity = opacity;
        }

        this.domPath.style.opacity = 0.0;
        return true;
    }

    play(dt) {
        this.time += dt;

        let t = 1;
        if (!myMath.tooSmall(this.args.duration)) {
            t = this.time / (this.args.duration * 1000.0);
        }
        this.domAnimationPath.setAttribute('stroke-dashoffset', Math.floor(this.pathLength * (1 - t)));

        if (this.args.twoWay) {
            if (this.time > 2 * this.args.duration * 1000.0) {
                return false;
            }
        } else {
            if (this.time > this.args.duration * 1000.0) {
                return false;
            }
        }
        return true;
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
        if (this.domAnimationPath) {
            this.domContainer.removeChild(this.domAnimationPath);
        }

        if (this.domPath) {
            this.domPath.style.opacity = this.backupOpacity;
        }
    }
}

export default {
    name: 'Draw Effect',

    description: 'Animates outline by simulating a drawing effect',

    args: {
        color         : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        strokeSize    : {name: 'Stroke size',       type: 'number',  value: 2},
        duration      : {name: 'Duration (sec)',    type: 'number', value: 2.0},
        twoWay        : {name: 'Two way',           type: 'boolean', value: false},
        inBackground  : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            playInAnimationRegistry(schemeContainer.editorId, new DrawEffectAnimation(item, args, resultCallback), item.id, this.name);
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
};
