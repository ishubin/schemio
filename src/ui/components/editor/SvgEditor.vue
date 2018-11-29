<template lang="html">
    <div class="svg-editor">
        <svg id="svg_plot" ref="svgDomElement"
            :width="width+'px'"
            :height="height+'px'"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp">

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
                <g v-if="mode === 'edit'">
                    <!-- Drawing boundary edit box -->
                    <rect class="boundary-box"
                        :x="_x(item.area.x)"
                        :y="_y(item.area.y)"
                        :width="_z(item.area.w)"
                        :height="_z(item.area.h)"
                        :class="{selected: item.selected, hovered: item.hovered, invisible: item.invisible}"
                    />
                    <g v-if="item.selected">
                        <rect class="boundary-box-dragger"
                            v-for="dragger in provideBoundingBoxDraggers(item)"
                            :x="_x(dragger.x) - dragger.s"
                            :y="_y(dragger.y) - dragger.s"
                            :width="dragger.s * 2"
                            :height="dragger.s * 2"
                        />
                    </g>

                </g>
            </g>

            <g v-for="link in selectedItemLinks">
                <a class="item-link" :xlink:href="link.url" target="_blank">
                    <circle :cx="_x(link.x)" :cy="_y(link.y)" :r="_z(10)" stroke="red" stroke-width="3" fill="rgba(255, 0, 0, 0.2)" />
                    <text class="item-link-icon"
                        :x="_x(link.x) - _z(5)"
                        :y="_y(link.y) + _z(5)"
                        :font-size="Math.floor(_z(13)) + 'px'"
                        :title="link.title"
                        >{{link.shortTitle}}</text>

                    <text class="item-link-full-title"
                        :x="_x(link.x) + 25 - _z(5)"
                        :y="_y(link.y) + _z(5)"
                        >{{link.title}}</text>
                </a>
            </g>

        </svg>
    </div>
</template>

<script>
import StateDragging from './states/StateDragging.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateComponent from './states/StateCreateComponent.js';
import EventBus from './EventBus.js';


export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom'],
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateDragging();

        EventBus.$on(EventBus.START_CREATING_COMPONENT, component => {
            this.switchStateCreateComponent(component);
        });

        EventBus.$on('keyPressEscape', () => {
            this.state.cancel();
        });
        EventBus.$on(EventBus.REDRAW, () => {
            this.$forceUpdate();
        });
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, () => {
            this.cancelCurrentState();
        });
        EventBus.$on(EventBus.ITEM_SELECTED, item => {
            this.onSelectItem(item);
        });
    },
    data() {
        return {
            states: {
                dragging: new StateDragging(this),
                createComponent: new StateCreateComponent(this),
                dragItem: new StateDragItem(this)
            },
            state: null,
            vOffsetX: null,
            vOffsetY: null,
            vZoom: null,

            selectedItemLinks: [],
            lastHoveredItem: null,

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
            var p = this.toLocalPoint(coords.x, coords.y);
            var itemAtCursor = null;

            if (this.state.shouldHandleItemHover()) {
                itemAtCursor = this.findItemAtCursor(p.x, p.y);
            }
            this.state.mouseMove(p.x, p.y, coords.x, coords.y, itemAtCursor, event);
        },
        mouseDown(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            var itemAtCursor = this.findItemAtCursor(p.x, p.y);
            this.state.mouseDown(p.x, p.y, coords.x, coords.y, itemAtCursor, event);
        },
        mouseUp(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            var itemAtCursor = this.findItemAtCursor(p.x, p.y);
            this.state.mouseUp(p.x, p.y, coords.x, coords.y, itemAtCursor, event);
        },

        findItemAtCursor(x, y) {
            return this.schemeContainer.findHoveredItem(x, y);
        },

        handleItemHover(x, y) {
            var hoveredItem = this.findItemAtCursor(x, y);
            if (hoveredItem) {
                if (this.lastHoveredItem !== hoveredItem) {
                    if (this.lastHoveredItem) {
                        this.lastHoveredItem.hovered = false;
                        this.state.itemLostFocus(this.lastHoveredItem);
                    }
                    this.lastHoveredItem = hoveredItem;
                    hoveredItem.hovered = true;
                    this.state.itemHovered(hoveredItem);
                    this.$forceUpdate();
                }
            } else {
                if (this.lastHoveredItem) {
                    this.lastHoveredItem.hovered = false;
                    this.state.itemLostFocus(this.lastHoveredItem);
                    this.lastHoveredItem = null;
                    this.$forceUpdate();
                }
            }
        },

        cancelCurrentState() {
            this.state = this.states.dragging;
            this.state.reset();
        },
        switchStateDragging() {
            this.state = this.states.dragging;
            this.state.reset();
        },
        switchStateDragItem() {
            this.state = this.states.dragItem;
            this.state.reset();
        },
        switchStateCreateComponent(component) {
            this.state = this.states.createComponent;
            this.state.reset();
            this.state.setComponent(component);
        },

        onSelectItem(item) {
            if (this.mode === 'view') {
                this.selectedItemLinks = this.generateItemLinks(item);
                this.startLinksAnimation();
            }
            this.$forceUpdate();
        },

        onDeselectAllItems(item) {
            EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);

            if (this.selectedItemLinks.length > 0) {
                this.selectedItemLinks = [];
            }
        },

        startLinksAnimation() {
            if (this.animations.linksAppear.timer) {
                clearInterval(this.animations.linksAppear.timer);
            }
            this.animations.linksAppear.timer = null;
            this.animations.linksAppear.frame = 0;

            this.animations.linksAppear.timer = setInterval(() => {
                this.animations.linksAppear.frame += 1;

                if (this.animations.linksAppear.frame >= this.animations.linksAppear.totalFrames) {
                    clearInterval(this.animations.linksAppear.timer);
                } else  {
                    var t = this.animations.linksAppear.frame / this.animations.linksAppear.totalFrames;

                    _.forEach(this.selectedItemLinks, link => {
                        link.x = link.startX * (1.0 - t) + link.destinationX * t;
                        link.y = link.startY * (1.0 - t) + link.destinationY * t;
                    });
                }
           }, this.animations.linksAppear.intervalMs);
        },

        generateItemLinks(item) {
            var links = [];
            if (item.links && item.links.length > 0) {
                var fullAngle = 2 * Math.PI;
                var stepAngle = (2 * Math.PI) / item.links.length;

                var cx = item.area.w / 2 + item.area.x;
                var cy = item.area.h / 2 + item.area.y;
                var radius = Math.min(50, (item.area.w + item.area.h) / 2);

                var index = 0;
                _.forEach(item.links, link => {
                    var svgLink = {
                        url: link.url,
                        shortTitle: link.title.substr(0, 1).toUpperCase(),
                        title: link.title,
                        x: cx,
                        y: cy,
                        startX: cx,
                        startY: cy,
                        destinationX: cx + radius * Math.cos(index * stepAngle - Math.PI/2),
                        destinationY: cy + radius * Math.sin(index * stepAngle - Math.PI/2)
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

        provideBoundingBoxDraggers(item) {
            return this.schemeContainer.provideBoundingBoxDraggers(item);
        },
        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.vOffsetX) / this.vZoom,
                y: (mouseY - this.vOffsetY) / this.vZoom
            };
        },
    },
    watch: {
        mode(newMode) {
            if (newMode === 'edit') {
                this.switchStateDragItem();
            } else if (newMode === 'view') {
                this.switchStateDragging();
            }
        },
        zoom(newZoom) {
            var value = parseFloat(newZoom);
            if (value > 0.05) {
                this.vZoom = value;
            }
        }
    }
}
</script>

<style lang="css">
</style>
