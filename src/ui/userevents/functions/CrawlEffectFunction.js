/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';

class CrawlEffectAnimation extends Animation {
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
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);

        const shape = Shape.find(this.item.shape);
        if (shape) {
            const path = shape.computeOutline(this.item);
            if (path) {
                this.domPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this.domPath.setAttribute('d', path);
            }
        }

        if (!this.domContainer || !this.domPath) {
            return false;
        }

        this.domAnimationPath = this.svg('path', {
            'd': this.domPath.getAttribute('d'),
            'stroke-dasharray': this.args.length,
            'stroke-dashoffset': 0,
            'stroke-width': this.args.strokeWidth || 1,
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
        this.domAnimationPath.setAttribute('stroke-dashoffset', Math.floor(-this.time * this.args.speed / 1000.0));

        if (!this.args.infinite && this.time > this.args.duration * 1000.0) {
            return false;
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
    name: 'Crawl Effect',

    description: 'Animates outline of the item with a dashed stroke',

    args: {
        length        : {name: 'Length',            type: 'number', value: 10},
        color         : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        speed         : {name: 'Speed',             type: 'number', value: 60},
        duration      : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {infinite: false}},
        infinite      : {name: 'Infinite animation',type: 'boolean', value: false, description: 'Plays animation indefinitely'},
        strokeWidth   : {name: 'Stroke Width',      type: 'number', value: 3},
        inBackground  : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            playInAnimationRegistry(schemeContainer.editorId, new CrawlEffectAnimation(item, args, resultCallback), item.id, this.name);
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
};