<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="item-tooltip" :class="{'item-short-details-tooltip': isShortDetails}"
        :id="domId"
        :style="tooltipStyle"
        :data-type="dataType"
        :data-item-id="item.id"
        @mouseover="$emit('mouseover', $event)"
        @mouseleave="$emit('mouseleave', $event)"
        >
        <div class="tooltip-header" v-if="!isShortDetails">
            <span class="item-tooltip-close" @click="$emit('close')" :style="{'color': tooltipColor}">&times;</span>
            <h3 :style="{'color': tooltipColor}">{{item.name}}</h3>
        </div>
        <ul v-if="hasLinks" class="item-tooltip-links">
            <li v-for="link in item.links">
                <a :href="link.url">
                    <i class="icon" :class="link.iconClass"></i>
                    {{ link.title }}
                </a>
            </li>
        </ul>
        <div class="item-tooltip-body" v-html="sanitizedItemDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';
import LinkTypes from './LinkTypes';

export default {
    props: {
        item          : {type: Object, required: true},
        x             : {type: Number, required: true},
        y             : {type: Number, required: true},
        isShortDetails: {type: Boolean, default: false}
    },

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
        const minWidth      = this.isShortDetails ? 300 : Math.min(300, window.innerWidth*0.7);
        const maxWidth      = this.isShortDetails ? 200 : Math.min(700, window.innerWidth*0.7);
        const maxHeight     = Math.min(500, window.innerHeight*0.7);

        const links = (this.item.links || []).map(link => {
            const enrichedLink = {
                ...link,
            };
            if (link.type === 'file') {
                const dotIdx = link.title.lastIndexOf('.');
                const extension = link.title.substring(Math.max(0, dotIdx+1));
                link.iconClass = LinkTypes.findFileIcon(extension).cssClass;
            } else {
                link.iconClass = LinkTypes.findTypeByNameOrDefault(link.type).cssClass;
            }
            return enrichedLink;
        });

        const data = {
            domId            : `item-tooltip-${this.item.id}`,
            positionLeft     : this.x,
            positionTop      : this.y,
            minWidth         : minWidth,
            maxWidth         : maxWidth,
            maxHeight        : maxHeight,
            hasLinks         : links.length > 0,

            tooltipBackground: this.item.tooltipBackground || '#eeeeee',
            tooltipColor     : this.item.tooltipColor || '#111111',
        };

        return data;
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
        },
        dataType() {
            if (this.isShortDetails) {
                return 'item-details-tooltip';
            }
            return 'item-tooltip';
        }
    }
}
</script>