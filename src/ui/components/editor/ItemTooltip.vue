<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="item-tooltip" :id="domId" :style="tooltipStyle" data-type="item-tooltip">
        <span class="item-tooltip-close" @click="$emit('close')" :style="{'color': tooltipColor}">&times;</span>
        <h3 :style="{'color': tooltipColor}">{{item.name}}</h3>
        <div v-html="sanitizedItemDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';

export default {
    props: ['item', 'x', 'y'],

    beforeMount() {
        this.timeMounted = new Date().getTime();
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
        const maxWidth      = Math.min(400, window.innerWidth - 60);
        const maxHeight     = Math.min(500, window.innerHeight - 60);

        return {
            domId:              `item-tooltip-${this.item.id}`,
            timeMounted:        0,
            positionLeft:       this.x,
            positionTop:        this.y,
            maxWidth:           maxWidth,
            maxHeight:          maxHeight,
            tooltipBackground:  this.item.tooltipBackground || '#eeeeee',
            tooltipColor:       this.item.tooltipColor || '#111111',
        };
    },

    methods: {
        onBodyClick(event) {
            //checking whether there is a race condition and 
            // this is the initial click event that led to opening of a tooltip
            if (new Date().getTime() - this.timeMounted > 200)  {
                // checking whether user clicked inside tooltip or not
                if (!this.isInsideTooltip(event.srcElement)) {
                    this.$emit('close');
                }
            }
        },

        isInsideTooltip(domElement) {
            if (domElement.closest('[data-type="item-tooltip"]')) {
                return true;
            }
            return false;
        }
    },

    computed: {
        tooltipStyle() {
            return {
                'left':         this.positionLeft + 'px',
                'top':          this.positionTop + 'px',
                'background':   this.tooltipBackground,
                'color':        this.tooltipColor,
                'padding':      '10px',
                'width':        `${this.maxWidth}px`,
                'max-height':   `${this.maxHeight}px`
            };
        },
        sanitizedItemDescription() {
            return htmlSanitize(this.item.description);
        }
    }
}
</script>