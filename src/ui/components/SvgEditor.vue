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
export default {
    props: ['width', 'height', 'scheme', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        this._offsetX = parseInt(this.offsetX);
        this._offsetY = parseInt(this.offsetY);
        this._zoom = parseFloat(this.zoom);
    },
    data() {
        return {
            _offsetX: 0,
            _offsetY: 0,
            _zoom: 1.0
        };
    },
    methods: {
        mouseMove() {

        },

        mouseDown() {

        },

        mouseUp() {

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
