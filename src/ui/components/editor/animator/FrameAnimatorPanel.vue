<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
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
                    <div class="frame-animator-player-buttons">
                        <div v-if="!isRecording">
                            <span class="btn btn-danger btn-small"
                                @click="startRecording"
                                title="Record items for currently selected frame"
                                >
                                <i class="far fa-dot-circle"></i>
                            </span>
                            <span class="btn btn-secondary btn-small" title="Previous" @click="moveFrameLeft"><i class="fas fa-angle-left"></i></span>
                            <span v-if="isPlaying" class="btn btn-secondary btn-small" title="Stop" @click="stopAnimations"><i class="fas fa-stop"></i></span>
                            <span v-else class="btn btn-secondary btn-small" title="Play" @click="playAnimations"><i class="fas fa-play"></i></span>
                            <span class="btn btn-secondary btn-small" title="Next" @click="moveFrameRight"><i class="fas fa-angle-right"></i></span>
                        </div>
                        <div v-else>
                            <span class="btn btn-danger btn-small"
                                @click="stopRecording"
                                title="Record items for currently selected frame"
                                >
                                <i class="fas fa-stop"></i> Stop recording
                            </span>
                        </div>
                    </div>
                    <div class="frame-animator-frame-input" v-if="!isRecording && selectedFrameControl.trackIdx >= 0 && selectedFrameControl.frame >= 0">
                        <div v-if="!selectedFrameControl.blank && selectedFrameControl.propertyDescriptor">
                            <PropertyInput
                                    :key="`frame-prop-input-${selectedFrameControl.trackIdx}-${selectedFrameControl.frame}`"
                                    :editorId="editorId"
                                    :descriptor="selectedFrameControl.propertyDescriptor"
                                    :value="selectedFrameControl.value"
                                    :shapeProps="{}"
                                    :schemeContainer="schemeContainer"
                                    :itemId="null"
                                    @input="onFramePropertyInput" />

                        </div>
                    </div>

                </div>
                <div class="frame-animator-right-panel">
                    <span class="icon" @click="$emit('close')"><i class="fas fa-times"/></span>
                </div>
            </div>

            <div ref="frameAnimatorCanvas" class="frame-animator-canvas">
                <table class="frame-animator-matrix">
                    <thead>
                        <tr :class="{'drop-below': trackDrag.on && trackDrag.dropHead}">
                            <th> </th>
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
                        <tr v-for="(track, trackIdx) in framesMatrix"
                            class="track-droppable-area"
                            :data-track-index="trackIdx"
                            :class="{'selected-track': trackIdx === selectedTrackIdx, 'track-missing': !track.propertyDescriptor && track.kind !== 'function-header' && track.kind !== 'function', 'drop-below': trackDrag.on && !trackDrag.dropHead && trackIdx === trackDrag.dstTrackIdx}"
                            :style="{'background-color': track.color}"
                            >
                            <td class="frame-animator-property"
                                @mousedown="onTrackLabelMouseDown(trackIdx, $event)"
                                :class="['frame-animator-property-'+track.kind, track.kind === 'item' || track.kind === 'function-header'? 'draggable': null]" :colspan="track.kind === 'function-header' ? totalFrames + 1 : 1"
                                >
                                <div v-if="track.kind === 'item'">
                                    <span v-if="track.itemName" class="frame-item-name">{{track.itemName}}</span>
                                    <span v-else class="frame-item-name">Deleted item</span>
                                    <span class="frame-item-property">{{track.property}}</span>
                                </div>
                                <div v-else-if="track.kind === 'sections'">
                                    <i class="fas fa-paragraph"></i> Sections
                                </div>
                                <div class="function-animator-track-header" v-else-if="track.kind === 'function-header'">
                                    {{track.name}}
                                </div>
                                <div v-else-if="track.kind === 'function'">
                                    {{track.property}}
                                </div>
                                <div v-else-if="track.kind === 'scheme'">
                                    {{track.property}}
                                </div>

                                <div class="frame-property-operations">
                                    <span v-if="track.kind === 'function-header'" class="icon-button" title="Edit function" @click="toggleEditFunctionArgumentsForTrack(track)"><i class="fas fa-cog"></i></span>
                                    <span v-if="track.kind !== 'sections' && track.kind !== 'function'" class="icon-button" title="Remove animation track" @click="removeAnimationTrack(track)"><i class="fas fa-trash"></i></span>
                                </div>
                            </td>
                            <td v-for="(frame, frameIdx) in track.frames"
                                class="frame frame-droppable-area"
                                :data-track-idx="trackIdx"
                                :data-frame-idx="frameIdx"
                                :class="{active: !frame.blank, current: frame.frame === currentFrame, 'drop-candidate': frameDrag.source.trackIdx === trackIdx && frameDrag.destination.frameIdx === frameIdx}"
                                :title="`${track.property}, frame: ${frame.frame}, interpolation: ${frame.kind}, value: ${frame.value}`"
                                draggable="true"
                                @dblclick="onFrameDoubleClick(trackIdx, frameIdx)"
                                @dragstart="preventEvent"
                                @drag="preventEvent"
                                @mousedown="onMatrixFrameMouseDown(trackIdx, frameIdx, $event)"
                                @contextmenu="onFrameRightClick($event, trackIdx, frameIdx)"
                                >
                                <div class="active-frame" v-if="!frame.blank && !(frameDrag.on && trackIdx === frameDrag.source.trackIdx && frameIdx === frameDrag.source.frameIdx)">
                                    <i v-if="frame.icon === 'visibility-true'" class="fas fa-lightbulb"></i>
                                    <i v-else-if="frame.icon === 'visibility-false'" class="far fa-lightbulb"></i>
                                    <i v-else-if="frame.icon === 'opacity-none'" class="fa-regular fa-circle"></i>
                                    <i v-else-if="frame.icon === 'opacity-low'" class="fa-solid fa-circle-half-stroke"></i>
                                    <i v-else class="fas fa-circle"></i>
                                </div>
                                <div v-else class="empty-frame-number">{{frame.frame}}</div>
                            </td>
                        </tr>
                        <tr>
                            <td :colspan="totalFrames + 1">
                                <span class="btn btn-small" @click="toggleFunctionAddModal()">Add path function</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div ref="frameDragPreview" class="frame-drag-preview" :class="{'is-dragging': frameDrag.on}">
            <span class="active-frame" v-if="!frameDrag.source.blank"><i class="fas fa-circle"></i></span>
        </div>

        <div ref="trackDragPreview" class="track-drag-preview" :class="{'is-dragging': trackDrag.on}">
            {{trackDrag.text}}
        </div>

        <ContextMenu v-if="frameContextMenu.shown"
            :mouseX="frameContextMenu.mouseX"
            :mouseY="frameContextMenu.mouseY"
            :options="frameContextMenu.options"
            @selected="onContextMenuOptionClick"
            @close="frameContextMenu.shown = false"
            />

        <FunctionArgumentsEditor v-if="functionEditorModal.shown"
            :functionDescription="functionEditorModal.functionDescription"
            :args="functionEditorModal.args"
            :primaryButton="functionEditorModal.isAdding ? 'Add' : 'Save'"
            :schemeContainer="schemeContainer"
            closeName="Cancel"
            @close="functionEditorModal.shown = false"
            @argument-changed="onFunctionModalArgumentChanged"
            @submit="onFunctionModalSubmit()"/>
    </div>
</template>

<script>
import SchemeContainer from '../../../scheme/SchemeContainer';
import ContextMenu from '../ContextMenu.vue';
import utils from '../../../utils';
import {dragAndDropBuilder} from '../../../dragndrop';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import { jsonDiff } from '../../../json-differ';
import { compileAnimations, findItemPropertyDescriptor, findSchemePropertyDescriptor, interpolateValue } from '../../../animations/FrameAnimation';
import { Interpolations } from '../../../animations/ValueAnimation';
import PropertyInput from '../properties/PropertyInput.vue';
import EventBus from '../EventBus';
import StoreUtils from '../../../store/StoreUtils';
import AnimationFunctions from '../../../animations/functions/AnimationFunctions';
import FunctionArgumentsEditor from '../FunctionArgumentsEditor.vue';
import shortid from 'shortid';
import myMath from '../../../myMath';
import EditorEventBus from '../EditorEventBus';


const validItemFieldPaths = new Set(['area', 'effects', 'opacity', 'selfOpacity', 'textSlots', 'visible', 'shapeProps', 'blendMode']);



function calculateTrackColor(kind, id, property) {
    let hue = Math.abs(utils.hashString(kind + id)) % 360;
    const propertyHash = Math.abs(utils.hashString(property));
    const hueJitter = propertyHash % 20 - 10;
    hue = (hue + hueJitter) % 360;

    const saturationRange = [20, 70];
    const lightnessRange = [87, 97];

    const s = propertyHash % (saturationRange[1] - saturationRange[0]) + saturationRange[0];
    const l = propertyHash % (lightnessRange[1] - lightnessRange[0]) + lightnessRange[0];

    return `hsl(${hue}, ${s}%, ${l}%)`;
}


function jsonDiffItemWhitelistCallback(item) {
    return (path) => {
        if (!validItemFieldPaths.has(path[0])) {
            return false;
        }

        if ((item.shape === 'connector' || item.shape === 'path') && path.length > 1 && path[0] === 'shapeProps') {
            if (path[1] === 'points'
                || path[1] === 'sourceItem'
                || path[1] === 'destinationItem'
                || path[1] === 'sourceItemPosition'
                || path[1] === 'destinationItemPosition') {
                return false;
            }
        }

        if (item.shape === 'frame_player' && path.length > 1 && path[0] === 'shapeProps') {
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
                    value: change.value,
                    oldValue: change.oldValue
                });
            });
        }
    });


    if (schemeContainer.scheme.style.backgroundColor !== originSchemeContainer.scheme.style.backgroundColor) {
        changes.push({
            kind: 'scheme',
            id: null,
            property: 'style.backgroundColor',
            value: schemeContainer.scheme.style.backgroundColor
        });
    }
    return changes;
}

const MIN_FPS = 0.01;

let _isPlayingAnimation = false;

function stopAnimations() {
    _isPlayingAnimation = false;
}

function playAnimations(schemeContainer, animations, startFrame, fps, maxFrames, {onFrame, onFinish}) {
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
        schemeContainer.updateMultiItemEditBox();


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
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
        framePlayer    : {type: Object, required: true},
        light          : {type: Boolean, default: true},
    },

    components: { ContextMenu, PropertyInput, FunctionArgumentsEditor },

    beforeMount() {
        this.compileAnimations();
        EditorEventBus.schemeChangeCommitted.$on(this.editorId, this.onSchemeChange);
        EventBus.$on(EventBus.HISTORY_UNDONE, this.onHistoryUndone);
        EditorEventBus.item.changed.specific.$on(this.editorId, this.framePlayer.id, this.onFramePlayerChanged);
    },

    beforeDestroy() {
        EditorEventBus.schemeChangeCommitted.$off(this.editorId, this.onSchemeChange);
        EventBus.$off(EventBus.HISTORY_UNDONE, this.onHistoryUndone);
        EditorEventBus.item.changed.specific.$off(this.editorId, this.framePlayer.id, this.onFramePlayerChanged);
        StoreUtils.setAnimationEditorRecording(this.$store, false);
    },

    data() {
        return {
            originSchemeContainer: null,
            currentFrame: 1,
            totalFrames: this.framePlayer.shapeProps.totalFrames,
            framesMatrix: this.buildFramesMatrix(),
            compiledAnimations: [],
            isPlaying: false,
            isRecording: false,
            recordingPushbackTimer: null,
            recordingPushbackInterval: 100,

            selectedTrackIdx: -1,

            frameDrag: {
                on: false,
                source: {
                    blank: true,
                    trackIdx: -1,
                    frameIdx: -1
                },
                destination: {
                    frameIdx: -1
                }
            },

            trackDrag: {
                on: false,
                srcAnimationId: null,
                srcTrackIdx: -1,
                kind: null,
                text: 'Drag it',
                dstTrackIdx: -1,
                dstFuncId: null,
                dstFuncDropBefore: false,
                dropHead: false
            },

            frameContextMenu: {
                shown: false,
                mouseX: 0,
                mouseY: 0,
                options: []
            },

            selectedFrameControl: {
                value: null,
                trackIdx: -1,
                frame: -1,
                blank: true,
                propertyDescriptor: null
            },

            shouldRecompileAnimations: false,

            functionEditorModal: {
                shown: false,
                funcName: null,
                functionId: null,
                args: null,
                isAdding: true,
                functionDescription: null
            }
        };
    },

    methods: {
        openAnimationEditor() {
            this.$emit('animation-editor-opened', this.framePlayer);
        },

        selectFrame(frame) {
            this.currentFrame = frame;
            if (this.shouldRecompileAnimations) {
                this.compileAnimations();
            }
            forEach(this.compiledAnimations, compiledAnimation => {
                compiledAnimation.toggleFrame(frame);
            });

            this.schemeContainer.updateMultiItemEditBox();

            if (this.selectedFrameControl.trackIdx >= 0 ) {
                this.selectFrameControl(this.selectedFrameControl.trackIdx, frame - 1);
            }

            if (this.isRecording) {
                this.originSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme, this.editorId));
            }
        },

        selectTrackAndFrame(trackIdx, frameIdx) {
            this.selectedTrackIdx = trackIdx;
            const track = this.framesMatrix[trackIdx];
            this.selectFrameControl(trackIdx, frameIdx);
            this.selectFrame(track.frames[frameIdx].frame)
        },

        selectFrameControl(trackIdx, frameIdx) {
            const track = this.framesMatrix[trackIdx];
            if (!track.frames) {
                return;
            }
            const frame = track.frames[frameIdx];

            this.selectedFrameControl.propertyDescriptor = track.propertyDescriptor;

            if (frame.blank) {
                this.selectedFrameControl.blank = true;
            } else {
                this.selectedFrameControl.blank = false;
                this.selectedFrameControl.value = frame.value;
            }

            this.selectedFrameControl.trackIdx = trackIdx;
            this.selectedFrameControl.frame = frame.frame;
        },

        resetFrameControl() {
            this.selectedFrameControl.trackIdx = -1;
            this.selectedFrameControl.frame = -1;
            this.selectedFrameControl.propertyDescriptor = null;
        },

        onFrameDoubleClick(trackIdx, frameIdx) {
            const track = this.framesMatrix[trackIdx];
            if (track.kind === 'sections') {
                this.addSectionFrame(trackIdx, frameIdx);
                this.selectTrackAndFrame(trackIdx, frameIdx);
            } else if (track.kind === 'function') {
                this.addFunctionFrame(trackIdx, frameIdx);
                this.selectTrackAndFrame(trackIdx, frameIdx);
            } else {
                const frame = track.frames[frameIdx];
                if (frame.blank) {
                    this.recordCurrentValueForTrack(track, frame);
                    this.selectTrackAndFrame(trackIdx, frameIdx);
                }
            }
        },

        fillMatrixFrames(originFrames, valueType) {
            const matrixFrames = [];

            originFrames.sort((a, b) => a.frame - b.frame);

            const addBlankFrames = (num) => {
                const length = matrixFrames.length;
                for (let i = 0; i < num; i++) {
                    matrixFrames.push({
                        frame: i + length + 1,
                        blank: true
                    });
                }
            };

            const totalFrames = this.framePlayer.shapeProps.totalFrames;

            let prevFrame = null;
            forEach(originFrames, f => {
                if (f.frame - 1 > matrixFrames.length && f.frame <= totalFrames) {
                    // should fill with empty cells first and then add the frame
                    addBlankFrames(f.frame - 1 - matrixFrames.length);
                }
                if (!prevFrame || prevFrame.frame !== f.frame) {
                    // protect from duplicate frames
                    if (f.frame <= totalFrames) {
                        const activeFrame = utils.clone(f);
                        this.enrichFrameWithIcon(activeFrame, valueType);
                        matrixFrames.push(activeFrame);
                    }
                }
                prevFrame = f;
            });
            if (matrixFrames.length < totalFrames) {
                addBlankFrames(totalFrames - matrixFrames.length);
            }
            return matrixFrames;
        },

        enrichFrameWithIcon(frame, valueType) {
            if (valueType === 'visibility') {
                frame.icon = 'visibility-' + frame.value;
            } else if (valueType === 'opacity') {
                if (frame.value <= 25) {
                    frame.icon = 'opacity-none';
                } else if (frame.value < 75) {
                    frame.icon = 'opacity-low';
                } else {
                    frame.icon = 'opacity-high';
                }
            }
        },

        buildFramesMatrix() {
            const matrix = [];

            this.fixAllAnimationFrames();

            forEach(this.framePlayer.shapeProps.animations, animation => {
                if (animation.kind === 'function') {
                    // skipping animation tracks as they are going to be built in another function
                    return;
                }

                let itemName = null;
                let propertyDescriptor = null;
                let valueType = null;

                if (animation.kind === 'item') {
                    const item = this.schemeContainer.findItemById(animation.id);
                    if (item) {
                        itemName = item.name;
                        propertyDescriptor = findItemPropertyDescriptor(item, animation.property);

                        if (animation.property === 'visible') {
                            valueType = 'visibility';
                        } else if (animation.property === 'opacity' || animation.property === 'selfOpacity') {
                            valueType = 'opacity';
                        } else if (propertyDescriptor) {
                            valueType = propertyDescriptor.type;
                        }
                    }
                } else if (animation.kind === 'scheme') {
                    propertyDescriptor = findSchemePropertyDescriptor(animation.property);
                }

                const frames = this.fillMatrixFrames(animation.frames, valueType);

                const track = {
                    kind    : animation.kind,
                    id      : animation.id,
                    property: animation.property,
                    color   : calculateTrackColor(animation.kind, animation.id, animation.property),
                    propertyDescriptor,
                    valueType,
                    itemName,
                    frames,
                };
                matrix.push(track);
            });

            matrix.push(this.buildSectionsTrack());
            return matrix.concat(this.buildFunctionTracks());
        },

        // sorts frames, removes duplicate frames
        fixAllAnimationFrames() {
            const sortAndDeduplicate = (frames) => {
                frames.sort((a, b) => a.frame - b.frame);
                if (frames.length < 2) {
                    return;
                }
                for (let i = 1; i < frames.length; i++) {
                    if (frames[i].frame === frames[i - 1].frame) {
                        frames.splice(i, 1);
                        i = i - 1;
                    }
                }
            }

            forEach(this.framePlayer.shapeProps.animations, animation => {
                sortAndDeduplicate(animation.frames);
            });
            sortAndDeduplicate(this.framePlayer.shapeProps.sections);
        },

        buildSectionsTrack() {
            let sections = this.framePlayer.shapeProps.sections;
            if (!sections) {
                sections = [];
            }
            const frames = this.fillMatrixFrames(sections, 'section');

            return {
                kind: 'sections',
                propertyDescriptor: {type: 'string', name: 'Section Name'},
                frames
            };
        },

        buildFunctionTracks() {
            const tracks = [];
            forEach(this.framePlayer.shapeProps.functions, (func, id) => {
                const functionDescription = AnimationFunctions[func.functionId];
                if (!functionDescription) {
                    return;
                }

                tracks.push({
                    kind: 'function-header',
                    id  : id,
                    name: functionDescription.getFullName(func.args, this.schemeContainer),
                });

                // OPTIMIZE frame player function track search
                // not the most efficient code, every time we search the entire list all over again
                // but it's fine since there is not going to be that many functions and animation tracks in a single frame player
                forEach(this.framePlayer.shapeProps.animations, animation => {
                    if (animation.kind === 'function' && animation.id === id) {
                        const propertyDescriptor = functionDescription.inputs[animation.property];
                        if (!propertyDescriptor) {
                            return;
                        }
                        tracks.push({
                            kind    : 'function',
                            id      : id,
                            property: animation.property,
                            frames  : this.fillMatrixFrames(animation.frames, 'number'),
                            propertyDescriptor,
                        });
                    }
                });
            });
            return tracks;
        },

        startRecording() {
            this.isRecording = true;
            StoreUtils.setAnimationEditorRecording(this.$store, true);
            this.originSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), this.editorId);
        },

        stopRecording() {
            this.isRecording = false;
            StoreUtils.setAnimationEditorRecording(this.$store, false);
        },

        onSchemeChange() {
            if (!this.isRecording) {
                return;
            }

            if (this.recordingPushbackTimer) {
                clearTimeout(this.recordingPushbackTimer);
            }

            this.recordingPushbackTimer = setTimeout(() => {
                this.recordCurrentFrame();
                this.recordingPushbackTimer = null;
            }, this.recordingPushbackInterval);
        },

        recordCurrentFrame() {
            const changes = detectChanges(this.schemeContainer, this.originSchemeContainer);

            const isAnimationForSame = (a, b) => {
                return a.kind === b.kind && a.id === b.id && a.property === b.property;
            };
            forEach(changes, change => {

                // checking if the change was just too small
                // this is needed in situations when item was rotated
                // due to how item edit box is implemented it has to readjust items position
                // and often there is a small error in its calculation
                if (typeof change.value === 'number' && typeof change.oldValue === 'number') {
                    if (myMath.tooSmall(change.value - change.oldValue)) {
                        return;
                    }
                }

                let animation = find(this.framePlayer.shapeProps.animations, animation => isAnimationForSame(change, animation));
                if (!animation) {
                    animation = change;
                    const frames = [{
                        frame: this.currentFrame,
                        value: change.value,
                        kind : 'linear'
                    }];
                    if (this.currentFrame > 1) {
                        frames.splice(0, 0, {
                            frame: 1,
                            value: change.oldValue,
                            kind : 'linear'
                        });
                    }
                    this.framePlayer.shapeProps.animations.push({
                        kind    : change.kind,
                        id      : change.id,
                        property: change.property,
                        frames  : frames
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
                            foundFrame = f;            this.shouldRecompileAnimations = true;;
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
            this.shouldRecompileAnimations = true;
        },

        compileAnimations() {
            this.compiledAnimations = compileAnimations(this.framePlayer, this.schemeContainer);
            this.shouldRecompileAnimations = false;
        },

        removeAnimationTrack(track) {
            if (track.kind === 'function-header') {
                // should remove function and all its assosiated property tracks
                if (this.framePlayer.shapeProps.functions.hasOwnProperty(track.id)) {
                    delete this.framePlayer.shapeProps.functions[track.id];
                }

                const animations = this.framePlayer.shapeProps.animations;
                for (let i = 0; i < animations.length; i++) {
                    if (animations[i].kind === 'function' && animations[i].id === track.id) {
                        animations.splice(i, 1);
                        i = i - 1;
                    }
                }

                this.updateFramesMatrix();
            } else if (track.kind === 'item') {
                const idx = this.findAnimationIndexForTrack(track);
                if (idx < 0) {
                    return null;
                }
                this.framePlayer.shapeProps.animations.splice(idx, 1);
                this.updateFramesMatrix();
            }
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

        preventEvent(event) {
            event.preventDefault();
            event.stopPropagation();
        },

        onMatrixFrameMouseDown(trackIdx, frameIdx, event) {
            const sourceTrack = this.framesMatrix[trackIdx];
            const sourceFrame = sourceTrack.frames[frameIdx];

            dragAndDropBuilder(event)
            .withDraggedElement(this.$refs.frameDragPreview)
            .withDroppableClass('frame-droppable-area')
            .onSimpleClick(() => {
                this.selectTrackAndFrame(trackIdx, frameIdx);
            })
            .onDragStart(() => {
                this.frameDrag.on = true;
                this.frameDrag.source.blank = sourceFrame.blank;
                this.frameDrag.source.trackIdx = trackIdx;
                this.frameDrag.source.frameIdx = frameIdx;
            })
            .onDragOver((event, frameElement) => {
                const droppableTrackIdx = parseInt(frameElement.getAttribute('data-track-idx'));
                const droppableFrameIdx = parseInt(frameElement.getAttribute('data-frame-idx'));
                if (droppableTrackIdx === this.frameDrag.source.trackIdx) {
                    this.frameDrag.destination.frameIdx = droppableFrameIdx;
                } else {
                    this.frameDrag.destination.frameIdx = -1;
                }
            })
            .onDrop((event, frameElement) => {
                const droppableTrackIdx = parseInt(frameElement.getAttribute('data-track-idx'));
                const droppableFrameIdx = parseInt(frameElement.getAttribute('data-frame-idx'));
                if (droppableTrackIdx === this.frameDrag.source.trackIdx) {
                    this.onMatrixDragEnd(this.frameDrag.source.trackIdx, this.frameDrag.source.frameIdx, droppableFrameIdx);
                }
            })
            .onDone((event) => {
                this.frameDrag.on = false;
                this.frameDrag.source.trackIdx = -1;
                this.frameDrag.source.frameIdx = -1;
                this.frameDrag.destination.frameIdx = -1;
            })
            .build();
        },

        onMatrixDragEnd(srcTrackIdx, srcFrameIdx, dstFrameIdx) {
            if (dstFrameIdx === srcFrameIdx || dstFrameIdx < 0) {
                return;
            }
            const track = this.framesMatrix[srcTrackIdx];

            const sourceFrame = track.frames[srcFrameIdx];
            const destinationFrame = track.frames[dstFrameIdx];

            if (track.kind === 'sections') {
                const sections = this.framePlayer.shapeProps.sections;
                if (sourceFrame.blank) {
                    // deleting
                    let matchingIdx = -1;
                    for (let i = 0; i < sections.length && matchingIdx < 0; i++) {
                        if (sections[i].frame === destinationFrame.frame) {
                            matchingIdx = i;
                        }
                    }
                    if (matchingIdx >= 0) {
                        sections.splice(matchingIdx, 1);
                    }
                } else {
                    // replacing or inserting
                    const frame = {
                        frame: destinationFrame.frame,
                        value: sourceFrame.value
                    }
                    let matchingIdx = -1;
                    for (let i = 0; i < sections.length && matchingIdx < 0; i++) {
                        if (sections[i].frame === sourceFrame.frame) {
                            matchingIdx = i;
                        }
                    }
                    if (matchingIdx >= 0) {
                        sections[matchingIdx] = frame;
                    } else {
                        sections.push(frame);
                    }
                    sections.sort((a, b) => a.frame - b.frame);
                }
            } else {
                //TODO simplify all this code and implement in the same way as we handle it for sections
                const animationIdx = this.findAnimationIndexForTrack(track);
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
                        const srcOriginFrameIdx = findFrameIdx(animation, sourceFrame.frame);
                        if (srcOriginFrameIdx < 0) {
                            return;
                        }
                        const dstOriginFrameIdx = findFrameIdx(animation, destinationFrame.frame);
                        if (dstOriginFrameIdx < 0) {
                            return;
                        }
                        animation.frames[srcOriginFrameIdx].frame = dstFrameIdx + 1;
                        animation.frames.splice(dstOriginFrameIdx, 1);
                    }
                    animation.frames.sort((a, b) => a.frame - b.frame);
                }

            }

            this.updateFramesMatrix();
        },

        playAnimations() {
            this.resetFrameControl();
            if (this.shouldRecompileAnimations) {
                this.compileAnimations();
            }
            this.isPlaying = true;
            playAnimations(this.schemeContainer, this.compiledAnimations, this.currentFrame, this.framePlayer.shapeProps.fps, this.framePlayer.shapeProps.totalFrames, {
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

        onFrameRightClick(event, trackIdx, frameIdx) {
            event.preventDefault();
            const track = this.framesMatrix[trackIdx];
            const frame = track.frames[frameIdx];
            const options = [{
                name: 'Insert empty frames',
                iconClass: 'fa-solid fa-plus',
                clicked: () => {
                    this.insertEmptyFramesAtFrame(frameIdx + 1);
                }
            }];

            if (this.framePlayer.shapeProps.totalFrames > 1) {
                options.push({
                    name: 'Delete frame for all tracks',
                    iconClass: 'fas fa-trash',
                    clicked: () => {
                        this.deleteFrames(frameIdx + 1);
                    }
                });
            }

            if (track.kind !== 'function') {
                options.push({
                    name: 'Record current value',
                    iconClass: 'far fa-dot-circle',
                    clicked: () => {
                        this.recordCurrentValueForTrack(track, frame);
                    }
                });
            }
            if (!frame.blank) {
                options.push({
                    name: 'Clear frame',
                    iconClass: 'fa-solid fa-broom',
                    clicked: () => {
                        if (track.kind === 'sections') {
                            const sections = this.framePlayer.shapeProps.sections;
                            for (let i = 0; i < sections.length; i++) {
                                if (sections[i].frame === frame.frame) {
                                    sections.splice(i, 1);
                                    track.frames[frameIdx] = {
                                        frame: frame.frame,
                                        blank: true
                                    };
                                    break;
                                }
                            }
                        } else {
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
                        }
                        if (this.selectedTrackIdx === trackIdx && this.selectedFrameControl.frame === frame.frame) {
                            this.selectTrackAndFrame(trackIdx, frameIdx);
                        }
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
                            }
                        });
                    }
                });
            }

            if (options.length === 0) {
                return;
            }

            this.frameContextMenu.options = options;
            this.frameContextMenu.mouseX = event.pageX;
            this.frameContextMenu.mouseY = event.pageY;
            this.frameContextMenu.shown = true;
        },

        deleteFrames(frameNumber) {
            const deleteFrame = (frames) => {
                for (let i = frames.length - 1; i >= 0; i -= 1) {
                    if (frames[i].frame > frameNumber) {
                        frames[i].frame -= 1;
                    } else if (frames[i].frame === frameNumber) {
                        frames.splice(i, 1);
                    }
                }
            };

            deleteFrame(this.framePlayer.shapeProps.sections);
            this.framePlayer.shapeProps.animations.forEach(animation => {
                deleteFrame(animation.frames);
            });

            this.framePlayer.shapeProps.totalFrames -= 1;
            this.totalFrames = this.framePlayer.shapeProps.totalFrames;
            this.updateFramesMatrix();
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        insertEmptyFramesAtFrame(frameNumber) {
            // this code simulates insertion of empty frames.
            // since we don't really store empty frames in shapeProps
            // we just need to increase frames that are >= than given frame number
            const insertEmptyFrame = (frames) => {
                for (let i = 0; i < frames.length; i++) {
                    if (frames[i].frame >= frameNumber) {
                        frames[i].frame += 1;
                    }
                }
            };

            insertEmptyFrame(this.framePlayer.shapeProps.sections);
            this.framePlayer.shapeProps.animations.forEach(animation => {
                insertEmptyFrame(animation.frames);
            });

            this.framePlayer.shapeProps.totalFrames += 1;
            this.totalFrames = this.framePlayer.shapeProps.totalFrames;
            this.updateFramesMatrix();
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
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
            } else if (track.kind === 'scheme' ) {
                value = utils.getObjectProperty(this.schemeContainer.scheme, track.property);
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
        },

        onFramePropertyInput(value) {
            const trackIdx = this.selectedFrameControl.trackIdx;
            const frame = this.selectedFrameControl.frame;
            if (trackIdx < 0 || frame < 0) {
                return;
            }
            const track = this.framesMatrix[trackIdx];

            this.selectedFrameControl.value = value;
            if (track.kind === 'item' || track.kind === 'scheme' || track.kind === 'function') {
                const animationIdx = this.findAnimationIndexForTrack(track);
                if (animationIdx < 0) {
                    return;
                }
                const animation = this.framePlayer.shapeProps.animations[animationIdx];
                const frameIdx = findFrameIdx(animation, frame);
                if (frameIdx < 0) {
                    return;
                }

                this.framePlayer.shapeProps.animations[animationIdx].frames[frameIdx].value = value;
                this.framesMatrix[trackIdx].frames[frame - 1].value = value;

                if (animation.kind === 'item') {
                    const item = this.schemeContainer.findItemById(animation.id);
                    if (item) {
                        utils.setObjectProperty(item, animation.property, value);
                        EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, animation.property);

                        if (animation.property.startsWith('area.')) {
                            this.schemeContainer.updateMultiItemEditBox();
                        }
                    }
                } else if (animation.kind === 'scheme') {
                    utils.setObjectProperty(this.schemeContainer.scheme, animation.property, value);
                } else if (animation.kind === 'function') {
                    this.selectFrame(frame);
                }

                if (track.valueType) {
                    this.enrichFrameWithIcon(this.framesMatrix[trackIdx].frames[frame - 1], track.valueType);
                }

                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `animation.${this.framePlayer.id}.track.${trackIdx}.frames.${frameIdx}.${animation.property}`);
                this.shouldRecompileAnimations = true;
            } else if (track.kind === 'sections') {
                const sections = this.framePlayer.shapeProps.sections;
                for (let i = 0; i < sections.length; i++) {
                    if (sections[i].frame === frame) {
                        sections[i].value = value;
                        track.frames[frame - 1].value = value;
                        break;
                    }
                }
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `animation.${this.framePlayer.id}.sections.${frame}`);
            }
        },

        addSectionFrame(trackIdx, frameIdx) {
            const frameNum = frameIdx + 1;
            const frame = {
                frame: frameNum,
                value: `${frameNum}`,
                kind: 'step',
            };

            let idx = 0;
            const sections = this.framePlayer.shapeProps.sections;
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].frame === frameNum) {
                    // such frame already exists so avoiding duplicates
                    return;
                }
                if (sections[i].frame > frameNum) {
                    idx = i;
                    break;
                }
            }

            this.framesMatrix[trackIdx].frames[frameIdx] = frame;
            sections.splice(idx, 0, frame);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `animation.${this.framePlayer.id}.sections.${frame}`);
        },

        addFunctionFrame(trackIdx, frameIdx) {
            const track = this.framesMatrix[trackIdx];
            const funcDef = this.framePlayer.shapeProps.functions[track.id];
            if (!funcDef) {
                return;
            }
            const animationIdx = this.findAnimationIndexForTrack(track);
            if (animationIdx < 0) {
                return;
            }

            const animation = this.framePlayer.shapeProps.animations[animationIdx];

            let idx = 0;
            let prevFrame = null;
            let nextFrame = null;
            const frameNum = frameIdx + 1;

            for (let i = 0; i < animation.frames.length; i++) {
                if (animation.frames[i].frame === frameNum) {
                    // such frame already exists so avoiding duplicates
                    return;
                }
                else if (animation.frames[i].frame > frameNum) {
                    idx = i;
                    nextFrame = animation.frames[i];
                    break;
                } else {
                    prevFrame = animation.frames[i];
                }
            }

            const frame = {
                frame: frameNum,
                kind: 'linear',
                value: 0
            };

            const functionDescriptor = AnimationFunctions[funcDef.functionId];
            if (!functionDescriptor) {
                return;
            }

            const inputDescriptor = functionDescriptor.inputs[animation.property];
            if (!inputDescriptor) {
                return;
            }

            if (prevFrame && nextFrame) {
                const t = (frameNum - prevFrame.frame ) / Math.max(1, nextFrame.frame - prevFrame.frame);
                frame.value = interpolateValue(inputDescriptor.type, prevFrame.value, nextFrame.value, t);
            } else if (prevFrame) {
                frame.value = prevFrame.value;
            } else if (nextFrame) {
                frame.value = prevFrame.value;
            } else {
                frame.value = inputDescriptor.value;
            }
            animation.frames.splice(idx, 0, frame);
            this.updateFramesMatrix();
        },

        toggleFunctionAddModal() {
            this.functionEditorModal.funcName = 'moveAlongPath';
            this.functionEditorModal.functionId = null;
            const func = AnimationFunctions[this.functionEditorModal.funcName];
            this.functionEditorModal.functionDescription = func;

            const args = {};
            forEach(func, (argDef, argName) => {
                args[argName] = argDef.value;
            });
            this.functionEditorModal.args = args;
            this.functionEditorModal.isAdding = true;
            this.functionEditorModal.shown = true;
        },

        toggleEditFunctionArgumentsForTrack(track) {
            const func = this.framePlayer.shapeProps.functions[track.id];
            if (!func) {
                return null;
            }

            this.functionEditorModal.funcName = track.functionId;
            this.functionEditorModal.functionDescription = AnimationFunctions[func.functionId];
            this.functionEditorModal.functionId = track.id;
            this.functionEditorModal.args = func.args;
            this.functionEditorModal.isAdding = false;

            if (this.functionEditorModal.functionDescription) {
                this.functionEditorModal.shown = true;
            }
        },

        onFunctionModalArgumentChanged(name, value) {
            this.functionEditorModal.args[name] = value;
        },

        onFunctionModalSubmit() {
            this.functionEditorModal.shown = false;
            if (this.functionEditorModal.isAdding) {
                const id = shortid.generate();
                const func = AnimationFunctions[this.functionEditorModal.funcName];
                if (!func) {
                    return;
                }

                this.framePlayer.shapeProps.functions[id] = {
                    functionId: this.functionEditorModal.funcName,
                    args: utils.clone(this.functionEditorModal.args)
                };

                forEach (func.inputs, (input, inputName) => {
                    this.framePlayer.shapeProps.animations.push({
                        kind: 'function',
                        id: id,
                        property: inputName,
                        frames: [{
                            frame: 1,
                            kind: 'linear',
                            value: input.value
                        }, {
                            frame: this.framePlayer.shapeProps.totalFrames,
                            kind: 'linear',
                            value: input.endValue
                        }]
                    });
                });
            } else if (this.functionEditorModal.functionId) {
                forEach(this.functionEditorModal.args, (value, argName) => {
                    this.framePlayer.shapeProps.functions[this.functionEditorModal.functionId].args[argName] = value;
                });
            }

            this.updateFramesMatrix();
        },

        onHistoryUndone() {
            this.updateFramesMatrix();
        },

        onFramePlayerChanged() {
            if (this.totalFrames !== this.framePlayer.shapeProps.totalFrames) {
                this.totalFrames = this.framePlayer.shapeProps.totalFrames;
                this.updateFramesMatrix();
            }
        },

        onTrackLabelMouseDown(trackIdx, originalEvent) {
            const track = this.framesMatrix[trackIdx];
            if (track.kind === 'sections' || track.kind === 'function') {
                return;
            };

            const handleDragOverAndDrop = (event, trackElement) => {
                const dstTrackIdx = parseInt(trackElement.getAttribute('data-track-index'));
                const dstTrack = this.framesMatrix[dstTrackIdx];

                if (this.trackDrag.kind === 'item') {
                    if (dstTrack.kind !== this.trackDrag.kind) {
                        this.trackDrag.dstTrackIdx = -1;
                        return;
                    }

                    const rect = trackElement.getBoundingClientRect();
                    const dropAbove = event.pageY < rect.top + rect.height / 2;
                    this.trackDrag.dstTrackIdx = dstTrackIdx;
                    this.trackDrag.dropHead = false;

                    if (dropAbove) {
                        if (dstTrackIdx > 0) {
                            this.trackDrag.dstTrackIdx = dstTrackIdx - 1;
                        } else {
                            this.trackDrag.dropHead = true;
                        }
                    }
                } else if (this.trackDrag.kind === 'function-header') {
                    this.trackDrag.dropHead = false;
                    if (dstTrack.kind === 'function-header' && dstTrack.id !== track.id) {
                        this.trackDrag.dstTrackIdx = dstTrackIdx - 1;
                        this.trackDrag.dstFuncId = dstTrack.id;
                        this.trackDrag.dstFuncDropBefore = true;

                    } else if (dstTrack.kind === 'function' && dstTrack.id !== track.id) {
                        this.trackDrag.dstFuncId = dstTrack.id;
                        this.trackDrag.dstFuncDropBefore = false;
                        let found = false;
                        let i = dstTrackIdx + 1;
                        for (; i < this.framesMatrix.length && !found; i++) {
                            if (this.framesMatrix[i].kind === 'function-header') {
                                found = true;
                            }
                        }
                        if (found) {
                            this.trackDrag.dstTrackIdx = i - 2;
                        } else {
                            this.trackDrag.dstTrackIdx = this.framesMatrix.length - 1;
                        }
                    } else {
                        this.trackDrag.dstTrackIdx = -1;
                        this.trackDrag.dstFuncId = null;
                    }
                }
            };


            dragAndDropBuilder(originalEvent)
            .withScrollableElement(this.$refs.frameAnimatorCanvas)
            .withDraggedElement(this.$refs.trackDragPreview)
            .withDroppableClass('track-droppable-area')
            .onDragStart(() => {
                this.trackDrag.srcTrackIdx = trackIdx;
                this.trackDrag.kind = track.kind;
                this.trackDrag.dstFuncId = null;
                this.trackDrag.on = true;
                if (track.kind === 'item') {
                    this.trackDrag.text = track.itemName + ' ' + track.property;
                } else if (track.kind === 'function-header') {
                    this.trackDrag.text = track.name;
                }
            })
            .onDragOver(handleDragOverAndDrop)
            .onDrop((event, trackElement) => {
                handleDragOverAndDrop(event, trackElement);
                if (track.kind === 'item') {
                    if (this.trackDrag.dstTrackIdx < 0) {
                        return;
                    }
                    const dstTrack = this.framesMatrix[this.trackDrag.dstTrackIdx];

                    const originalAnimationIdx = this.findAnimationIndexForTrack(track);
                    let dstAnimationIdx = this.findAnimationIndexForTrack(dstTrack);
                    if (originalAnimationIdx >= 0 && dstAnimationIdx >= 0) {
                        const deletedAnimations = this.framePlayer.shapeProps.animations.splice(originalAnimationIdx, 1);
                        if (!this.trackDrag.dropHead) {
                            dstAnimationIdx += 1;
                        }
                        this.framePlayer.shapeProps.animations.splice(dstAnimationIdx, 0, deletedAnimations[0]);

                        this.updateFramesMatrix();
                        this.$forceUpdate();
                    }
                } else if (track.kind === 'function-header') {
                    if (!this.trackDrag.dstFuncId) {
                        return;
                    }

                    const funcIds = [];
                    let dropIdx = -1;
                    forEach(this.framePlayer.shapeProps.functions, (func, funcId) => {
                        if (track.id !== funcId) {
                            funcIds.push(funcId);
                        }
                        if (this.trackDrag.dstFuncId === funcId) {
                            if (this.trackDrag.dstFuncDropBefore) {
                                dropIdx = funcIds.length - 1;
                            } else {
                                dropIdx = funcIds.length;
                            }
                        }

                    });

                    if (dropIdx < 0) {
                        return;
                    }

                    funcIds.splice(dropIdx, 0, track.id);

                    const newFuncs = {};
                    funcIds.forEach(id => {
                        newFuncs[id] = this.framePlayer.shapeProps.functions[id];
                    });

                    this.framePlayer.shapeProps.functions = newFuncs;
                    this.updateFramesMatrix();
                    this.$forceUpdate();
                }
            })
            .onDone(() => {
                this.trackDrag.on = false;
            })
            .build();
        }
    },
}
</script>