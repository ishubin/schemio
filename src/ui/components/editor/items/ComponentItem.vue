<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g v-if="item.type === 'component'" class="item-graphics" :style="{opacity: opacityNumber}">
        <g v-if="item.style.shape === 'ellipse'">
            <ellipse :cx="item.area.x + Math.floor(item.area.w / 2)" :cy="item.area.y + Math.floor(item.area.h / 2)" :rx="Math.floor(item.area.w/2)" :ry="Math.floor(item.area.h/2)"
                :stroke="item.style.stroke.color"
                :stroke-width="item.style.stroke.size + 'px'"
                :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
            />
            <foreignObject :x="item.area.x" :y="item.area.y" :width="item.area.w" :height="item.area.h">
                <div style="display: table-cell; vertical-align: middle;" :style="{'width': item.area.w+'px', 'height': item.area.h+'px'}">
                    <div class="component-item-name-foreign-container" 
                        :style="{'color': item.style.text && item.style.text.color ? item.style.text.color : '#000'}"
                        style="width: 100%; text-align: center; display: inline-block"
                        >
                        {{item.name}}
                    </div>
                </div>
            </foreignObject>
        </g>
        <g v-else>
            <rect
                :x="item.area.x"
                :y="item.area.y"
                :width="item.area.w"
                :height="item.area.h"
                stroke-width="0"
                :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
            />
            <rect v-if="item.properties || item.image && item.image.url"
                :x="item.area.x"
                :y="item.area.y + 30"
                :width="item.area.w"
                :height="item.area.h - 30"
                stroke-width="0"
                :fill="item.style.properties && item.style.properties.background && item.style.properties.background.color ? item.style.properties.background.color : '#fef'"
            />
                <foreignObject :x="item.area.x" :y="item.area.y" :width="item.area.w" :height="30">
                    <div class="component-item-name-foreign-container" 
                        :style="{'color': item.style.text && item.style.text.color ? item.style.text.color : '#000'}">
                        {{item.name}}
                    </div>
                </foreignObject>

                <g v-if="item.image && item.image.url">
                    <image :xlink:href="item.image.url" :x="item.area.x" :y="item.area.y + 30" :width="item.area.w + 'px'" :height="item.area.h - 30 + 'px'"/>
                </g>
                <g v-else>
                    <foreignObject v-if="item.properties" :x="item.area.x" :y="item.area.y + 32" :width="item.area.w" :height="item.area.h - 32">
                        <div class="component-item-properties-foreign-container" 
                            :style="{'color': item.style.properties && item.style.properties.text && item.style.properties.text.color ? item.style.properties.text.color : '#666'}">
                            <pre>{{item.properties}}</pre>
                        </div>
                    </foreignObject>
                </g>
            <g v-if="item.style.stroke.size > 0">
                <rect
                    :x="item.area.x"
                    :y="item.area.y"
                    :width="item.area.w"
                    :height="item.area.h"
                    :stroke="item.style.stroke.color"
                    :stroke-width="item.style.stroke.size + 'px'"
                    :stroke-dasharray="strokeDashArray"
                    fill="none"
                />
                <path :d="propertiesSeparatorPath" v-if="item.properties || item.image && item.image.url" stroke-width="1px" :stroke="item.style.stroke.color"/>
            </g>
        </g>
    </g>
</template>

<script>
import _ from 'lodash';
import EventBus from '../EventBus.js';

export default {
    props: ['item', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        this.generateStrokeDashArray();
        EventBus.subscribeForRedrawItem(this.item.id, this.onRedrawItem);
    },
    beforeDestroy(){
        EventBus.unsubscribeForRedrawItem(this.item.id, this.onRedrawItem);
    },
    data() {
        return {
            fontsize: 12,
            strokeDashArray: ''
        }
    },
    methods: {
        onRedrawItem() {
            this.generateStrokeDashArray();
            this.$forceUpdate();
        },
        generateStrokeDashArray() {
            let dashArray = '';
            var w = this.item.style.stroke.size;
            if (this.item.style.stroke.pattern === 'dotted') {
                dashArray =  w + ' ' + (w * 2);
            } else if (this.item.style.stroke.pattern === 'dashed') {
                dashArray = (w * 4) + ' ' + (w * 4);
            }
            this.strokeDashArray = dashArray;
        }
    },
    computed: {
        opacityNumber() {
            return parseFloat(this.item.style.opacity);
        },
        propertiesSeparatorPath() {
            var x1 = this.item.area.x;
            var x2 = this.item.area.x + this.item.area.w;
            var y = this.item.area.y + 30;
            return `M ${x1} ${y} L ${x2} ${y}`;
        }
    }
}
</script>

<style lang="css">
</style>
