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

            <div class="frame-animator-canvas">
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
                        <tr v-for="(track, trackIdx) in framesMatrix">
                            <td class="frame-animator-property">
                                <span v-if="track.itemName">{{track.itemName}}</span>
                                {{track.propertyShort}}

                                <div class="frame-property-operations">
                                    <span class="icon-button" title="Remove animation track" @click="removeAnimationTrack(track)"><i class="fas fa-trash"></i></span>
                                </div>
                            </td>
                            <td v-for="(frame, frameIdx) in track.frames"
                                class="frame"
                                :class="{active: !frame.blank, current: frame.frame === currentFrame, 'drop-candidate': frameDrag.source.trackIdx === trackIdx && frameDrag.destination.frameIdx === frameIdx}"
                                :title="`${track.propertyShort}, frame: ${frame.frame}, value: ${frame.value}`"
                                draggable="true"
                                @dragstart="onMatrixDragStart(trackIdx, frameIdx)"
                                @dragenter="onMatrixDragEnter(trackIdx, frameIdx)"
                                @dragend="onMatrixDragEnd(trackIdx, frameIdx)"
                                >
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
import { compileAnimations } from '../../../animations/FrameAnimation';


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

    beforeMount() {
        this.compileAnimations();
    },

    data() {
        const originSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme));
        return {
            originSchemeContainer,
            currentFrame: 1,
            framesMatrix: this.buildFramesMatrix(),
            compiledAnimations: [],

            frameDrag: {
                source: {
                    trackIdx: -1,
                    frameIdx: -1
                },
                destination: {
                    frameIdx: -1
                }
            }
        };
    },

    methods: {
        openAnimationEditor() {
            this.$emit('animation-editor-opened', this.framePlayer);
        },

        selectFrame(frame) {
            this.currentFrame = frame;
            forEach(this.compiledAnimations, compiledAnimation => {
                compiledAnimation.toggleFrame(frame);
            });
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
                    //TODO protect from duplicate frames
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

                const track = {
                    kind    : animation.kind,
                    id      : animation.id,
                    property: animation.property,
                    propertyShort,
                    itemName,
                    frames,
                }
                matrix.push(track);
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
            this.compileAnimations();
        },

        updateFramesMatrix() {
            this.framesMatrix = this.buildFramesMatrix();
        },

        compileAnimations() {
            this.compiledAnimations = compileAnimations(this.framePlayer, this.schemeContainer);
        },

        removeAnimationTrack(track) {
            const idx = this.findAnimationIndexForTrack(track);
            if (idx < 0) {
                return null;
            }
            this.framePlayer.shapeProps.animations.splice(idx, 1);
            this.updateFramesMatrix();
            this.compileAnimations();
        },

        findAnimationIndexForTrack(track) {
            for (let i = 0; i < this.framePlayer.shapeProps.animations.length; i++) {
                const animation = this.framePlayer.shapeProps.animations[i];
                if (animation.kind === track.kind && animation.id === track.id && animation.property === track.property) {
                    return i;
                }
            }
            return -1;
        },

        onMatrixDragStart(trackIdx, frameIdx) {
            this.frameDrag.source.trackIdx = trackIdx;
            this.frameDrag.source.frameIdx = frameIdx;
            this.frameDrag.destination.frameIdx = -1;
        },

        onMatrixDragEnd(trackIdx, frameIdx) {
            const srcTrackIdx = this.frameDrag.source.trackIdx;
            const srcFrameIdx = this.frameDrag.source.frameIdx;
            const dstFrameIdx = this.frameDrag.destination.frameIdx;

            this.frameDrag.destination.frameIdx = -1;
            this.frameDrag.source.trackIdx = -1;
            this.frameDrag.source.frameIdx = -1;

            if (dstFrameIdx === srcFrameIdx || dstFrameIdx < 0) {
                return;
            }

            const sourceFrame = this.framesMatrix[srcTrackIdx].frames[srcFrameIdx];
            const destinationFrame = this.framesMatrix[srcTrackIdx].frames[dstFrameIdx];

            const animationIdx = this.findAnimationIndexForTrack(this.framesMatrix[srcTrackIdx]);
            if (animationIdx < 0) {
                return;
            }

            const animation = this.framePlayer.shapeProps.animations[animationIdx];

            const findFrameIdx = (frame) => {
                for (let i = 0; i < animation.frames.length; i++) {
                    if (animation.frames[i].frame === frame) {
                        return i;
                    }
                }
                return -1;
            };

            if (sourceFrame.blank && !destinationFrame.blank) {
                // deleting frame
                const frameIdx = findFrameIdx(destinationFrame.frame);
                if (frameIdx < 0) {
                    return;
                }
                animation.frames.splice(frameIdx, 1);
            } else if (!sourceFrame.blank) {
                if (destinationFrame.blank) {
                    // changing the frame number
                    const frameIdx = findFrameIdx(sourceFrame.frame);
                    if (frameIdx < 0) {
                        return;
                    }
                    animation.frames[frameIdx].frame = dstFrameIdx + 1;
                } else {
                    // deleting destination frame and changing the frame number on the source
                    const srcFrameIdx = findFrameIdx(sourceFrame.frame);
                    if (srcFrameIdx < 0) {
                        return;
                    }
                    const dstFrameIdx = findFrameIdx(destinationFrame.frame);
                    if (dstFrameIdx < 0) {
                        return;
                    }
                    animation.frames[srcFrameIdx].frame = dstFrameIdx + 1;
                    animation.frames.splice(dstFrameIdx, 1);
                }
                animation.frames.sort((a, b) => a.frame - b.frame);
            }
            this.updateFramesMatrix();
            this.compileAnimations();
        },

        onMatrixDragEnter(trackIdx, frameIdx) {
            if (trackIdx === this.frameDrag.source.trackIdx) {
                this.frameDrag.destination.frameIdx = frameIdx;
            } else {
                this.frameDrag.destination.frameIdx = -1;
            }
        },

    },

    computed: {
        totalFrames() {
            return this.framePlayer.shapeProps.totalFrames;
        },
    }
}
</script>