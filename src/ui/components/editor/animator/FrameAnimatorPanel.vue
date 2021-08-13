<template>
    <div class="frame-animator-panel">
        <div v-if="light" class="frame-animator-light">
            <span class="btn btn-secondary btn-small" @click="openAnimationEditor"><i class="fas fa-film"></i> Open Animation Editor</span>
            <span class="frame-animator-title">{{framePlayer.name}}</span>
        </div>

        <div v-else class="frame-animator-container">
            <div class="frame-animator-header">
                <div class="frame-animator-title">
                    <i class="fas fa-film"></i>
                    <h3>{{framePlayer.name}}</h3>
                </div>
                <div class="frame-animator-controls">
                    <span class="btn btn-danger btn-small"
                        @click="recordCurrentFrame"
                        title="Record items for currently selected frame"
                        >
                        <i class="far fa-dot-circle"></i> 
                    </span>
                    <span class="btn btn-secondary btn-small" title="Previous" @click="moveFrameLeft"><i class="fas fa-angle-left"></i></span>
                    <span class="btn btn-secondary btn-small" title="Play" @click="playAnimations"><i class="fas fa-play"></i></span>
                    <span class="btn btn-secondary btn-small" title="Stop" @click="stopAnimations"><i class="fas fa-stop"></i></span>
                    <span class="btn btn-secondary btn-small" title="Next" @click="moveFrameRight"><i class="fas fa-angle-right"></i></span>
                </div>
                <div class="frame-animator-right-panel">
                    <span class="icon" @click="$emit('close')"><i class="fas fa-times"/></span>
                </div>
            </div>

            <div class="frame-animator-canvas">
                <table class="frame-animator-matrix">
                    <thead>
                        <tr>
                            <th>
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
                                :title="`${track.propertyShort}, frame: ${frame.frame}, interpolation: ${frame.kind}, value: ${frame.value}`"
                                draggable="true"
                                @dragstart="onMatrixDragStart(trackIdx, frameIdx)"
                                @dragenter="onMatrixDragEnter(trackIdx, frameIdx)"
                                @dragend="onMatrixDragEnd(trackIdx, frameIdx)"
                                @contextmenu="onFrameRightClick($event, track, frame)"
                                >
                                <span class="active-frame" v-if="!frame.blank"><i class="fas fa-circle"></i></span>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </div>

        <ContextMenu v-if="frameContextMenu.shown"
            :mouseX="frameContextMenu.mouseX"
            :mouseY="frameContextMenu.mouseY"
            :options="frameContextMenu.options"
            @selected="onContextMenuOptionClick"
            @close="frameContextMenu.shown = false"
            />
    </div>
</template>

<script>
import SchemeContainer from '../../../scheme/SchemeContainer';
import ContextMenu from '../ContextMenu.vue';
import utils from '../../../utils';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import { jsonDiff } from '../../../json-differ';
import { compileAnimations} from '../../../animations/FrameAnimation';
import { Interpolations } from '../../../animations/ValueAnimation';


const validItemFieldPaths = new Set(['area', 'effects', 'opacity', 'selfOpacity', 'textSlots', 'visible', 'shapeProps', 'blendMode']);


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

const MIN_FPS = 0.01;

let _isPlayingAnimation = false;

function stopAnimations() {
    _isPlayingAnimation = false;
}

function playAnimations(animations, startFrame, fps, maxFrames, {onFrame, onFinish}) {
    if (_isPlayingAnimation) {
        return;
    }

    _isPlayingAnimation = true;

    let totalTimePassed = 0;
    let currentFrame = startFrame;

    onFrame(currentFrame);

    const loopCycle = (timeMarker, dt) => {

        totalTimePassed += dt;
        let frame = startFrame + totalTimePassed * Math.max(fps, MIN_FPS) / 1000;
        let nextFrame = Math.floor(frame);

        if (nextFrame > currentFrame) {
            currentFrame = nextFrame;
            onFrame(currentFrame);
        }

        forEach(animations, animation => {
            animation.toggleFrame(frame);
        });

        if (nextFrame < maxFrames && _isPlayingAnimation) {
            window.requestAnimationFrame(() => {
                const nextTimeMarker = performance.now();
                loopCycle(nextTimeMarker, nextTimeMarker - timeMarker);
            });
        } else {
            _isPlayingAnimation = false;
            onFinish();
        }
    };

    loopCycle(performance.now(), 0);
}


function findFrameIdx(animation, frame) {
    for (let i = 0; i < animation.frames.length; i++) {
        if (animation.frames[i].frame === frame) {
            return i;
        }
    }
    return -1;
};



export default {
    props: {
        schemeContainer: {type: Object, required: true},
        framePlayer    : {type: Object, required: true},
        light          : {type: Boolean, default: true},
    },

    components: { ContextMenu },

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
            isPlaying: false,

            frameDrag: {
                source: {
                    trackIdx: -1,
                    frameIdx: -1
                },
                destination: {
                    frameIdx: -1
                }
            },

            frameContextMenu: {
                shown: false,
                mouseX: 0,
                mouseY: 0,
                options: []
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

                animation.frames.sort((a, b) => a.frame - b.frame);

                const addBlankFrames = (num) => {
                    const length = frames.length;
                    for (let i = 0; i < num; i++) {
                        frames.push({
                            frame: i + length + 1,
                            blank: true
                        });
                    }
                };

                let prevFrame = null;
                forEach(animation.frames, f => {
                    if (f.frame - 1 > frames.length) {
                        // should fill with empty cells first and then add the frame
                        addBlankFrames(f.frame - 1 - frames.length);
                    }
                    if (!prevFrame || prevFrame.frame !== f.frame) {
                        // protect from duplicate frames
                        frames.push(f);
                    }
                    prevFrame = f;
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

            if (sourceFrame.blank && !destinationFrame.blank) {
                // deleting frame
                const frameIdx = findFrameIdx(animation, destinationFrame.frame);
                if (frameIdx < 0) {
                    return;
                }
                animation.frames.splice(frameIdx, 1);
            } else if (!sourceFrame.blank) {
                if (destinationFrame.blank) {
                    // changing the frame number
                    const frameIdx = findFrameIdx(animation, sourceFrame.frame);
                    if (frameIdx < 0) {
                        return;
                    }
                    animation.frames[frameIdx].frame = dstFrameIdx + 1;
                } else {
                    // deleting destination frame and changing the frame number on the source
                    const srcFrameIdx = findFrameIdx(animation, sourceFrame.frame);
                    if (srcFrameIdx < 0) {
                        return;
                    }
                    const dstFrameIdx = findFrameIdx(animation, destinationFrame.frame);
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

        playAnimations() {
            this.isPlaying = true;
            playAnimations(this.compiledAnimations, this.currentFrame, this.framePlayer.shapeProps.fps, this.framePlayer.shapeProps.totalFrames, {
                onFrame: (frame) => {
                    this.currentFrame = frame;
                },
                onFinish: () => {
                    this.isPlaying = false;
                }
            });
        },

        stopAnimations() {
            stopAnimations();
        },

        moveFrameLeft() {
            if (!this.isPlaying) {
                if (this.currentFrame > 1) {
                    this.selectFrame(this.currentFrame - 1);
                }
            }
        },

        moveFrameRight() {
            if (!this.isPlaying) {
                if (this.currentFrame < this.framePlayer.shapeProps.totalFrames) {
                    this.selectFrame(this.currentFrame + 1);
                }
            }
        },

        onFrameRightClick(event, track, frame) {
            event.preventDefault();
            const options = [{
                name: 'Record current value',
                iconClass: 'far fa-dot-circle',
                clicked: () => {
                    this.recordCurrentValueForTrack(track, frame);
                }
            }];
            if (!frame.blank) {
                options.push({
                    name: 'Delete Frame',
                    iconClass: 'fas fa-trash',
                    clicked: () => {
                        const animationIdx = this.findAnimationIndexForTrack(track);
                        if (animationIdx < 0) {
                            return;
                        }
                        const frameIdx = findFrameIdx(this.framePlayer.shapeProps.animations[animationIdx], frame.frame);
                        if (frameIdx < 0) {
                            return;
                        }

                        this.framePlayer.shapeProps.animations[animationIdx].frames.splice(frameIdx, 1);
                        this.updateFramesMatrix();
                        this.compileAnimations();
                    }
                });
            
                forEach(Interpolations.values(), interpolation => {
                    if (frame.kind !== interpolation) {
                        options.push({
                            name: 'Convert to ' + interpolation,
                            interpolation,
                            clicked: (option) => {
                                const animationIdx = this.findAnimationIndexForTrack(track);
                                if (animationIdx < 0) {
                                    return;
                                }
                                const frameIdx = findFrameIdx(this.framePlayer.shapeProps.animations[animationIdx], frame.frame);
                                if (frameIdx < 0) {
                                    return;
                                }

                                this.framePlayer.shapeProps.animations[animationIdx].frames[frameIdx].kind = option.interpolation
                                this.updateFramesMatrix();
                                this.compileAnimations();
                            }
                        });
                    }
                });
            }

            this.frameContextMenu.options = options;
            this.frameContextMenu.mouseX = event.pageX;
            this.frameContextMenu.mouseY = event.pageY;
            this.frameContextMenu.shown = true;
        },

        onContextMenuOptionClick(option) {
            if (option.clicked) {
                option.clicked(option);
            }
        },

        recordCurrentValueForTrack(track, frame) {
            const animationIdx = this.findAnimationIndexForTrack(track);
            if (animationIdx < 0) {
                return;
            }
            const animation = this.framePlayer.shapeProps.animations[animationIdx];

            let value = 0;
            if (track.kind === 'item') {
                const item = this.schemeContainer.findItemById(track.id);
                if (!item) {
                    return;
                }
                value = utils.getObjectProperty(item, track.property);
            } else {
                // anything else is not supported yet
                return;
            }

            const frameIdx = findFrameIdx(animation, frame.frame);
            if (frameIdx >= 0) {
                animation.frames[frameIdx].value = value;
            } else {
                // searching for frame that is bigger than current
                let idx = 0;
                let interpolation = 'linear';

                for (let i = 0; i < animation.frames.length; i++) {
                    interpolation = animation.frames[i].kind;
                    if (animation.frames[i].frame > frame.frame) {
                        idx = i;
                        break;
                    }
                }

                animation.frames.splice(idx, 0, {
                    frame: frame.frame,
                    kind : interpolation,
                    value: value
                });
            }

            this.updateFramesMatrix();
            this.compileAnimations();
        }
    },

    computed: {
        totalFrames() {
            return this.framePlayer.shapeProps.totalFrames;
        },
    }
}
</script>