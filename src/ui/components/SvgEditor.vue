<template lang="html">
    <div class="">
        svg editor

        <div>
            <svg id="svg_plot" ref="svgDomElement"
                v-bind:width="width+'px'"
                v-bind:height="height+'px'"
                v-on:mousemove="mouseMove"
                v-on:mousedown="mouseDown"
                v-on:mouseup="mouseUp">

                <g v-for="item in scheme.items">
                    <rect
                        v-bind:x="_x(item.area.x)"
                        v-bind:y="_y(item.area.y)"
                        v-bind:width="_z(item.area.w)"
                        v-bind:height="_z(item.area.h)"
                        style="opacity: 1.0; stroke-width: 3; stroke: #fff;"
                        v-bind:style="{fill: 'none'}"/>
                        <text
                            v-bind:x="_x(item.area.x + 4)"
                            v-bind:y="_y(item.area.y + 14)"
                            fill="#ffffff"
                            font-weight="bold"
                            font-family="helvetica"
                            v-bind:font-size="Math.floor(_z(15)) + 'px'"
                            >{{item.name}}</text>
                </g>

            </svg>
        </div>
    </div>
</template>

<script>
import StateDragging from './states/StateDragging.js';
const STATE_DRAGGING = new StateDragging();

export default {
    props: ['width', 'height', 'scheme', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        this._offsetX = parseInt(this.offsetX);
        this._offsetY = parseInt(this.offsetY);
        this._zoom = parseFloat(this.zoom);
        this.switchStateDragging();
    },
    data() {
        console.log('data');
        return {
            state: STATE_DRAGGING,
            _offsetX: 0,
            _offsetY: 0,
            _zoom: 1.0
        };
    },
    methods: {
        mouseCoordsFromEvent(event) {
            //TODO Optimize it to make more effective
            var rect    = this.$refs.svgDomElement.getBoundingClientRect(),
                targetOffsetX = rect.left + document.body.scrollLeft,
                targetOffsetY = rect.top + document.body.scrollTop,
                offsetX = event.clientX - targetOffsetX,
                offsetY  = event.clientY - targetOffsetY;

            return {
                x: Math.round(offsetX),
                y: Math.round(offsetY)
            }
        },
        mouseMove(event) {
            var coords = this.mouseCoordsFromEvent(event);
            this.state.mouseMove(coords.x, coords.y, event);
        },
        mouseDown(event) {
            var coords = this.mouseCoordsFromEvent(event);
            this.state.mouseDown(coords.x, coords.y, event);
        },
        mouseUp(event) {
            var coords = this.mouseCoordsFromEvent(event);
            this.state.mouseUp(coords.x, coords.y, event);
        },

        switchStateDragging() {
            this.state = STATE_DRAGGING;
            this.state.init(this);
        },

        _x(x) { return x * this._zoom + this._offsetX; },
        _y(y) { return y * this._zoom + this._offsetY; },
        _z(v) { return v * this._zoom; },
    }
}
</script>

<style lang="css">
#svg_plot {
    background: #111;
}
</style>
