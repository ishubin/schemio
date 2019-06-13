<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g class="item-graphics" :style="{opacity: opacityNumber}">
        <g v-if="itemStyle.shape === 'simple-comment'">
            <polygon :points="points" style="stroke-width:1" :fill="backgroundColor" :stroke="strokeColor"/>
            <line :x1="x + delta" :y1="y" :x2="x + delta" :y2="y + delta" style="stroke-width:1" :stroke="strokeColor"/>
            <line :x1="x" :y1="y + delta" :x2="x + delta" :y2="y + delta" style="stroke-width:1" :stroke="strokeColor"/>
        </g>


        <foreignObject :x="x + padding" :y="y + topMargin" :width="width - padding" :height="height - padding">
            <div class="comment-item-foreign-container" :style="{'width': width+'px', 'height': height+'px'}">
                {{text}}
            </div>
        </foreignObject>
    </g>

</template>

<script>
import _ from 'lodash';

export default {
    props: ['x', 'y', 'scale', 'width', 'height', 'itemStyle', 'text', 'fontsize'],
    data() {
        return {
            padding: 5
        };
    },
    methods: {
    },
    computed: {
        opacityNumber() {
            return parseFloat(this.itemStyle.opacity);
        },
        points() {
            var text = '';
            var d = 10 * this.scale;
            text+= `${this.x+d},${this.y} ${this.x+this.width},${this.y} ${this.x+this.width},${this.y+this.height} ${this.x},${this.y+this.height} ${this.x},${this.y+d}`;
            return text;
        },
        delta() {
            return 10 * this.scale;
        },
        backgroundColor() {
            return this.itemStyle.background && this.itemStyle.background.color ? this.itemStyle.background.color : '#fff';
        },
        strokeColor() {
            return this.itemStyle.stroke && this.itemStyle.stroke.color ? this.itemStyle.stroke.color : '#fff';
        },
        topMargin() {
            if (this.itemStyle.shape === 'simple-comment') {
                return 12;
            }
            return this.padding;
        }
    }
}
</script>

<style lang="css">
</style>
