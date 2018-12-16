<template lang="html">
    <g v-if="item.type === 'component'" class="item-graphics">
        <rect
            :x="_x(item.area.x)"
            :y="_y(item.area.y)"
            :width="_z(item.area.w)"
            :height="_z(item.area.h)"
            stroke-width="0"
            :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
        />
        <rect v-if="properties.length > 0"
            :x="_x(item.area.x)"
            :y="_y(item.area.y) + _z(30)"
            :width="_z(item.area.w)"
            :height="_z(item.area.h) - _z(30)"
            stroke-width="0"
            :fill="item.style.properties && item.style.properties.background && item.style.properties.background.color ? item.style.properties.background.color : '#fef'"
        />
            <text
                class="item-caption"
                :x="_x(item.area.x + 8)"
                :y="_y(item.area.y + 20)"
                :font-size="Math.floor(_z(15)) + 'px'"
                :fill="item.style.text && item.style.text.color ? item.style.text.color : '#000'"
                >{{item.name}}</text>

            <text v-if="properties.length > 0"
                class="item-property"
                :x="_x(item.area.x + 4)"
                :y="_y(item.area.y + 32)"
                :font-size="Math.floor(fontsize) + 'px'"
                :fill="item.style.properties && item.style.properties.text && item.style.properties.text.color ? item.style.properties.text.color : '#666'"
                >
                <tspan v-for="property in properties" :x="_x(item.area.x) + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">{{property}}</tspan>
            </text>
        <g v-if="item.style.stroke.size > 0">
            <rect
                :x="_x(item.area.x)"
                :y="_y(item.area.y)"
                :width="_z(item.area.w)"
                :height="_z(item.area.h)"
                :stroke="item.style.stroke.color"
                :stroke-width="item.style.stroke.size + 'px'"
                fill="none"
            />
            <path :d="propertiesSeparatorPath" v-if="properties.length > 0" stroke-width="1px" :stroke="item.style.stroke.color"/>
        </g>
    </g>
</template>

<script>
import _ from 'lodash';
import EventBus from '../EventBus.js';

export default {
    props: ['item', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        EventBus.$on(EventBus.REDRAW_ITEM, item => {
            if (item) {
                if (this.item.id !== item.id) {
                    return;
                }
            }
            this.$forceUpdate();
        });
    },
    methods: {
        _x(x) { return x * this.zoom + this.offsetX; },
        _y(y) { return y * this.zoom + this.offsetY; },
        _z(v) { return v * this.zoom; },
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
        fontsize() {
            return this._z(12);
        },
        propertiesSeparatorPath() {
            var x1 = this._x(this.item.area.x);
            var x2 = this._x(this.item.area.x + this.item.area.w);
            var y = this._y(this.item.area.y) + this._z(30);
            return `M ${x1} ${y} L ${x2} ${y}`;
        }
    }
}
</script>

<style lang="css">
</style>
