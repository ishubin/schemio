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
                            :class="{selected: item.selected, hovered: item.hovered, invisible: item.invisible}"
                        />
                            <text
                                v-if="!item.invisible"
                                :x="_x(item.area.x + 4)"
                                :y="_y(item.area.y + 14)"
                                fill="#ffffff"
                                font-weight="bold"
                                font-family="helvetica"
                                :font-size="Math.floor(_z(15)) + 'px'"
                                >{{item.name}}</text>
                    </g>
                </g>

                <g v-for="link in selectedItemLinks">
                    <circle :cx="_x(link.x)" :cy="_y(link.y)" r="10" stroke="red" stroke-width="3" fill="rgba(255, 0, 0, 0.2)" />
                    <text
                        :x="_x(link.x) - _z(5)"
                        :y="_y(link.y) + _z(5)"
                        fill="#ff0000"
                        font-weight="bold"
                        font-family="helvetica"
                        font-size="12px"
                        >{{link.title}}</text>

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
            vZoom: null,

            selectedItemLinks: [],

            animations: {
                linksAppear: {
                    timer: null,
                    frame: 0,
                    totalFrames: 30,
                    intervalMs: 5
                }
            }
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

        onSelectItem(item) {
            this.$emit('select-item', item);
            this.selectedItemLinks = this.generateItemLinks(item);
            this.startLinksAnimation();
        },

        onDeselectAllItems(item) {
            this.$emit('deselect-items');
        },

        startLinksAnimation() {
            this.animations.linksAppear.timer = null;
            this.animations.linksAppear.frame = 0;

            this.animations.linksAppear.timer = setInterval(() => {
                this.animations.linksAppear.frame += 1;

                if (this.animations.linksAppear.frame >= this.animations.linksAppear.totalFrames) {
                    clearInterval(this.animations.linksAppear.timer);
                }

                var t = this.animations.linksAppear.frame / this.animations.linksAppear.totalFrames;

                _.forEach(this.selectedItemLinks, link => {
                    link.x = link.startX * (1.0 - t) + link.destinationX * t;
                    link.y = link.startY * (1.0 - t) + link.destinationY * t;
                });
           }, this.animations.linksAppear.intervalMs);
        },

        generateItemLinks(item) {
            var links = [];
            if (item.links && item.links.length > 0) {
                var fullAngle = 2 * Math.PI;
                var stepAngle = (2 * Math.PI) / item.links.length;

                var cx = item.area.w / 2 + item.area.x;
                var cy = item.area.h / 2 + item.area.y;
                var radius = (item.area.w + item.area.h) / 2;

                var index = 0;
                _.forEach(item.links, link => {
                    var svgLink = {
                        url: link.url,
                        title: link.title.substr(0, 1).toUpperCase(),
                        x: cx,
                        y: cy,
                        startX: cx,
                        startY: cy,
                        destinationX: cx + radius * Math.cos(index * stepAngle),
                        destinationY: cy + radius * Math.sin(index * stepAngle)
                    };

                    links.push(svgLink);
                    index += 1;
                });
            }

            return links;
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
