<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div>
        <div v-if="useMask" class="modal-mask"></div>
        <div ref="modalContainer" class="modal-container" :style="{width: actualWidth + 'px', top: `${y}px`, left: `${x}px`}">
            <div class="modal-header" v-if="showHeader" @touchstart="initModalDrag" @mousedown="initModalDrag" :class="{dragging: dragging}">
                <h3>{{title}}</h3>
                <span class="modal-close" v-if="closable" @click="$emit('close')"><i class="fas fa-times"/></span>
            </div>
            <div class="modal-body" :style="modalBodyStyles">
                <slot></slot>
            </div>
            <div class="modal-footer" v-if="showFooter">
                <div class="modal-controls">
                    <span class="btn btn-primary" :class="{disabled: primaryButtonDisabled}" v-if="primaryButton" v-on:click="$emit('primary-submit')">{{primaryButton}}</span>
                    <span :class="`btn ${secondaryButtonStyle}`" v-if="secondaryButton" v-on:click="$emit('secondary-submit')">{{secondaryButton}}</span>
                    <span class="btn btn-secondary" v-else-if="closable" v-on:click="$emit('close')">{{closeName}}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { dragAndDropBuilder } from '../dragndrop';


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
        title        : { type: String, default: ''},
        width        : { type: Number, default: 600 },

        // used only if stretchWidth is enabled
        maxWidth             : { type: Number, default: 0 },
        maxHeight            : { type: Number, default: 0 },
        stretchWidth         : { type: Boolean, default: false},
        primaryButton        : { type: String, default: null },
        primaryButtonDisabled: { type: Boolean, default: false },
        secondaryButton      : { type: String, default: null },
        secondaryButtonStyle : { type: String, default: 'btn-secondary' },
        useMask              : { type: Boolean, default: true },
        showHeader           : { type: Boolean, default: true },
        showFooter           : { type: Boolean, default: true },
        closable             : { type: Boolean, default: true},
        closeName            : { type: String, default: 'Close'},
        // this property is used by the parent component
        // to notify that the modal position should be readjusted on screen
        // this happens because often the modal's content is dynamically loaded
        // and when it is mounted it's size maybe different from the one, when the
        // content is finally loaded
        repositionId         : { type: Number, default: 0}
    },

    beforeMount() {
        if (this.stretchWidth) {
            this.actualWidth = window.innerWidth - 80;
            if (this.maxWidth > 0) {
                this.actualWidth = Math.min(this.actualWidth, this.maxWidth);
            }
        }
        document.addEventListener('keydown', this.onKeyPress);
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
    },

    data() {
        return {
            x: 100,
            y: 100,

            actualWidth: Math.min(this.width, window.innerWidth - 20),
            dragging: false
        };
    },

    methods: {
        onKeyPress(event) {
            if (event.key === 'Escape') {
                this.$emit('close');
            }
        },

        initModalDrag(originalEvent) {
            let originalModalX = this.x;
            let originalModalY = this.y;
            const modalRect = this.$refs.modalContainer.getBoundingClientRect();

            dragAndDropBuilder(originalEvent)
            .onDragStart(() => {
                this.dragging = true;
            })
            .onDrag((event, x, y, originalX, originalY) => {
                const dx = x - originalX;
                const dy = y - originalY;

                this.x = clampModalPosition(originalModalX + dx, modalRect.width, window.innerWidth, MIN_OVERLAP);
                this.y = clampModalPosition(originalModalY + dy, 40, window.innerHeight, MIN_OVERLAP);

                recordedModalPositions[this.title] = {x: this.x, y: this.y};
            })
            .onDone(() => {
                this.dragging = false;
            })
            .build();
        },

        repositionModal() {
            const modalRect = this.$refs.modalContainer.getBoundingClientRect();
            if (modalRect.right > window.innerWidth) {
                const newX = modalRect.left - modalRect.right + window.innerWidth;
                this.x = clampModalPosition(newX, modalRect.width, window.innerWidth, MIN_OVERLAP);
            }
            if (modalRect.bottom > window.innerHeight) {
                const newY = modalRect.top - modalRect.bottom + window.innerHeight;
                this.y = clampModalPosition(newY, 40, window.innerHeight, MIN_OVERLAP);
            }
        }
    },
    computed: {
        modalBodyStyles() {
            const styles = {};
            if (this.maxHeight > 0) {
                styles['max-height'] = `${Math.min(this.maxHeight, window.innerHeight - 120)}px`;
            } else {
                styles['max-height'] = `${window.innerHeight - 120}px`;
            }
            return styles;
        }
    },

    watch: {
        repositionId() {
            this.$nextTick(() => {
                this.repositionModal();
            });
        }
    }
}
</script>

<style lang="css">
</style>
