<template lang="html">
    <div id="svg-editor" class="svg-editor">
        <svg id="svg_plot" ref="svgDomElement"
            :width="width+'px'"
            :height="height+'px'"
            :class="['mode-' + mode, 'state-' + (state != null ? state.name: 'unknown')]"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp">

            <g v-for="(item,itemIndex) in schemeContainer.getItems()" class="item-container"
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

                <g v-if="item.type === 'shape'" class="item-graphics">
                    <image
                        :x="_x(item.area.x)"
                        :y="_y(item.area.y)"
                        :width="_z(item.area.w)"
                        :height="_z(item.area.h)"
                        :xlink:href="'/shapes/'+item.shape+'.svg'"/>
                    <text
                        :x="_x(item.area.x + item.area.w/2) - _z(15 * item.name.length / (1.75 * 2))"
                        :y="_y(item.area.y + item.area.h + 20)"
                        :font-size="Math.floor(_z(15)) + 'px'"
                        :fill="item.style.text && item.style.text.color ? item.style.text.color : '#000'"
                        >{{item.name}}</text>
                </g>

                <rect class="item-rect-highlight-area"
                    :data-item-index="itemIndex"
                    :x="_x(item.area.x)"
                    :y="_y(item.area.y)"
                    :width="_z(item.area.w)"
                    :height="_z(item.area.h)"
                    fill="rgba(0,0,0,0.0)"
                />

                <g v-if="mode === 'edit'">
                    <!-- Drawing boundary edit box -->
                    <rect class="boundary-box"
                         :data-item-index="itemIndex"
                        :x="_x(item.area.x)"
                        :y="_y(item.area.y)"
                        :width="_z(item.area.w)"
                        :height="_z(item.area.h)"
                    />
                    <g v-if="item.meta.selected">
                        <rect class="boundary-box-dragger"
                            v-for="(dragger, draggerIndex) in provideBoundingBoxDraggers(item)"
                            :data-dragger-item-index="itemIndex"
                            :data-dragger-index="draggerIndex"
                            :x="_x(dragger.x) - dragger.s"
                            :y="_y(dragger.y) - dragger.s"
                            :width="dragger.s * 2"
                            :height="dragger.s * 2"
                        />
                    </g>

                </g>
            </g>
            <connector-svg  v-for="(connector,connectorIndex) in schemeContainer.scheme.connectors" v-if="connector.meta"
                :connectorIndex="connectorIndex"
                :connector="connector"
                :zoom="vZoom"
                :offsetX="vOffsetX"
                :offsetY="vOffsetY"
                :showReroutes="mode === 'edit'"
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


            <g v-if="mode === 'edit' && activeItem">
                <g class="item-edit-menu-link" @click="onActiveItemAppendItem" v-if="activeItem.type === 'component' || activeItem.type === 'overlay' || activeItem.type === 'shape'">
                    <circle :cx="_x(activeItem.area.x + activeItem.area.w) + 30" :cy="_y(activeItem.area.y)" r="12" stroke="red" fill="#ff00ff"/>
                    <text :x="_x(activeItem.area.x + activeItem.area.w) + 25" :y="_y(activeItem.area.y) + 5"
                        >&#xf067;</text>

                </g>
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


            <h2>{{schemeContainer.scheme.name}}</h2>

            <text class="scheme-name-header" v-if="schemeContainer && schemeContainer.scheme"
                :x="10"
                :y="60"
                >{{schemeContainer.scheme.name}}</text>
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
import ComponentItem from './items/ComponentItem.vue';
import ConnectorSvg from './items/ConnectorSvg.vue';


const EMPTY_OBJECT = {type: 'nothing'};

export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom', 'itemHighlights'],
    components: {CommentItem, ConnectorSvg, ComponentItem},
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateInteract();

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
                this.activeItem = null;
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
            var Xo = (this.width - 400)/2 - (area.x + area.w/2);
            var Yo = (this.height)/2 - (area.y + area.h/2);
            this.startBringToViewAnimation(Xo, Yo, 1.0);
        });

        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, () => {
            this.switchStateDragItem();
        });
        EventBus.$on(EventBus.REBUILD_CONNECTORS, () => {
            this.schemeContainer.buildConnectors();
        });

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.addEventListener('mousewheel', this.mouseWheel);
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

            lastMouseUpTimestamp: 0
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

        updateZoom(zoom) {
            this.$emit('update-zoom', zoom);
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
                    return {
                        connector: this.schemeContainer.scheme.connectors[connectorIndex]
                    }
                }

                var rerouteIndex = event.srcElement.getAttribute('data-reroute-index');
                if (rerouteIndex) {
                    var indices = rerouteIndex.split('/');
                    return {
                        connector: this.schemeContainer.scheme.connectors[indices[0]],
                        rerouteId: indices[1]
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

        cancelCurrentState() {
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
            this.activeItem = item;
            this.$forceUpdate();
        },

        onDeselectAllItems(item) {
            EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);
            this.activeItem = null;
            this.removeDrawnLinks();
        },

        //calculates average next direction based on all connectors pointing to item
        calculateNextDirection(item) {
            var connectors = this.schemeContainer.findConnectorsPointingToItem(item);
            var direction = {x: 0, y: 0};

            if (connectors && connectors.length > 0) {
                _.forEach(connectors, connector => {
                    var sourceItem = this.schemeContainer.findItemById(connector.sourceId);
                    if (sourceItem) {
                        var vx = item.area.x + item.area.w/2 - sourceItem.area.x - sourceItem.area.w / 2;
                        var vy = item.area.y + item.area.h/2 - sourceItem.area.y - sourceItem.area.h / 2;
                        var v = vx*vx + vy*vy;
                        if (v > 0.0001) {
                            var sv = Math.sqrt(v);
                            vx = vx / sv;
                            vy = vy / sv;
                            direction.x += vx;
                            direction.y += vy;
                        }
                    };
                });
            }

            var d = direction.x*direction.x + direction.y*direction.y;
            if (d > 0.0001) {
                var sd = Math.sqrt(d);
                direction.x = (Math.max(item.area.w, item.area.h) + 40) * direction.x / sd;
                direction.y = (Math.max(item.area.w, item.area.h) + 40) * direction.y / sd;
            } else {
                direction.x = item.area.w + 40;
                direction.y = 0;
            }

            return direction;
        },

        onActiveItemAppendItem() {
            var area = this.activeItem.area;
            var direction = this.calculateNextDirection(this.activeItem);

            var item = {
                type: this.activeItem.type,
                area: { x: area.x + direction.x, y: area.y + direction.y, w: area.w, h: area.h },
                style: _.clone(this.activeItem.style),
                properties: '',
                name: 'Unnamed',
                description: '',
                links: []
            };
            var id = this.schemeContainer.addItem(item);
            this.schemeContainer.connectItems(this.activeItem, item);

            this.schemeContainer.selectItem(item, false);
            EventBus.$emit(EventBus.ITEM_SELECTED, item);
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
                    this.updateZoom(z);
                } else  {
                    var t = this.animations.bringToView.frame / this.animations.bringToView.totalFrames;

                    this.vOffsetX = originalX * (1.0 - t) + x * t;
                    this.vOffsetY = originalY * (1.0 - t) + y * t;
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
            var path = `M ${this._x(connector.meta.points[0].x)} ${this._y(connector.meta.points[0].y)}`

            for (var i = 1; i < connector.meta.points.length; i++) {
                path += ` L ${this._x(connector.meta.points[i].x)} ${this._y(connector.meta.points[i].y)}`
            }
            return path;
        },
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
    }
}
</script>

<style lang="css">
</style>
