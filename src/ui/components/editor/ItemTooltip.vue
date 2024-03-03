<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="item-tooltip" :id="domId" :style="tooltipStyle" data-type="item-tooltip">
        <div class="tooltip-header">
            <span class="item-tooltip-close" @click="$emit('close')" :style="{'color': tooltipColor}">&times;</span>
            <h3 :style="{'color': tooltipColor}">{{item.name}}</h3>
        </div>
        <div class="item-tooltip-body" v-html="sanitizedItemDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';

export default {
    props: ['item', 'x', 'y'],

    beforeMount() {
        document.body.addEventListener('click', this.onBodyClick);
    },
    mounted() {
        const rect = document.getElementById(this.domId).getBoundingClientRect();
        const leftOverlap   = Math.min(0, window.innerWidth - this.x - rect.width);
        const topOverlap    = Math.min(0, window.innerHeight - this.y - rect.height);
        this.positionLeft = this.x + leftOverlap;
        this.positionTop = this.y + topOverlap;
    },
    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
    },
    data() {
        const minWidth      = Math.min(300, window.innerWidth*0.7);
        const maxWidth      = Math.min(700, window.innerWidth*0.7);
        const maxHeight     = Math.min(500, window.innerHeight*0.7);

        return {
            domId:              `item-tooltip-${this.item.id}`,
            positionLeft:       this.x,
            positionTop:        this.y,
            minWidth:           minWidth,
            maxWidth:           maxWidth,
            maxHeight:          maxHeight,
            tooltipBackground:  this.item.tooltipBackground || '#eeeeee',
            tooltipColor:       this.item.tooltipColor || '#111111',
        };
    },

    methods: {
        onBodyClick(event) {
            if (!(event.srcElement.closest('svg.svg-editor-plot') || event.srcElement.closest('.item-tooltip'))) {
                this.$emit('close');
            }
        },
    },

    computed: {
        tooltipStyle() {
            return {
                'left':         this.positionLeft + 'px',
                'top':          this.positionTop + 'px',
                'background':   this.tooltipBackground,
                'color':        this.tooltipColor,
                'padding':      '10px',
                'min-width':    `${this.minWidth}px`,
                'max-width':    `${this.maxWidth}px`,
                'max-height':   `${this.maxHeight}px`
            };
        },
        sanitizedItemDescription() {
            return htmlSanitize(this.item.description);
        }
    }
}
</script>