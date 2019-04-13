<template lang="html">
    <div id="svg-editor" class="svg-editor"
            :width="width+'px'"
            :height="height+'px'">
        <svg id="svg_plot" ref="svgDomElement"
            :width="width+'px'"
            :height="height+'px'"
            :class="['mode-' + mode, 'state-' + (state != null ? state.name: 'unknown')]"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp">

            <g v-if="mode === 'edit'" class="grid" data-preview-ignore="true" :transform="gridTransform">
                <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height"/>
                <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width" :y2="index * gridStep"/>
            </g>
            <g data-type="scene-transform" :transform="transformSvg">

                <g v-for="(item,itemIndex) in schemeContainer.getItems()" class="item-container"
                    :class="['item-type-' + item.type, item.meta.selected ? 'selected': '', item.interactive?'item-interactive':'']"
                    >

                    <!-- Drawing search highlight box -->
                    <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                        :x="item.area.x - 5"
                        :y="item.area.y - 5"
                        :width="item.area.w + 10"
                        :height="item.area.h + 10"
                    />

                    <g v-if="item.type === 'image'" class="item-graphics" :style="{opacity: item.style.opacity}">
                        <image
                            :x="item.area.x"
                            :y="item.area.y"
                            :width="item.area.w"
                            :height="item.area.h"
                            :xlink:href="item.url"/>
                        <text
                            :x="item.area.x + item.area.w/2 - 15 * item.name.length / (1.75 * 2)"
                            :y="item.area.y + item.area.h + 20"
                            :font-size="15 + 'px'"
                            :fill="item.style.text && item.style.text.color ? item.style.text.color : '#000'"
                            >{{item.name}}</text>
                    </g>

                    <component-item v-if="item.type === 'component'"
                        :key="item.id"
                        :item="item"
                        :zoom="vZoom"
                        :offsetX="vOffsetX"
                        :offsetY="vOffsetY"
                        ></component-item>

                    <comment-item v-if="item.type === 'comment'"
                        :x="item.area.x"
                        :y="item.area.y"
                        :scale="1"
                        :width="item.area.w"
                        :height="item.area.h"
                        :item-style="item.style"
                        :text="item.description"
                        :fontsize="15"
                        ></comment-item>

                    <overlay-item v-if="item.type === 'overlay'"
                        :item="item"
                        data-type="overlay"
                    />

                    <g v-if="item.links && item.links.length > 0" data-preview-ignore="true">
                        <ellipse :cx="item.area.x" :cy="item.area.y" rx="3" :ry="3" class="marker-has-links" />
                    </g>

                    <rect class="item-rect-highlight-area"
                        data-preview-ignore="true"
                        :data-item-index="itemIndex"
                        :x="item.area.x"
                        :y="item.area.y"
                        :width="item.area.w"
                        :height="item.area.h"
                        fill="rgba(0,0,0,0.0)"
                    />


                    <g v-if="mode === 'edit'" class="item-container" data-preview-ignore="true">
                        <!-- Drawing boundary edit box -->
                        <rect class="boundary-box"
                             :data-item-index="itemIndex"
                            :x="item.area.x"
                            :y="item.area.y"
                            :width="item.area.w"
                            :height="item.area.h"
                        />
                        <g v-if="item.meta.selected">
                            <rect class="boundary-box-dragger"
                                v-for="(dragger, draggerIndex) in provideBoundingBoxDraggers(item)"
                                :data-dragger-item-index="itemIndex"
                                :data-dragger-index="draggerIndex"
                                :x="dragger.x - dragger.s / (vZoom || 1.0)"
                                :y="dragger.y - dragger.s / (vZoom || 1.0)"
                                :width="dragger.s * 2 / (vZoom || 1.0)"
                                :height="dragger.s * 2 / (vZoom || 1.0)"
                            />
                        </g>
                    </g>

                    <connector-svg  v-for="(connector,connectorIndex) in item.connectors" v-if="connector.meta"
                        :key="connectorIndex"
                        :connectorIndex="connectorIndex"
                        :sourceItem="item"
                        :connector="connector"
                        :zoom="vZoom"
                        :offsetX="vOffsetX"
                        :offsetY="vOffsetY"
                        :showReroutes="mode === 'edit'"
                        ></connector-svg>

                </g>

                <g v-for="link, linkIndex in selectedItemLinks" data-preview-ignore="true">
                    <a class="item-link" :xlink:href="link.url">
                        <circle :cx="link.x" :cy="link.y" :r="12" :stroke="linkPalette[linkIndex % linkPalette.length]" :fill="linkPalette[linkIndex % linkPalette.length]"/>

                        <text class="item-link-icon" :class="['link-icon-' + link.type]"
                            :x="link.x - 6"
                            :y="link.y + 5"
                            :font-size="13 + 'px'"
                            :title="link.title"
                            >{{link.shortTitle}}</text>

                        <rect class="item-link-title-background"
                            :x="link.x + 16"
                            :y="link.y - 13"
                            :width="calculateLinkBackgroundRectWidth(link)"
                            :height="25"
                        ></rect>
                        <text class="item-link-full-title"
                            :x="link.x + 25 - 5"
                            :y="link.y + 5"
                            >{{link | formatLinkTitle}}</text>
                    </a>
                </g>

                <!-- Item Edit Menu -->
                <g v-if="mode === 'edit' && activeItem" data-preview-ignore="true">
                    <g class="item-edit-menu-link" @click="$emit('clicked-add-item-to-item', activeItem)">
                        <circle :cx="activeItem.area.x + activeItem.area.w + 30" :cy="activeItem.area.y" r="12" stroke="red" fill="#ff00ff"/>
                        <text class="link-icon" :x="activeItem.area.x + activeItem.area.w + 25" :y="activeItem.area.y + 5">&#xf067;</text>
                        <text class="item-link-full-title" :x="activeItem.area.x + activeItem.area.w + 55" :y="activeItem.area.y + 5">Add Item</text>
                    </g>
                    <g class="item-edit-menu-link" @click="$emit('clicked-create-child-scheme-to-item', activeItem)">
                        <circle :cx="activeItem.area.x + activeItem.area.w + 30" :cy="activeItem.area.y + 35" r="12" stroke="red" fill="#ff00ff"/>
                        <text class="link-icon" :x="activeItem.area.x + activeItem.area.w + 23" :y="activeItem.area.y + 40">&#xf542;</text>
                        <text class="item-link-full-title" :x="activeItem.area.x + activeItem.area.w + 55" :y="activeItem.area.y + 40">Create scheme for this element</text>
                    </g>
                    <g class="item-edit-menu-link" @click="$emit('clicked-add-item-link', activeItem)">
                        <circle :cx="activeItem.area.x - 30" :cy="activeItem.area.y" r="12" stroke="#096e9f" fill="#0698e0"/>
                        <text class="link-icon" :x="activeItem.area.x - 36" :y="activeItem.area.y + 5">&#xf0c1;</text>
                        <text class="item-link-full-title" :x="activeItem.area.x + 5" :y="activeItem.area.y + 5">Add link</text>
                    </g>
                    <g class="item-edit-menu-link" @click="$emit('clicked-start-connecting', activeItem)">
                        <circle :cx="activeItem.area.x - 30" :cy="activeItem.area.y + 35" r="12" stroke="#096e9f" fill="#0698e0"/>
                        <text class="link-icon" :x="activeItem.area.x - 37" :y="activeItem.area.y + 40">&#xf0e8;</text>
                        <text class="item-link-full-title" :x="activeItem.area.x + 5" :y="activeItem.area.y + 40">Connect</text>
                    </g>
                </g>

                <g v-if="schemeContainer.activeBoundaryBox" data-preview-ignore="true">
                    <!-- Drawing boundary edit box -->
                    <rect class="boundary-box"
                        :x="schemeContainer.activeBoundaryBox.x"
                        :y="schemeContainer.activeBoundaryBox.y"
                        :width="schemeContainer.activeBoundaryBox.w"
                        :height="schemeContainer.activeBoundaryBox.h"
                    />
                </g>
            </g>
            <g v-if="multiSelectBox">
                <rect class="multi-select-box"
                    :x="_x(multiSelectBox.x)"
                    :y="_y(multiSelectBox.y)"
                    :width="_z(multiSelectBox.w)"
                    :height="_z(multiSelectBox.h)"
                />
            </g>
        </svg>
    </div>
</template>

<script>
import StateInteract from './states/StateInteract.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateComponent from './states/StateCreateComponent.js';
import StateConnecting from './states/StateConnecting.js';
import EventBus from './EventBus.js';
import CommentItem from './items/CommentItem.vue';
import OverlayItem from './items/OverlayItem.vue';
import ComponentItem from './items/ComponentItem.vue';
import ConnectorSvg from './items/ConnectorSvg.vue';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';

const EMPTY_OBJECT = {type: 'nothing'};

export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom'],
    components: {CommentItem, ConnectorSvg, ComponentItem, OverlayItem},
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateInteract();

        EventBus.$on(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateComponent);
        EventBus.$on(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.REDRAW, this.onRedraw);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$on(EventBus.ACTIVE_ITEM_SELECTED, this.onSelectItem);
        EventBus.$on(EventBus.ALL_ITEMS_DESELECTED, this.onAllItemsDeselected);
        EventBus.$on(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$on(EventBus.REBUILD_CONNECTORS, this.onRebuildConnectors);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.addEventListener('mousewheel', this.mouseWheel);
        }
    },
    beforeDestroy(){
        EventBus.$off(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateComponent);
        EventBus.$off(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.REDRAW, this.onRedraw);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$off(EventBus.ACTIVE_ITEM_SELECTED, this.onSelectItem);
        EventBus.$off(EventBus.ALL_ITEMS_DESELECTED, this.onAllItemsDeselected);
        EventBus.$off(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$off(EventBus.REBUILD_CONNECTORS, this.onRebuildConnectors);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.removeEventListener('mousewheel', this.mouseWheel);
        }
    },
    data() {
        return {
            states: {
                interact: new StateInteract(this),
                createComponent: new StateCreateComponent(this),
                dragItem: new StateDragItem(this),
                connecting: new StateConnecting(this)
            },
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],
            state: null,
            vOffsetX: null,
            vOffsetY: null,
            vZoom: null,

            activeItem: null,
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

            multiSelectBox: null,

            lastMouseUpTimestamp: 0
        };
    },
    methods: {
        updateOffset(x, y) {
            this.vOffsetX = x;
            this.vOffsetY = y;
            this.$emit('offset-updated', x, y);
        },

        dragOffset(dx, dy) {
            this.vOffsetX += dx;
            this.vOffsetY += dy;
            this.$emit('offset-updated', this.vOffsetX, this.vOffsetY);
        },

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

        updateZoom(zoom) {
            this.$emit('zoom-updated', zoom);
        },

        identifyElement(element) {
            if (element) {
                var itemIndex = event.srcElement.getAttribute('data-item-index');
                if (itemIndex) {
                    return {
                        item: this.schemeContainer.scheme.items[itemIndex]
                    };
                }

                var connectorIndex = event.srcElement.getAttribute('data-connector-index');
                if (connectorIndex) {
                    var path = connectorIndex.split('/');
                    var sourceItem = this.schemeContainer.findItemById(path[0]);
                    return {
                        connector: sourceItem.connectors[path[1]],
                        connectorIndex: path[1],
                        sourceItem
                    }
                }

                var rerouteIndex = event.srcElement.getAttribute('data-reroute-index');
                if (rerouteIndex) {
                    var path = rerouteIndex.split('/');
                    var sourceItem = this.schemeContainer.findItemById(path[0]);
                    return {
                        connector: sourceItem.connectors[path[1]],
                        connectorIndex: path[1],
                        rerouteId: path[2],
                        sourceItem
                    };
                }

                var draggerItemIndex = event.srcElement.getAttribute('data-dragger-item-index');
                if (draggerItemIndex) {
                    var item = this.schemeContainer.scheme.items[draggerItemIndex]
                    return {
                        dragger: {
                            item,
                            dragger: this.provideBoundingBoxDraggers(item)[event.srcElement.getAttribute('data-dragger-index')]
                        }
                    }
                }
            }
            return EMPTY_OBJECT;
        },

        mouseWheel(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);
            this.state.mouseWheel(p.x, p.y, coords.x, coords.y, event);
        },
        mouseMove(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            this.state.mouseMove(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
        },
        mouseDown(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            this.state.mouseDown(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
        },
        mouseUp(event) {
            if (event.timeStamp - this.lastMouseUpTimestamp < 400.0) {
                event.doubleClick = true;
            }
            this.lastMouseUpTimestamp = event.timeStamp;

            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);

            this.state.mouseUp(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
        },

        onCancelCurrentState() {
            if (this.mode === 'edit') {
                this.state = this.states.dragItem;
            } else {
                this.state = this.states.interact;
            }
            this.state.reset();
        },
        switchStateInteract() {
            this.state = this.states.interact;
            this.state.reset();
        },
        switchStateDragItem() {
            this.state = this.states.dragItem;
            this.state.reset();
        },
        onSwitchStateCreateComponent(component) {
            this.state = this.states.createComponent;
            this.state.reset();
            this.state.setComponent(component);
        },
        onSwitchStateConnecting(item) {
            this.state = this.states.connecting;
            this.state.reset();
            this.state.setSourceItem(item);
        },

        onKeyPress(key, keyOptions) {
            if (key === EventBus.KEY.ESCAPE) {
                this.state.cancel();
            } else if (key === EventBus.KEY.DELETE && this.mode === 'edit') {
                this.activeItem = null;
                EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);
                EventBus.$emit(EventBus.ALL_CONNECTORS_DESELECTED);
                this.schemeContainer.deleteSelectedItemsAndConnectors();
                EventBus.$emit(EventBus.REDRAW);
            } else {
                this.state.keyPressed(key, keyOptions);
            }
        },

        onRedraw() {
            this.$forceUpdate();
        },

        onRebuildConnectors() {
            this.schemeContainer.buildConnectors();
        },

        onMultiSelectBoxAppear(multiSelectBox) {
            this.multiSelectBox = multiSelectBox;
        },
        onMultiSelectBoxDisappear() {
            this.multiSelectBox = null;
        },

        onSelectItem(item) {
            if (this.mode === 'view') {
                this.selectedItemLinks = this.generateItemLinks(item);
                this.startLinksAnimation();
            }
            this.activeItem = item;
            this.$forceUpdate();
        },

        onAllItemsDeselected(item) {
            this.activeItem = null;
            this.removeDrawnLinks();
        },

        removeDrawnLinks() {
            if (this.selectedItemLinks.length > 0) {
                this.selectedItemLinks = [];
            }
        },

        onBringToView(area) {
            const headerHeight = 50;
            const sidePanelWidth = 400;
            var newScale = 1.0;
            if (area.w > 0 && area.h > 0 && this.width - 400 > 0 && this.height > 0) {
                newScale = Math.floor(100.0 * Math.min((this.width - sidePanelWidth)/area.w, (this.height - headerHeight)/area.h)) / 100.0;
                newScale = Math.max(0.05, Math.min(newScale, 1.0));
            }

            var Xo = (this.width - sidePanelWidth)/2 - (area.x + area.w/2) * newScale;
            var Yo = (this.height)/2 - (area.y - headerHeight + area.h/2) *newScale;

            this.startBringToViewAnimation(Xo, Yo, newScale);
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
                    this.updateZoom(z);
                } else  {
                    var t = this.animations.bringToView.frame / this.animations.bringToView.totalFrames;

                    this.updateOffset(
                        originalX * (1.0 - t) + x * t,
                        originalY * (1.0 - t) + y * t
                    );
                    this.updateZoom(originalZoom * (1.0 - t) + z * t);
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
            return linkTypes.findTypeByNameOrDefault(link.type).fontAwesomeSymbol;
        },

        //OPTIMIZE: cache draggers to not construct them every single time, especially on mouse move event
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
            var path = `M ${connector.meta.points[0].x} ${connector.meta.points[0].y}`

            for (var i = 1; i < connector.meta.points.length; i++) {
                path += ` L ${connector.meta.points[i].x} ${connector.meta.points[i].y}`
            }
            return path;
        },

        calculateLinkBackgroundRectWidth(link) {
            if (link.title) {
                return link.title.length * 10;
            } else {
                return link.url.length * 10;
            }
        },

        _x(x) { return x * this.vZoom + this.vOffsetX; },
        _y(y) { return y * this.vZoom + this.vOffsetY; },
        _z(v) { return v * this.vZoom; }
    },
    watch: {
        mode(newMode) {
            if (newMode === 'edit') {
                this.removeDrawnLinks();
                this.switchStateDragItem();
            } else if (newMode === 'view') {
                this.switchStateInteract();
            }
        },
        zoom(newZoom) {
            var value = parseFloat(newZoom);
            if (value > 0.05) {
                this.vZoom = value;
            }
        }
    },
    computed: {
        transformSvg() {
            var x = Math.floor(this.vOffsetX || 0);
            var y = Math.floor(this.vOffsetY || 0);
            var scale = this.vZoom || 1.0;
            return `translate(${x} ${y}) scale(${scale} ${scale})`;
        },
        gridStep() {
            return 20 * this.vZoom;
        },
        gridCount() {
            if (this.vZoom > 0.6) {
                return {
                    x: Math.ceil(this.width / (20 *this.vZoom)),
                    y: Math.ceil(this.height / (20 * this.vZoom))
                };
            } else {
                return 0;
            }
        },
        gridTransform() {
            let x = Math.ceil(this.vOffsetX % (20 * this.vZoom));
            let y = Math.ceil(this.vOffsetY % (20 * this.vZoom));
            return `translate(${x} ${y})`;
        }
    },
    filters: {
        formatLinkTitle(link) {
            if (link.title) {
                return link.title;
            } else {
                return link.url;
            }
        }
    }
}
</script>

<style lang="css">
</style>
