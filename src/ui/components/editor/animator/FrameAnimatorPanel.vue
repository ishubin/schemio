<template>
    <div class="frame-animator-panel">
        <div v-if="light" class="frame-animator-light">
            <span class="btn btn-secondary btn-small" @click="openAnimationEditor"><i class="fas fa-film"></i> Open Animation Editor</span>
            <span class="frame-animator-title">{{framePlayer.name}}</span>
        </div>

        <div v-else class="frame-animator-container">
            <div class="frame-animator-header">
                <i class="fas fa-film"></i>
                <span class="frame-animator-title">{{framePlayer.name}}</span>
                <span class="frame-animator-close" @click="$emit('close')"><i class="fas fa-times"/></span>
            </div>

            <div class="frame-animator-canvas" :style="{height: canvasHeight}">
                <table class="frame-animator-matrix">
                    <thead>
                        <tr>
                            <th>
                                <span class="btn btn-danger btn-small"
                                    @click="recordCurrentFrame"
                                    title="Record items for currently selected frame"
                                    >
                                    <i class="far fa-dot-circle"></i> 
                                </span>
                                <span class="btn btn-secondary btn-small" title="Play"><i class="fas fa-play"></i></span>
                            </th>
                            <th v-for="frame in totalFrames"
                                @click="selectFrame(frame)"
                                :title="frame"
                                :class="{current: frame === currentFrame}"
                                >
                                {{frame}}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in framesMatrix">
                            <td class="frame-animator-property">
                                <span v-if="row.itemName">{{row.itemName}}</span>
                                {{row.propertyShort}}
                            </td>
                            <td v-for="frame in row.frames" class="frame" :class="{active: !frame.blank, current: frame.frame === currentFrame}" :title="`${row.propertyShort} : frame ${frame.frame}`">
                                <span class="active-frame" v-if="!frame.blank"><i class="fas fa-circle"></i></span>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </div>
    </div>
</template>

<script>
import SchemeContainer from '../../../scheme/SchemeContainer';
import utils from '../../../utils';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import { jsonDiff } from '../../../json-differ';


const validItemFieldPaths = new Set(['area', 'effects', 'opacity', 'selfOpacity', 'textSlots', 'visible', 'shapeProps']);


function jsonDiffItemWhitelistCallback(item) {
    return (path) => {
        if (!validItemFieldPaths.has(path[0])) {
            return false;
        }

        if (item.shape === 'frame_player' && path.length > 1 && path[0] === 'shapeProps' && path[1] === 'animations') {
            return false;
        }
        return true;
    };
}


function detectChanges(schemeContainer, originSchemeContainer) {
    const changes = [];

    forEach(originSchemeContainer.getItems(), originItem => {
        const item = schemeContainer.findItemById(originItem.id);
        if (!item) {
            //ignoring it
            return;
        }

        const diff = jsonDiff(originItem, item, {
            fieldCheck: jsonDiffItemWhitelistCallback(item),
        });
        if (diff.changes && diff.changes.length > 0) {
            forEach(diff.changes, change => {
                if (change.path.length === 0) {
                    return ;
                }

                changes.push({
                    kind: 'item',
                    id: item.id,
                    property: change.path.join('.'),
                    value: change.value
                });
            });
        }
    });

    return changes;
}

export default {
    props: {
        schemeContainer: {type: Object, required: true},
        framePlayer    : {type: Object, required: true},
        light          : {type: Boolean, default: true},
    },

    data() {
        const originSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme));
        return {
            originSchemeContainer,
            currentFrame: 1,
            framesMatrix: this.buildFramesMatrix()
        };
    },

    methods: {
        openAnimationEditor() {
            this.$emit('animation-editor-opened', this.framePlayer);
        },

        selectFrame(frame) {
            this.currentFrame = frame;
        },

        buildFramesMatrix() {
            const matrix = [];

            forEach(this.framePlayer.shapeProps.animations, animation => {
                const frames = [];

                animation.frames.sort((a, b) => {
                    return a.frame - b.frame;
                });

                const addBlankFrames = (num) => {
                    const length = frames.length;
                    for (let i = 0; i < num; i++) {
                        frames.push({
                            frame: i + length + 1,
                            blank: true
                        });
                    }
                };

                forEach(animation.frames, f => {
                    if (f.frame - 1 > frames.length) {
                        // should fill with empty cells first and then add the frame
                        addBlankFrames(f.frame - 1 - frames.length);
                    }
                    frames.push(f);
                });
                if (frames.length < this.framePlayer.shapeProps.totalFrames) {
                    addBlankFrames(this.framePlayer.shapeProps.totalFrames - frames.length);
                }

                let itemName = null;
                let propertyShort = animation.property;
                if (animation.kind === 'item') {
                    const item = this.schemeContainer.findItemById(animation.id);
                    if (item) {
                        itemName = item.name;
                        if (animation.property === 'area.x') {
                            propertyShort = 'X';
                        } else if (animation.property === 'area.y') {
                            propertyShort = 'Y';
                        }
                    }
                }

                const row = {
                    kind    : animation.kind,
                    id      : animation.id,
                    property: animation.property,
                    propertyShort,
                    itemName,
                    frames,
                }
                matrix.push(row);
            });
            return matrix;
        },

        recordCurrentFrame() {
            const changes = detectChanges(this.schemeContainer, this.originSchemeContainer);

            const isAnimationForSame = (a, b) => {
                return a.kind === b.kind && a.id === b.id && a.property === b.property;
            };
            forEach(changes, change => {
                let animation = find(this.framePlayer.shapeProps.animations, animation => isAnimationForSame(change, animation));
                if (!animation) {
                    animation = change;
                    this.framePlayer.shapeProps.animations.push({
                        kind    : change.kind,
                        id      : change.id,
                        property: change.property,
                        frames  : [{
                            frame: this.currentFrame,
                            value: change.value,
                            kind : 'linear'
                        }]
                    });
                } else {
                    let idx = -1;
                    let found = false;
                    let foundFrame = null;
                    for (let i = 0; i < animation.frames.length && !found; i++) {
                        const f = animation.frames[i];
                        if (f.frame === this.currentFrame) {
                            idx = i;
                            found = true;
                            foundFrame = f;
                        } else if (f.frame < this.currentFrame) {
                            idx = i;
                            foundFrame = f;
                        } else {
                            found = true;
                        }
                    }

                    if (foundFrame && idx >=0) {
                        if (foundFrame.frame === this.currentFrame) {
                            foundFrame.value = change.value;
                        } else {
                            animation.frames.splice(idx, 0, {
                                frame: this.currentFrame,
                                value: change.value,
                                kind : 'linear'
                            });
                        }
                    } else {
                        animation.frames.splice(0, 0, {
                            frame: this.currentFrame,
                            value: change.value,
                            kind : 'linear'
                        });
                    }
                }
            });
            this.updateFramesMatrix();
        },

        updateFramesMatrix() {
            this.framesMatrix = this.buildFramesMatrix();
        },

    },

    computed: {
        totalFrames() {
            return this.framePlayer.shapeProps.totalFrames;
        },
        canvasHeight() {
            return Math.max(60, Math.min(11, this.framesMatrix.length + 1) * 30) + 'px';
        }
    }
}
</script>