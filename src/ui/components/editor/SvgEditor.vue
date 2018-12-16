<template lang="html">
    <div class="svg-editor">
        <svg id="svg_plot" ref="svgDomElement"
            :width="width+'px'"
            :height="height+'px'"
            :class="['mode-' + mode, 'state-' + (state != null ? state.name: 'unknown')]"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp">

            <g v-for="item in schemeContainer.getItems()" class="item-container"
                :class="['item-type-' + item.type, item.meta.selected ? 'selected': '']"
                >
                <g v-if="item.type === 'image'" class="item-graphics">
                    <image v-bind:xlink:href="item.url" :x="_x(item.area.x)" :y="_y(item.area.y)" :width="_z(item.area.w) + 'px'" :height="_z(item.area.h) + 'px'"/>
                </g>

                <component-item v-if="item.type === 'component'"
                    :key="item.id"
                    :item="item"
                    :zoom="vZoom"
                    :offsetX="vOffsetX"
                    :offsetY="vOffsetY"
                    ></component-item>

                <comment-item v-if="item.type === 'comment'"
                    :x="_x(item.area.x)"
                    :y="_y(item.area.y)"
                    :scale="_z(1)"
                    :width="_z(item.area.w)"
                    :height="_z(item.area.h)"
                    :item-style="item.style"
                    :text="item.description"
                    :fontsize="_z(15)"
                    ></comment-item>

                <g v-if="item.type === 'overlay'" class="item-graphics">
                    <rect
                        :x="_x(item.area.x)"
                        :y="_y(item.area.y)"
                        :width="_z(item.area.w)"
                        :height="_z(item.area.h)"
                        :fill="item.style.background && item.style.background.color ? item.style.background.color : '#fff'"
                    />
                </g>

                <g v-if="mode === 'edit'">
                    <!-- Drawing boundary edit box -->
                    <rect class="boundary-box"
                        :x="_x(item.area.x)"
                        :y="_y(item.area.y)"
                        :width="_z(item.area.w)"
                        :height="_z(item.area.h)"
                    />
                    <g v-if="item.meta.selected">
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
            <connector-svg  v-for="connector in schemeContainer.scheme.connectors" v-if="connector.meta"
                :key="connector.id"
                :connector="connector"
                :zoom="vZoom"
                :offsetX="vOffsetX"
                :offsetY="vOffsetY"
                v-on:connector-enter="connectorEntered(connector)"
                v-on:connector-leave="connectorLeave(connector)"
                ></connector-svg>

            <g v-for="link, linkIndex in selectedItemLinks">
                <a class="item-link" :xlink:href="link.url" target="_blank">
                    <circle :cx="_x(link.x)" :cy="_y(link.y)" :r="_z(12)" :stroke="linkPalette[linkIndex % linkPalette.length]" :fill="linkPalette[linkIndex % linkPalette.length]"/>

                    <text class="item-link-icon" :class="['link-icon-' + link.type]"
                        :x="_x(link.x) - _z(6)"
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

            <g v-for="area in itemHighlights">
                <!-- Drawing boundary edit box -->
                <rect class="item-search-highlight"
                    :x="_x(area.x) - 5"
                    :y="_y(area.y) - 5"
                    :width="_z(area.w) + 10"
                    :height="_z(area.h) + 10"
                />
            </g>


            <g v-if="state && state.name === 'connecting'">
                <rect v-if="state.hoveredItem" class="item-search-highlight"
                    :x="_x(state.hoveredItem.area.x) - 5"
                    :y="_y(state.hoveredItem.area.y) - 5"
                    :width="_z(state.hoveredItem.area.w) + 10"
                    :height="_z(state.hoveredItem.area.h) + 10"
                />
            </g>

            <g v-if="schemeContainer.activeBoundaryBox">
                <!-- Drawing boundary edit box -->
                <rect class="boundary-box"
                    :x="_x(schemeContainer.activeBoundaryBox.x)"
                    :y="_y(schemeContainer.activeBoundaryBox.y)"
                    :width="_z(schemeContainer.activeBoundaryBox.w)"
                    :height="_z(schemeContainer.activeBoundaryBox.h)"
                />
            </g>

        </svg>
    </div>
</template>

<script>
import StateDragging from './states/StateDragging.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateComponent from './states/StateCreateComponent.js';
import StateConnecting from './states/StateConnecting.js';
import EventBus from './EventBus.js';
import CommentItem from './items/CommentItem.vue';
import ComponentItem from './items/ComponentItem.vue';
import ConnectorSvg from './items/ConnectorSvg.vue';


export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom', 'itemHighlights'],
    components: {CommentItem, ConnectorSvg, ComponentItem},
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateDragging();

        EventBus.$on(EventBus.START_CREATING_COMPONENT, component => {
            this.switchStateCreateComponent(component);
        });
        EventBus.$on(EventBus.START_CONNECTING_ITEM, item => {
            this.switchStateConnecting(item);
        });

        EventBus.$on(EventBus.KEY_PRESS, (key) => {
            if (key === EventBus.KEY.ESCAPE) {
                this.state.cancel();
            } else if (key === EventBus.KEY.DELETE && this.mode === 'edit') {
                EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);
                EventBus.$emit(EventBus.ALL_CONNECTORS_DESELECTED);
                this.schemeContainer.deleteSelectedItemsAndConnectors();
                EventBus.$emit(EventBus.REDRAW);
            }
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
        EventBus.$on(EventBus.BRING_TO_VIEW, area => {
            //TODO calculate this properly
            this.startBringToViewAnimation(area.x, area.y, 1.0);
        });

        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, () => {
            this.switchStateDragItem();
        });
        EventBus.$on(EventBus.REBUILD_CONNECTORS, () => {
            this.schemeContainer.buildConnectors();
        });
    },
    data() {
        return {
            states: {
                dragging: new StateDragging(this),
                createComponent: new StateCreateComponent(this),
                dragItem: new StateDragItem(this),
                connecting: new StateConnecting(this)
            },
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],
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
                },

                bringToView: {
                    timer: null,
                    frame: 0,
                    totalFrames: 25,
                    intervalMs: 5
                }
            },

            hoveredConnector: null
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
            this.state.mouseMove(p.x, p.y, coords.x, coords.y, itemAtCursor, this.hoveredConnector, event);
        },
        mouseDown(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            var itemAtCursor = this.findItemAtCursor(p.x, p.y);
            this.state.mouseDown(p.x, p.y, coords.x, coords.y, itemAtCursor, this.hoveredConnector, event);
        },
        mouseUp(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            var itemAtCursor = this.findItemAtCursor(p.x, p.y);
            this.state.mouseUp(p.x, p.y, coords.x, coords.y, itemAtCursor, this.hoveredConnector, event);
        },

        findItemAtCursor(x, y) {
            //OPTIMIZE remove this and instead use pointerenter and pointerleave events in svg
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
            if (this.mode === 'edit') {
                this.state = this.states.dragging;
            } else {
                this.state = this.states.dragItem;
            }
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
        switchStateConnecting(item) {
            this.state = this.states.connecting;
            this.state.reset();
            this.state.setSourceItem(item);
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
            this.removeDrawnLinks();
        },

        removeDrawnLinks() {
            if (this.selectedItemLinks.length > 0) {
                this.selectedItemLinks = [];
            }
        },

        startBringToViewAnimation(x, y, z) {
            if (this.animations.bringToView.timer) {
                clearInterval(this.animations.bringToView.timer);
            }
            this.animations.bringToView.timer = null;
            this.animations.bringToView.frame = 0;

            var originalX = this.vOffsetX;
            var originalY = this.vOffsetY;
            var originalZoom = this.vZoom;

            this.animations.bringToView.timer = setInterval(() => {
                this.animations.bringToView.frame += 1;

                if (this.animations.bringToView.frame >= this.animations.bringToView.totalFrames) {
                    clearInterval(this.animations.bringToView.timer);
                } else  {
                    var t = this.animations.bringToView.frame / this.animations.bringToView.totalFrames;

                    this.vOffsetX = originalX * (1.0 - t) + x * t;
                    this.vOffsetY = originalY * (1.0 - t) + y * t;
                    this.vZoom = originalZoom * (1.0 - t) + z * t;
                }
           }, this.animations.linksAppear.intervalMs);
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
                        type: link.type,
                        //shortTitle: link.title.substr(0, 1).toUpperCase(),
                        shortTitle: this.getFontAwesomeSymbolForLink(link),
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

        getFontAwesomeSymbolForLink(link) {
            if (link.type === 'logs') {
                return '\uf550';
            } else if (link.type === 'graphs') {
                return '\uf201';
            } else if (link.type === 'scheme') {
                return '\uf542';
            }
            return '\uf0c1';
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

        connectorToSvgPath(connector) {
            var path = `M ${this._x(connector.meta.points[0].x)} ${this._y(connector.meta.points[0].y)}`

            for (var i = 1; i < connector.meta.points.length; i++) {
                path += ` L ${this._x(connector.meta.points[i].x)} ${this._y(connector.meta.points[i].y)}`
            }
            return path;
        },

        connectorEntered(connector) {
            if (this.hoveredConnector !== connector) {
                this.hoveredConnector = connector;
            }
        },

        connectorLeave(connector) {
            this.hoveredConnector = null;
        },
    },
    watch: {
        mode(newMode) {
            if (newMode === 'edit') {
                this.removeDrawnLinks();
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
