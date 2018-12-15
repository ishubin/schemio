<template lang="html">
    <g>
        <path :d="svgPath" class="item-connector" :class="{selected: connector.meta.selected}" :stroke="connector.style.color" stroke-width="3" fill="none"/>
        <path :d="svgPath" class="item-connector-hover-area" stroke-width="10" fill="none" @pointerenter="$emit('connector-enter')" @pointerleave="$emit('connector-leave')"/>

        <g v-for="end in ends">
            <circle v-if="end.type === 'circle'" :cx="_x(end.x)" :cy="_y(end.y)" :r="_z(end.r)" :fill="connector.style.color"/>
            <path v-if="end.type === 'path'" :d="end.path" class="item-connector" :class="{selected: connector.meta.selected}" :stroke="connector.style.color" stroke-width="3" :fill="end.fill"/>

        </g>
    </g>
</template>

<script>
import EventBus from '../EventBus.js';

export default {
    props: ['connector', 'offsetX', 'offsetY', 'zoom'],

    mounted() {
        EventBus.$on(EventBus.REDRAW_CONNECTOR, connector => {
            if (this.connector.id === connector.id) {
                this.recompute();
                this.$forceUpdate();
            }
        });
    },
    data() {
        return {
            svgPath: this.computeSvgPath(this.connector.meta.points),
            ends: this.computeEnds(this.connector)
        };
    },
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
                    r: endStyle.size
                };
            } else if (endStyle.type === 'arrow') {
                return this.createArrowEnd(x, y, px, py, endStyle, false);
            } else if (endStyle.type === 'triangle') {
                return this.createArrowEnd(x, y, px, py, endStyle, true);
            }
            return null;
        },

        createArrowEnd(x, y, px, py, endStyle, close) {
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
                if (close) {
                    path += ' z';
                }
                return {
                    type: 'path',
                    path: path,
                    fill: close ? '#fff' : 'none'
                }
            }
            return null;
        },
        computeSvgPath(points) {
            var path = `M ${this._x(points[0].x)} ${this._y(points[0].y)}`

            for (var i = 1; i < points.length; i++) {
                path += ` L ${this._x(points[i].x)} ${this._y(points[i].y)}`
            }
            return path;
        },
        computeEnds(connector) {
            var ends = [];
            if (connector.meta && connector.meta.points.length > 0 && connector.style) {
                var points = connector.meta.points;

                if (connector.style.source) {
                    var end = this.createEnd(points[0].x, points[0].y, points[1].x, points[1].y, connector.style.source);
                    if (end) {
                        ends.push(end);
                    }
                }
                if (connector.style.destination) {
                    var end = this.createEnd(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 2].x, points[points.length - 2].y, connector.style.destination);
                    if (end) {
                        ends.push(end);
                    }
                }
            }
            return ends;
        },
        recompute() {
            this.svgPath = this.computeSvgPath(this.connector.meta.points);
            this.ends = this.computeEnds(this.connector);
        }
    },
    watch: {
        connector: {
            deep: true,
            handler(connector) {
                this.svgPath = this.computeSvgPath(connector.meta.points);
                this.ends = this.computeEnds(connector);
            }
        },
        offsetX(value) {
            this.recompute()
        },
        offsetY(value) {
            this.recompute()
        },
        zoom(value) {
            this.recompute()
        }
    }
}
</script>

<style lang="css">
</style>
