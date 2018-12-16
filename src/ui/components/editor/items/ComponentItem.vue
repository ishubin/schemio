<template lang="html">
    <g v-if="item.type === 'component'" class="item-graphics">
        <rect
            :x="_x(item.area.x)"
            :y="_y(item.area.y)"
            :width="_z(item.area.w)"
            :height="_z(item.area.h)"
            :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
        />
        <rect v-if="properties.length > 0"
            :x="_x(item.area.x)"
            :y="_y(item.area.y) + _z(30)"
            :width="_z(item.area.w)"
            :height="_z(item.area.h) - _z(30)"
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
                :y="_y(item.area.y + 28)"
                :font-size="Math.floor(fontsize) + 'px'"
                :fill="item.style.properties && item.style.properties.text && item.style.properties.text.color ? item.style.properties.text.color : '#666'"
                >
                <tspan v-for="property in properties" :x="_x(item.area.x) + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">{{property}}</tspan>
            </text>
    </g>
</template>

<script>
import _ from 'lodash';

export default {
    props: ['item', 'offsetX', 'offsetY', 'zoom'],
    methods: {
        _x(x) { return x * this.zoom + this.offsetX; },
        _y(y) { return y * this.zoom + this.offsetY; },
        _z(v) { return v * this.zoom; },
    },
    computed: {
        properties() {
            var properties = this.item.properties || '';
            return _.chain(properties.split('\n')).map(p => {
                var v = p.trim();
                if (v.length > 0) {
                    return v;
                } else {
                    return ' ';
                }
            }).value();
        },
        fontsize() {
            return this._z(12);
        }
    }
}
</script>

<style lang="css">
</style>
