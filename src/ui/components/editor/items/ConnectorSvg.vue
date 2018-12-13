<template lang="html">
    <g>
        <path :d="svgPath" class="item-connector" :class="{selected: connector.meta.selected}" stroke="#555" stroke-width="3" fill="none"/>
        <path :d="svgPath" class="item-connector-hover-area" stroke-width="10" fill="none" @pointerenter="$emit('connector-enter')" @pointerleave="$emit('connector-leave')"/>

        <g v-if="connector.style && connector.style.source && connector.style.source.type">
            <circle v-if="connector.style.source.type === 'circle'" :cx="_x(connector.meta.points[0].x)" :cy="_y(connector.meta.points[0].y)" :r="_z(connector.style.source.size)" fill="black"/>
        </g>
    </g>
</template>

<script>
export default {
    props: ['connector', 'offsetX', 'offsetY', 'zoom'],

    methods: {
        _x(x) { return x * this.zoom + this.offsetX; },
        _y(y) { return y * this.zoom + this.offsetY; },
        _z(v) { return v * this.zoom; },

    },
    computed: {
        svgPath() {
            var path = `M ${this._x(this.connector.meta.points[0].x)} ${this._y(this.connector.meta.points[0].y)}`

            for (var i = 1; i < this.connector.meta.points.length; i++) {
                path += ` L ${this._x(this.connector.meta.points[i].x)} ${this._y(this.connector.meta.points[i].y)}`
            }
            return path;
        }
    }
}
</script>

<style lang="css">
</style>
