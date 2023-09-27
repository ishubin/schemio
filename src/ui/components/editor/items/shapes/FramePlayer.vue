<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <g v-for="button in buttons">
            <path
                :d="button.path"
                :fill="hoveredButtonId === button.id ? item.shapeProps.hoverFillColor : item.shapeProps.fillColor"
                :stroke="item.shapeProps.strokeColor"
                style="-webkit-transition: fill 200ms linear; -ms-transition: fill 200ms linear; transition: fill 200ms linear;"
                stroke-width="1"/>
            <foreignObject
                :x="button.x"
                :y="button.y"
                :width="button.size"
                :height="button.size">
                <div style="display: flex; align-items: center; height: 100%; text-align: center; vertical-align: middle;" xmlns="http://www.w3.org/1999/xhtml">
                    <i :class="[isPlaying?button.iconPlaying:button.icon]" :style="{display: 'inline-block', width: '100%', 'text-align': 'center', 'font-size':buttonFontSize, 'color': item.shapeProps.strokeColor}"></i>
                </div>
            </foreignObject>
        </g>

        <foreignObject v-if="currentSection" x="0" :y="buttonSize + 6 + topOffset"
            :width="item.area.w" height="60" xmlns="http://www.w3.org/1999/xhtml">
            <div :style="framesTextStyle">
                <div>{{currentSection.number}} / {{totalSections}}</div>
                <div v-if="shoulShowCurrentSectionName">{{currentSection.name}}</div>
            </div>
        </foreignObject>
    </g>
</template>

<script>
import {forEach} from '../../../../collections';
import EditorEventBus from '../../EditorEventBus';

const buttonSize = 20;
const buttonSpaceSize = 4;

function computeButtons(item) {
    const buttonsCount = item.shapeProps.sections.length > 0 ? 5 : 1;
    const leftOffset = item.area.w / 2 - (buttonSize * (buttonsCount/ 2) + buttonSpaceSize * (buttonsCount - 1) / 2);
    const buttonBottomPadding = item.shapeProps.sections.length > 0 ? 60 : 30;
    const topOffset = Math.max(0, item.area.h - buttonBottomPadding);

    const r = buttonSize / 2;

    const generateButton = (i, id, icon, iconPlaying) => {
        return {
            id, icon, iconPlaying,
            path: `M ${leftOffset + i * (buttonSize + buttonSpaceSize)} ${topOffset + r} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 z`,
            x: leftOffset + i * (buttonSize + buttonSpaceSize),
            y: topOffset,
            size: buttonSize
        };
    };

    if (item.shapeProps.sections.length > 0) {
        return [
            generateButton(0, 'fast-backward',  'fas fa-fast-backward', 'fas fa-fast-backward'),
            generateButton(1, 'step-backward',  'fas fa-step-backward', 'fas fa-step-backward'),
            generateButton(2, 'play-stop',      'fas fa-play', 'fas fa-pause'),
            generateButton(3, 'step-forward',   'fas fa-step-forward', 'fas fa-step-forward'),
            generateButton(4, 'fast-forward',   'fas fa-fast-forward', 'fas fa-fast-forward'),
        ];
    } else {
        return [generateButton(0, 'play-stop', 'fas fa-play', 'fas fa-pause')];
    }
}

export default {
    props: ['item', 'editorId'],

    shapeConfig: {
        shapeType: 'vue',

        id: 'frame_player',

        menuItems: [{
            group: 'General',
            name: 'Frame Player',
            iconUrl: '/assets/images/items/frame-player.svg',
            size: {w: 140, h: 100},
            item: {
                textSlots: {
                    title: {
                        text: '<b>Frame Player</b>',
                        color: '#000000',
                        fontSize: 14
                    }
                }
            }
        }],

        getPins(item) {
            return [];
        },

        getTextSlots(item) {
            const buttonBottomPadding = item.shapeProps.sections.length > 0 ? 60 : 30;
            return [{
                name: 'title', area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.area.h - buttonBottomPadding)}
            }];
        },

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;

            return `M 0 0   L ${w} 0  L ${w} ${h}  L 0 ${h} z`;
        },

        onMouseMove(editorId, item, areaId) {
            EditorEventBus.item.custom.$emit('mouse-move', editorId, item.id, areaId);
        },
        onMouseOut(editorId, item) {
            EditorEventBus.item.custom.$emit('mouse-out', editorId, item.id);
        },
        onMouseDown(editorId, item, areaId) {
            EditorEventBus.item.custom.$emit('mouse-down', editorId, item.id, areaId);
        },

        computeCustomAreas(item) {
            const buttons = computeButtons(item);
            return buttons.map(button => {
                return {
                    id: button.id,
                    cursor: 'pointer',
                    path: button.path
                }
            });
        },

        args: {
            totalFrames    : {type: 'number', value: 5, name: 'Total frames'},
            fps            : {type: 'number', value: 1, name: 'Frames per second'},
            fillColor      : {type: 'color', value: 'rgba(220, 220, 220, 1.0)', name: 'Fill color'},
            hoverFillColor : {type: 'color', value: 'rgba(190, 190, 190, 1.0)', name: 'Hover fill color'},
            strokeColor    : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
            animations     : {type: 'animations', value: [], name: 'Animations', hidden: true},
            functions      : {type: 'animation-functions', value: {}, name: 'Animation Functions', hidden: true},
            sections       : {type: 'animation-sections', value: [], name: 'Sections', hidden: true},
        },
    },

    beforeMount() {
        EditorEventBus.framePlayer.prepared.$emit(this.editorId, this.item, this.createFrameCallbacks());
        EditorEventBus.item.custom.$on('mouse-move', this.editorId, this.item.id, this.onMouseMove);
        EditorEventBus.item.custom.$on('mouse-down', this.editorId, this.item.id, this.onMouseDown);
        EditorEventBus.item.custom.$on('mouse-out', this.editorId, this.item.id, this.onMouseOut);
    },

    beforeDestroy() {
        EditorEventBus.item.custom.$off('mouse-move', this.editorId, this.item.id, this.onMouseMove);
        EditorEventBus.item.custom.$off('mouse-down', this.editorId, this.item.id, this.onMouseDown);
        EditorEventBus.item.custom.$off('mouse-out', this.editorId, this.item.id, this.onMouseOut);
    },

    data() {
        const sectionsMapping = [];
        const map = new Map();
        const sectionsByNumber = new Map();

        this.item.shapeProps.sections.sort((a, b) => a.frame - b.frame);

        forEach(this.item.shapeProps.sections, (section, idx) => {
            const sectionInfo = {
                number: idx + 1,
                name: section.value,
                frame: section.frame
            };
            map.set(section.frame, sectionInfo);
            sectionsByNumber.set(sectionInfo.number, sectionInfo);
        });

        let firstSection = null;
        let currentSection = null;
        for (let i = 0; i < this.item.shapeProps.totalFrames; i++) {
            const frame = i + 1;
            if (map.has(frame)) {
                currentSection = map.get(frame);
                if (!firstSection) {
                    firstSection = currentSection;
                }
            }
            sectionsMapping[i] = currentSection;
        }

        return {
            currentFrame: 1,
            isPlaying: false,
            intervalId: null,

            buttonFontSize: '10px',
            sectionsMapping,
            sectionsByNumber,
            currentSection: firstSection,
            totalSections: this.item.shapeProps.sections.length,

            hoveredButtonId: null,
            buttons: computeButtons(this.item),
            buttonSize
        };
    },

    methods: {
        onMouseMove(areaId) {
            this.hoveredButtonId = areaId;
        },

        onMouseOut() {
            this.hoveredButtonId = null;
        },

        onMouseDown(areaId) {
            if (areaId === 'fast-backward') {
                this.onClickedToBegin();
            } else if (areaId === 'step-backward') {
                this.onClickedLeft();
            } else if (areaId === 'play-stop') {
                this.onClickedTogglePlay();
            } else if (areaId === 'step-forward') {
                this.onClickPlayToNext();
            } else if (areaId === 'fast-forward') {
                this.onClickFastRight();
            }
        },

        onClickedToBegin() {
            const firstSection = this.sectionsByNumber.get(1);
            if (firstSection) {
                this.currentFrame = 1;
                this.currentSection = firstSection;
                this.emitCurrentFrameEvent();
            }
        },

        onClickFastRight() {
            if (this.currentSection) {
                const nextSection = this.sectionsByNumber.get(this.currentSection.number + 1);
                if (nextSection) {
                    const nextFrame = nextSection.frame;
                    if (nextFrame >= 0) {
                        this.currentFrame = nextFrame;
                        this.currentSection = nextSection;
                        this.emitCurrentFrameEvent();
                    }
                }
            }
        },

        onClickedLeft() {
            if (this.currentSection) {
                const prevSection = this.sectionsByNumber.get(this.currentSection.number - 1);
                if (prevSection) {
                    const prevFrame = prevSection.frame;
                    if (prevFrame >= 0) {
                        this.currentFrame = prevFrame;
                        this.currentSection = prevSection;
                        this.emitCurrentFrameEvent();
                    }
                }
            }
        },

        createFrameCallbacks() {
            return {
                onFrame: (frame) => {
                    this.currentFrame = frame;
                    if (frame <= this.sectionsMapping.length && frame > 0) {
                        this.currentSection = this.sectionsMapping[frame - 1];
                    }
                },
                onFinish: () => {
                    this.isPlaying = false;
                }
            };
        },

        onClickPlayToNext() {
            if (this.currentSection) {
                let stopFrame = -1;

                const nextSection = this.sectionsByNumber.get(this.currentSection.number + 1);
                if (nextSection) {
                    const nextFrame = nextSection.frame;
                    if (nextFrame <= this.item.shapeProps.totalFrames) {
                        stopFrame = nextFrame;
                    }
                }

                this.$emit('frame-animator', {
                    operation: 'play',
                    item: this.item,
                    frame: this.currentFrame,
                    stopFrame: stopFrame,
                    callbacks: this.createFrameCallbacks()
                });
            }
        },

        onClickedTogglePlay() {
            if (!this.isPlaying) {
                this.isPlaying = true;
                let startingFrame = this.currentFrame;

                if (this.currentFrame >= this.item.shapeProps.totalFrames) {
                    startingFrame = 1;
                }

                this.$emit('frame-animator', {
                    operation: 'play',
                    item: this.item,
                    frame: startingFrame,
                    callbacks: this.createFrameCallbacks()
                });
            } else {
                this.$emit('frame-animator', {
                    operation: 'stop',
                    item: this.item,
                });
            }
        },

        emitCurrentFrameEvent() {
            this.$emit('frame-animator', {
                operation: 'setFrame',
                item: this.item,
                frame: this.currentFrame
            });
        },
    },

    computed: {
        framesTextStyle() {
            return {
                'color': this.item.textSlots.title.color,
                'font-size': `${this.item.textSlots.title.fontSize}px`,
                'text-align': 'center'
            }
        },
        topOffset() {
            return Math.max(0, this.item.area.h - 60);
        },
        shoulShowCurrentSectionName() {
            if (this.currentSection) {
                return '' + this.currentSection.number !== this.currentSection.name;
            }
            return false;
        }
    }
}
</script>