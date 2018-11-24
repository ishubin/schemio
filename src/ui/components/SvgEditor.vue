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

                <g v-for="item in schemeContainer.getItems()">
                    <g v-if="item.type === 'image'">
                        <image v-bind:xlink:href="item.url" :x="_x(item.area.x)" :y="_y(item.area.y)" :width="_z(item.area.w) + 'px'" :height="_z(item.area.h) + 'px'"/>
                    </g>
                    <g v-if="item.type === 'component'">
                        <rect
                            :x="_x(item.area.x)"
                            :y="_y(item.area.y)"
                            :width="_z(item.area.w)"
                            :height="_z(item.area.h)"
                            class="component"
                            :class="{selected: item.selected, hovered: item.hovered}"
                        />
                            <text
                                v-bind:x="_x(item.area.x + 4)"
                                v-bind:y="_y(item.area.y + 14)"
                                fill="#ffffff"
                                font-weight="bold"
                                font-family="helvetica"
                                v-bind:font-size="Math.floor(_z(15)) + 'px'"
                                >{{item.name}}</text>
                    </g>
                </g>

            </svg>
        </div>
    </div>
</template>

<script>
import StateDragging from './states/StateDragging.js';
const STATE_DRAGGING = new StateDragging();

export default {
    props: ['width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateDragging();
    },
    data() {
        return {
            state: STATE_DRAGGING,
            vOffsetX: null,
            vOffsetY: null,
            vZoom: null
        };
    },
    methods: {
        mouseCoordsFromEvent(event) {
            var rect = this.$refs.svgDomElement.getBoundingClientRect(),
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

        _x(x) { return x * this.vZoom + this.vOffsetX; },
        _y(y) { return y * this.vZoom + this.vOffsetY; },
        _z(v) { return v * this.vZoom; },

        _itemFill(item) {
            if (item.selected) {
                return 'rgba(255, 255, 255, 0.9)'
            } else if (item.hovered) {
                return 'rgba(255, 255, 255, 0.2)'
            }
            return 'none;'
        },


        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.vOffsetX) / this.vZoom,
                y: (mouseY - this.vOffsetY) / this.vZoom
            };
        },
    }
}
</script>

<style lang="css">
#svg_plot {
    background: #111;
}
</style>
