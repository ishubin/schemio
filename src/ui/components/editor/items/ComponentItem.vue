<template lang="html">
    <g v-if="item.type === 'component'" class="item-graphics">
        <g v-if="item.style.shape === 'ellipse'">
            <ellipse :cx="item.area.x + Math.floor(item.area.w / 2)" :cy="item.area.y + Math.floor(item.area.h / 2)" :rx="Math.floor(item.area.w/2)" :ry="Math.floor(item.area.h/2)"
                :stroke="item.style.stroke.color"
                :stroke-width="item.style.stroke.size + 'px'"
                :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
            />
            <text
                class="item-caption"
                :x="item.area.x + Math.floor(item.area.w/2 - 15 * item.name.length / (1.75 * 2))"
                :y="item.area.y + Math.floor(item.area.h / 2)"
                font-size="15px"
                :fill="item.style.text && item.style.text.color ? item.style.text.color : '#000'"
                >{{item.name}}</text>
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
            <rect v-if="properties.length > 0 || item.image && item.image.url"
                :x="item.area.x"
                :y="item.area.y + 30"
                :width="item.area.w"
                :height="item.area.h - 30"
                stroke-width="0"
                :fill="item.style.properties && item.style.properties.background && item.style.properties.background.color ? item.style.properties.background.color : '#fef'"
            />
                <text
                    class="item-caption"
                    :x="item.area.x + 8"
                    :y="item.area.y + 20"
                    font-size="15px"
                    :fill="item.style.text && item.style.text.color ? item.style.text.color : '#000'"
                    >{{item.name}}</text>

                <g v-if="item.image && item.image.url">
                    <image :xlink:href="item.image.url" :x="item.area.x" :y="item.area.y + 30" :width="item.area.w + 'px'" :height="item.area.h - 30 + 'px'"/>
                </g>
                <g v-else>
                    <text v-if="properties.length > 0"
                        class="item-property"
                        :x="item.area.x + 4"
                        :y="item.area.y + 32"
                        font-size="12px"
                        :fill="item.style.properties && item.style.properties.text && item.style.properties.text.color ? item.style.properties.text.color : '#666'"
                        >
                        <tspan v-for="property in properties" :x="item.area.x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">{{property}}</tspan>
                    </text>
                </g>
            <g v-if="item.style.stroke.size > 0">
                <rect
                    :x="item.area.x"
                    :y="item.area.y"
                    :width="item.area.w"
                    :height="item.area.h"
                    :stroke="item.style.stroke.color"
                    :stroke-width="item.style.stroke.size + 'px'"
                    fill="none"
                />
                <path :d="propertiesSeparatorPath" v-if="properties.length > 0 || item.image && item.image.url" stroke-width="1px" :stroke="item.style.stroke.color"/>
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
        EventBus.subscribeForRedrawItem(this.item.id, this.onRedrawItem);
    },
    beforeDestroy(){
        EventBus.unsubscribeForRedrawItem(this.item.id, this.onRedrawItem);
    },
    data() {
        return {
            fontsize: 12
        }
    },
    methods: {
        onRedrawItem() {
            this.$forceUpdate();
        }
    },
    computed: {
        properties() {
            if (this.item.properties.trim().length > 0) {
                var properties = this.item.properties || '';
                return _.chain(properties.split('\n')).map(p => {
                    var v = p.trim();
                    if (v.length > 0) {
                        return v;
                    } else {
                        return ' ';
                    }
                }).value();
            } else {
                return [];
            }
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
