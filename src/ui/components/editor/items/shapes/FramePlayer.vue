<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <g v-for="(button,buttonIndex) in buttons" 
            @click="onClickedButton(buttonIndex)"
            @mouseover="onMouseOverButton(buttonIndex)"
            @mouseout="onMouseOutButton(buttonIndex)"
            >
            <circle 
                :cx="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize) + buttonSize / 2"
                :cy="buttonSize/2 + topOffset"
                :r="buttonSize/2"
                :fill="button.fillColor"
                :stroke="item.shapeProps.strokeColor"
                style="-webkit-transition: fill 200ms linear; -ms-transition: fill 200ms linear; transition: fill 200ms linear;"
                stroke-width="1"/>

            <foreignObject 
                :x="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize)"
                :y="topOffset"
                :width="buttonSize"
                :height="buttonSize">
                <div style="width: 100%; height: 100%; text-align: center; vertical-align: middle;" xmlns="http://www.w3.org/1999/xhtml">
                    <i :class="[isPlaying?button.iconPlaying:button.icon]" :style="{'font-size':buttonFontSize, 'color': item.shapeProps.strokeColor}"></i>
                </div>
            </foreignObject>

            <circle 
                :cx="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize) + buttonSize / 2"
                :cy="buttonSize/2 + topOffset"
                :r="buttonSize/2"
                fill="rgba(255, 255, 255, 0)"
                stroke="rgba(255, 255, 255, 0)"
                stroke-width="1"
                style="cursor: pointer"/>
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
import forEach from 'lodash/forEach';
import EventBus from '../../EventBus';

export default {
    props: ['item'],

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
            return [{
                name: 'title', area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.area.h - 60)}
            }];
        },

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;

            return `M 0 0   L ${w} 0  L ${w} ${h}  L 0 ${h} z`;
        },

        editorProps: {
            ignoreEventLayer: true
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
        EventBus.emitFramePlayerPrepared(this.item, this.createFrameCallbacks());
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

        let buttons = [{
            icon: 'fas fa-play',
            iconPlaying: 'fas fa-pause',
            click: () => {this.onClickedTogglePlay()}
        }];
        
        if (this.item.shapeProps.sections.length > 0) {
            buttons = [{
                icon: 'fas fa-fast-backward',
                iconPlaying: 'fas fa-fast-backward',
                click: () => {this.onClickedToBegin()}
            }, {
                icon: 'fas fa-step-backward',
                iconPlaying: 'fas fa-step-backward',
                click: () => {this.onClickedLeft()}
            }].concat(buttons).concat([{
                icon: 'fas fa-step-forward',
                iconPlaying: 'fas fa-step-forward',
                click: () => {this.onClickPlayToNext()}
            }, {
                icon: 'fas fa-fast-forward',
                iconPlaying: 'fas fa-fast-forward',
                click: () => {this.onClickFastRight()}
            }]);
        };

        buttons.forEach(button => {
            button.fillColor = this.item.shapeProps.fillColor;
        });

        return {
            currentFrame: 1,
            isPlaying: false,
            intervalId: null,

            buttonSize: 20,
            buttonSpaceSize: 4,
            buttonFontSize: '10px',
            sectionsMapping,
            sectionsByNumber,
            currentSection: firstSection,
            totalSections: this.item.shapeProps.sections.length,

            buttons
        };
    },

    methods: {
        onClickedButton(buttonIndex) {
            this.buttons[buttonIndex].click();
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

        onMouseOverButton(idx) {
            forEach(this.buttons, (button, i) => {
                if (i === idx) {
                    button.fillColor = this.item.shapeProps.hoverFillColor;
                } else {
                    button.fillColor = this.item.shapeProps.fillColor;
                }
            });
        },

        onMouseOutButton(idx) {
            this.buttons[idx].fillColor = this.item.shapeProps.fillColor;
        },
    },

    computed: {
        leftOffset() {
            return this.item.area.w / 2 - (this.buttonSize* (this.buttons.length / 2) + this.buttonSpaceSize * (this.buttons.length - 1) / 2);
        },
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