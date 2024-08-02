/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import myMath from '../../myMath';

/**
 *
 * @param {string} path
 * @returns
 */
function breakPaths(path) {
    const paths = path.split('M');

    const result = [];
    paths.forEach(p => {
        p = p.trim();
        if (p) {
            result.push('M ' + p);
        }
    });
    return result;
}
class DrawEffectAnimation extends Animation {
    constructor(item, args, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.domContainer = null;
        this.time = 0.0;

        this.paths = [];
        this.totalPathsLength = 0;
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);
        if (!this.domContainer) {
            return false;
        }

        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return false;
        }

        const path = shape.computePath(this.item);
        if (!path) {
            return false;
        }

        this.paths = [];
        this.totalPathsLength = 0;

        let offset = 0;
        breakPaths(path).forEach(subPath => {
            const domPath = this.svg('path', {
                'd': subPath,
                'stroke-width': this.args.strokeSize || 1,
                'stroke': this.args.color,
                'fill': 'none',
                'stroke-linejoin': 'round',
            });
            const length = domPath.getTotalLength();
            this.paths.push({
                domPath,
                length,
                offset
            });
            this.totalPathsLength += length;
            this.domContainer.appendChild(domPath);
            domPath.setAttribute('stroke-dasharray', length);
            domPath.setAttribute('stroke-dashoffset', length);
            offset += length;
        });
        return true;
    }

    play(dt) {
        this.time += dt;

        let t = 1;
        if (!myMath.tooSmall(this.args.duration)) {
            t = this.time / (this.args.duration * 1000.0);
        }

        const firstWay = t < 1;
        let currentLength =  firstWay ? this.totalPathsLength * t : this.totalPathsLength * (t - 1);
        for (let i = 0; i < this.paths.length; i++) {
            const diffLength = this.paths[i].offset + this.paths[i].length - currentLength;
            if (diffLength > 0) {
                this.paths[i].domPath.setAttribute('stroke-dashoffset', Math.floor(firstWay ? diffLength : this.paths[i].length + diffLength));
                if (i > 0) {
                    this.paths[i-1].domPath.setAttribute('stroke-dashoffset', firstWay ? 0 : this.paths[i - 1].length);
                }
                break;
            }
        }
        if (this.args.twoWay) {
            if (t > 2) {
                return false;
            }
        } else {
            if (t > 1) {
                return false;
            }
        }
        return true;
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
        this.paths.forEach(path => {
            this.domContainer.removeChild(path.domPath);
        });
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
        inBackground  : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions'}
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
