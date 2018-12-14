<template lang="html">
    <g>
        <path :d="svgPath" class="item-connector" :class="{selected: connector.meta.selected}" stroke="#555" stroke-width="3" fill="none"/>
        <path :d="svgPath" class="item-connector-hover-area" stroke-width="10" fill="none" @pointerenter="$emit('connector-enter')" @pointerleave="$emit('connector-leave')"/>

        <g v-for="end in ends">
            <circle v-if="end.type === 'circle'" :cx="_x(end.x)" :cy="_y(end.y)" :r="_z(end.r)" fill="black"/>
            <path v-if="end.type === 'arrow'" :d="end.path" class="item-connector" :class="{selected: connector.meta.selected}" stroke="#555" stroke-width="3" fill="none"/>

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

        createEnd(x, y, px, py, endStyle) {
            if (endStyle.type === 'circle') {
                return {
                    type: 'circle',
                    x: x,
                    y: y,
                    r: this.connector.style.source.size
                };
            } else if (endStyle.type === 'arrow') {
                return this.createArrowEnd(x, y, px, py, endStyle);
            }
            return null;
        },

        createArrowEnd(x, y, px, py, endStyle) {
            var Vx = px - x, Vy = py - y;
            var V = Vx * Vx + Vy * Vy;
            if (V !== 0) {
                V = Math.sqrt(V);
                Vx = Vx/V;
                Vy = Vy/V;

                var size = this._z(endStyle.size);
                var Pax = this._x(x + (Vx * 2 - Vy) * size);
                var Pay = this._y(y + (Vy * 2 + Vx) * size);
                var Pbx = this._x(x + (Vx * 2 + Vy) * size);
                var Pby = this._y(y + (Vy * 2 - Vx) * size);
                var path = `M ${Pax} ${Pay} L ${this._x(x)} ${this._y(y)} L ${Pbx} ${Pby}`;
                return {
                    type: 'arrow',
                    path: path
                }
            }
            return null;
        }
    },
    computed: {
        svgPath() {
            var path = `M ${this._x(this.connector.meta.points[0].x)} ${this._y(this.connector.meta.points[0].y)}`

            for (var i = 1; i < this.connector.meta.points.length; i++) {
                path += ` L ${this._x(this.connector.meta.points[i].x)} ${this._y(this.connector.meta.points[i].y)}`
            }
            return path;
        },
        ends() {
            var ends = [];
            if (this.connector.meta && this.connector.meta.points.length > 0 && this.connector.style) {
                var points = this.connector.meta.points;

                if (this.connector.style.source) {
                    var end = this.createEnd(points[0].x, points[0].y, points[1].x, points[1].y, this.connector.style.source);
                    if (end) {
                        ends.push(end);
                    }
                }
                if (this.connector.style.destination) {
                    var end = this.createEnd(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 2].x, points[points.length - 2].y, this.connector.style.destination);
                    if (end) {
                        ends.push(end);
                    }
                }
            }

            return ends;
        }
    }
}
</script>

<style lang="css">
</style>
