/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import myMath from '../../myMath';
import EditorEventBus from '../../components/editor/EditorEventBus';
import { waitForItemAnimationContainer } from './FunctionCommons';

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
    constructor(item, domContainer, editorId, supportsStrokeShapeProps, color, strokeSize, args, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.domContainer = domContainer;
        this.editorId = editorId;
        this.time = 0.0;
        this.color = color;
        this.strokeSize = strokeSize;
        this.supportsStrokeShapeProps = supportsStrokeShapeProps;

        this.paths = [];
        this.totalPathsLength = 0;
        this.srcSelfOpacity = this.item.selfOpacity;
        this.targetSelfOpacity = this.item.selfOpacity;
        this.targetStrokeSize = 1;
        if (supportsStrokeShapeProps) {
            this.targetStrokeSize = this.item.shapeProps.strokeSize;
        }
    }

    init() {
        if (!this.domContainer) {
            return false;
        }

        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return false;
        }

        if (this.args.revealItem && this.item.selfOpacity < 1) {
            this.targetSelfOpacity = 100;
            if (this.supportsStrokeShapeProps) {
                this.item.shapeProps.strokeSize = 0;
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
            }
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
                'stroke-width': this.strokeSize || 1,
                'stroke': this.color,
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

        if (0.5 <= t <= 1) {
            const t1 = (t - 0.5) * 2;
            this.item.selfOpacity = this.srcSelfOpacity * (1 - t1) + this.targetSelfOpacity * t1;
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
        this.item.shapeProps.selfOpacity = this.targetSelfOpacity;
        if (this.supportsStrokeShapeProps) {
            this.item.shapeProps.strokeSize = this.targetStrokeSize;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
        }
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
        customStroke   : {name: 'Override stroke', type: 'boolean', value: false,
            description: 'Allows to override the stroke of the item and use custom color and stroke size'
        },
        color         : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)', depends: {customStroke: true}},
        strokeSize    : {name: 'Stroke size',       type: 'number',  value: 2, depends: {customStroke: true}},
        duration      : {name: 'Duration (sec)',    type: 'number', value: 2.0},
        twoWay        : {name: 'Two way',           type: 'boolean', value: false},
        revealItem    : {name: 'Reveal item',       type: 'boolean', value: true,
            description: 'If item was hidden it will slowly reveal it while drawing its outline. Only works if the item was hidden before calling this function'
        },
        inBackground  : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        // first making sure that the effect is going to be visible
        if (!item.visible) {
            item.visible = true;
        }
        if (item.opacity < 1) {
            item.selfOpacity = item.opacity;
            item.opacity = 100;
        }
        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id, 'visible');

        let color = args.color;
        let strokeSize = args.strokeSize;
        const shape = Shape.find(item.shape);
        const shapeArgs = Shape.getShapeArgs(shape);
        const supportsStrokeShapeProps = shapeArgs.strokeColor
                                        && shapeArgs.strokeSize
                                        && shapeArgs.strokeColor.type === 'color'
                                        && shapeArgs.strokeSize.type === 'number';

        if (!args.customStroke && supportsStrokeShapeProps) {
            color = item.shapeProps.strokeColor;
            strokeSize = item.shapeProps.strokeSize;
        }

        // have to wait for dom element to appear
        if (item) {
            waitForItemAnimationContainer(item.id, (container) => {
                const animation = new DrawEffectAnimation(
                    item, container, schemeContainer.editorId, supportsStrokeShapeProps, color, strokeSize, args, resultCallback
                );
                playInAnimationRegistry(schemeContainer.editorId, animation, item.id, this.name);
            });
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
};
