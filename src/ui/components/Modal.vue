<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div>
        <div v-if="useMask" class="modal-mask"></div>
        <div ref="modalContainer" class="modal-container text-nonselectable" :style="{width: actualWidth + 'px', top: `${y}px`, left: `${x}px`}">
            <div class="modal-header" v-if="showHeader" @mousedown="initModalDrag" :class="{dragging: dragging}">
                <h3>{{title}}</h3>
                <span class="modal-close" @click="$emit('close')"><i class="fas fa-times"/></span>
            </div>
            <div class="modal-body">
                <slot></slot>
            </div>
            <div class="modal-footer" v-if="showFooter">
                <div class="modal-controls">
                    <span class="btn btn-primary" v-if="primaryButton" v-on:click="$emit('primary-submit')">{{primaryButton}}</span>
                    <span class="btn btn-secondary" v-on:click="$emit('close')">Close</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>


/**
 * calculates the position on the axis so that it stays visible. Works for both axises: x and y
 */
function clampModalPosition(axisPos, length, screenLength, minOverlap) {
    if (axisPos + length < minOverlap) {
        return minOverlap - length;
    }
    if (screenLength - axisPos < minOverlap) {
        return screenLength - minOverlap;
    }
    return axisPos;
}

const MIN_OVERLAP = 50;

const recordedModalPositions = {};

export default {
    props: {
        title        : String,
        width        : { type: Number, default: 600 },

        // used only if stretchWidth is enabled
        maxWidth     : { type: Number, default: 0 },
        stretchWidth : { type: Boolean, default: false},
        primaryButton: { type: String, default: null },
        useMask      : { type: Boolean, default: true },
        showHeader   : { type: Boolean, default: true },
        showFooter   : { type: Boolean, default: true },
    },

    beforeMount() {
        if (this.stretchWidth) {
            this.actualWidth = window.innerWidth - 80;
            if (this.maxWidth > 0) {
                this.actualWidth = Math.min(this.actualWidth, this.maxWidth);
            }
        }
        document.addEventListener('keydown', this.onKeyPress);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.cancleModalDrag);
    },

    mounted() {
        const modalRect = this.$refs.modalContainer.getBoundingClientRect();

        let x = (window.innerWidth - modalRect.width) / 2;
        let y = (window.innerHeight - modalRect.height) / 2;

        const recordedPosition = recordedModalPositions[this.title];
        if (recordedPosition) {
            x = recordedPosition.x;
            y = recordedPosition.y;
        }

        
        this.x = clampModalPosition(x, modalRect.width, window.innerWidth, MIN_OVERLAP);
        this.y = clampModalPosition(y, 40, window.innerHeight, MIN_OVERLAP);
    },

    beforeDestroy() {
        document.removeEventListener('keydown', this.onKeyPress);
        document.removeEventListener('mouseup', this.cancleModalDrag);
    },

    data() {
        return {
            x: 100,
            y: 100,

            actualWidth: this.width,

            originalPoint: { x: 0, y: 0 },
            clickPoint: { x: 0, y: 0 },

            dragging: false
        };
    },

    methods: {
        onKeyPress(event) {
            if (event.key === 'Escape') {
                this.$emit('close');
            }    
        },

        initModalDrag(event) {
            this.originalPoint.x = this.x;
            this.originalPoint.y = this.y;
            this.clickPoint.x = event.clientX;
            this.clickPoint.y = event.clientY;
            this.dragging = true;
        },

        cancleModalDrag(event) {
            this.dragging = false;
        },

        onMouseMove(event) {
            if (this.dragging) {
                const modalRect = this.$refs.modalContainer.getBoundingClientRect();

                if (event.buttons === 0) {
                    // no buttons are pressed so it should cancel the dragging state
                    this.dragging = false;
                    return;
                }

                this.x = clampModalPosition(this.originalPoint.x + event.clientX - this.clickPoint.x, modalRect.width, window.innerWidth, MIN_OVERLAP);
                this.y = clampModalPosition(this.originalPoint.y + event.clientY - this.clickPoint.y, 40, window.innerHeight, MIN_OVERLAP);

                recordedModalPositions[this.title] = {x: this.x, y: this.y};
            }
        }
    }
}
</script>

<style lang="css">
</style>
