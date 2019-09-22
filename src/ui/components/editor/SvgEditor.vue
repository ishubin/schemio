<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

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
            @mouseup="mouseUp"
            @dblclick="mouseDoubleClick">

            <g v-if="mode === 'view'">
                <g v-if="interactiveSchemeContainer" data-type="scene-transform" :transform="transformSvg">
                    <g v-for="(item, itemIndex) in interactiveSchemeContainer.getItems()" class="item-container"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        <!-- Drawing search highlight box -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />


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

                        <item-svg 
                            :key="item.id"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :offsetX="vOffsetX" :offsetY="vOffsetY" :zoom="vZoom"/>
                    </g>
                </g>
                <g v-for="link, linkIndex in selectedItemLinks" data-preview-ignore="true">
                    <a class="item-link" @click="onSvgItemLinkClick(link.url, arguments[0])" :xlink:href="link.url">
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
            </g>


            <!--  EDIT MODE -->

            <g v-if="mode === 'edit'">
                <g class="grid" data-preview-ignore="true" :transform="gridTransform">
                    <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height"/>
                    <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width" :y2="index * gridStep"/>
                </g>
                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="(item, itemIndex) in schemeContainer.getItems()" class="item-container"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        >

                        <!-- Drawing search highlight box -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />


                        <connector-svg  v-for="(connector,connectorIndex) in item.connectors" v-if="connector.meta"
                            :key="connector.id"
                            :connectorIndex="connectorIndex"
                            :sourceItem="item"
                            :connector="connector"
                            :zoom="vZoom"
                            :offsetX="vOffsetX"
                            :offsetY="vOffsetY"
                            :showReroutes="mode === 'edit'"
                            ></connector-svg>

                        <item-svg
                            :key="item.id"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :offsetX="vOffsetX" :offsetY="vOffsetY" :zoom="vZoom"/>
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

                    <!-- Drawing items hitbox so that connecting state is able to identify hovered items even when reroute point or connector line is right below it -->
                    <g v-if="state.name === 'connecting'">
                        <rect v-for="(item, itemIndex) in schemeContainer.getItems()" class="item-hitbox" data-preview-ignore="true"
                            :data-item-id="item.id"
                            :x="item.area.x"
                            :y="item.area.y"
                            :width="item.area.w"
                            :height="item.area.h"
                            fill="rgba(255, 255, 255, 0.0)"
                            stroke="none"
                            ></rect>
                    </g>
                </g>

                <!-- Item Text Editor -->    
                <g v-if="itemTextEditor.shown" :transform="transformSvg">
                    <foreignObject :x="itemTextEditor.area.x" :y="itemTextEditor.area.y" :width="itemTextEditor.area.w" :height="itemTextEditor.area.h">
                        <div id="item-text-editor" class="item-text-container" :style="itemTextEditor.style" v-html="itemTextEditor.text" contenteditable="true"></div>
                    </foreignObject>
                </g>



                <g v-if="multiSelectBox">
                    <rect class="multi-select-box"
                        :x="_x(multiSelectBox.x)"
                        :y="_y(multiSelectBox.y)"
                        :width="_z(multiSelectBox.w)"
                        :height="_z(multiSelectBox.h)"
                    />
                </g>
            </g>
        </svg>

        <context-menu v-if="contextMenu.show"
            :mouse-x="contextMenu.mouseX"
            :mouse-y="contextMenu.mouseY"
            @close="contextMenu.show = false"
        >
            <ul>
                <li @click="$emit('clicked-add-item-link', contextMenu.item)">
                    <i class="fas fa-link"></i> Add link
                </li>
                <li @click="$emit('clicked-start-connecting', contextMenu.item)">
                    <i class="fas fa-network-wired"></i> Connect
                </li>
                <li @click="$emit('clicked-add-item-to-item', contextMenu.item)">
                    <i class="far fa-plus-square"></i> Add item
                </li>
                <li @click="$emit('clicked-create-child-scheme-to-item', contextMenu.item)">
                    <i class="far fa-file"></i> Create scheme for this element...
                </li>
                <li @click="deleteSelectedItemsAndConnectors()">
                    <i class="fa fa-times"></i> Delete
                </li>
            </ul>
        </context-menu>

    </div>
</template>

<script>
import StateInteract from './states/StateInteract.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateComponent from './states/StateCreateComponent.js';
import StateConnecting from './states/StateConnecting.js';
import EventBus from './EventBus.js';
import ItemSvg from './items/ItemSvg.vue';
import ConnectorSvg from './items/ConnectorSvg.vue';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import UserEventBus from '../../userevents/UserEventBus.js';
import Compiler from '../../userevents/Compiler.js';
import ContextMenu from './ContextMenu.vue';
import Shape from './items/shapes/Shape';


const EMPTY_OBJECT = {type: 'nothing'};
const LINK_FONT_SYMBOL_SIZE = 10;

const userEventBus = new UserEventBus();
const behaviorCompiler = new Compiler();

export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'offsetX', 'offsetY', 'zoom', 'shouldSnapToGrid'],
    components: {ConnectorSvg, ItemSvg, ContextMenu},
    mounted() {
        this.vOffsetX = parseInt(this.offsetX);
        this.vOffsetY = parseInt(this.offsetY);
        this.vZoom = parseFloat(this.zoom);
        this.switchStateInteract();

        EventBus.$on(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateComponent);
        EventBus.$on(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
        EventBus.$on(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$on(EventBus.REBUILD_CONNECTORS, this.onRebuildConnectors);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$on(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$on(EventBus.ITEM_INEDITOR_TEXTEDIT_TRIGGERED, this.onItemInEditorTextEditTriggered);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.addEventListener('mousewheel', this.mouseWheel);
        }
    },
    beforeDestroy(){
        this.mouseEventsEnabled = false;
        EventBus.$off(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateComponent);
        EventBus.$off(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
        EventBus.$off(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$off(EventBus.REBUILD_CONNECTORS, this.onRebuildConnectors);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$off(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$off(EventBus.ITEM_INEDITOR_TEXTEDIT_TRIGGERED, this.onItemInEditorTextEditTriggered);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.removeEventListener('mousewheel', this.mouseWheel);
        }
    },
    data() {
        return {
            states: {
                interact: new StateInteract(this, EventBus, userEventBus),
                createComponent: new StateCreateComponent(this, EventBus),
                dragItem: new StateDragItem(this, EventBus),
                connecting: new StateConnecting(this, EventBus)
            },

            interactiveSchemeContainer: null,
            mouseEventsEnabled: true,
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

            contextMenu: {
                show: false,
                item: null,
                mouseX: 0, mouseY: 0
            },

            itemTextEditor: {
                shown: false,
                property: 'text',
                itemId: null,
                text: '',
                style: {},
                area: {x: 0, y: 0, w: 0, h: 0}
            }
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
                const itemId = element.getAttribute('data-item-id');
                if (itemId) {
                    return {
                        item: this.schemeContainer.findItemById(itemId)
                    }
                }

                var connectorIndex = element.getAttribute('data-connector-index');
                if (connectorIndex) {
                    var path = connectorIndex.split('/');
                    var sourceItem = this.schemeContainer.findItemById(path[0]);
                    return {
                        connector: sourceItem.connectors[path[1]],
                        connectorIndex: path[1],
                        sourceItem
                    }
                }

                var rerouteIndex = element.getAttribute('data-reroute-index');
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

                const draggerItemId = element.getAttribute('data-dragger-item-id');
                if (draggerItemId) {
                    const item = this.schemeContainer.findItemById(draggerItemId);
                    if (element.getAttribute('data-dragger-type') === 'rotation') {
                        return {
                            rotationDragger: {
                                item
                            }
                        };
                    } else {
                        return {
                            dragger: {
                                item,
                                dragger: this.provideBoundingBoxDraggers(item)[element.getAttribute('data-dragger-index')]
                            }
                        };
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
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                this.state.mouseMove(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseDown(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                this.state.mouseDown(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseUp(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                this.state.mouseUp(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseDoubleClick(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                this.state.mouseDoubleClick(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
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
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), EventBus);
            this.reindexUserEvents();
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

        reindexUserEvents() {
            userEventBus.clear();
            _.forEach(this.interactiveSchemeContainer.getItems(), item => {
                if (item.behavior) {
                    _.forEach(item.behavior, rule => {
                        if (rule.on) {
                            const eventCallback = behaviorCompiler.compileActions(this.interactiveSchemeContainer, item, rule.do);

                            let originator = rule.on.originator;
                            if (rule.on.originator === 'self') {
                                originator = item.id;
                            }
                            userEventBus.subscribeItemEvent(originator, rule.on.event, rule.on.args, eventCallback);
                        }
                    })
                }
            })
        },

        onSvgItemLinkClick(url, event) {
            if (url.startsWith('/')) {
                this.$router.push({path: url});
                event.preventDefault();
            }
            return false;
        },

        onKeyPress(key, keyOptions) {
            if (key === EventBus.KEY.ESCAPE) {
                this.state.cancel();
            } else if (key === EventBus.KEY.DELETE && this.mode === 'edit') {
                this.deleteSelectedItemsAndConnectors();
            } else {
                this.state.keyPressed(key, keyOptions);
            }
        },

        deleteSelectedItemsAndConnectors() {
            this.activeItem = null;
            this.schemeContainer.deleteSelectedItemsAndConnectors();
            this.$emit('deleted-items');
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

        onAnyItemSelected(itemId) {
            const item = this.schemeContainer.findItemById(itemId);

            if (this.mode === 'view') {
                this.selectedItemLinks = this.generateItemLinks(item);
                this.startLinksAnimation();
            }
            this.activeItem = item;
        },

        onAnyItemDeselected(item) {
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
                    this.updateOffset(x, y);
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
            let links = [];
            if (item.links && item.links.length > 0) {

                let cx = this._x(item.area.w / 2 + item.area.x);
                let cy = this._y(item.area.h / 2 + item.area.y);
                let startX = cx;
                let startY = cy;

                if (cy > this.height - 100 || cy < 100) {
                    cy = this.y_(this.height / 2);
                }

                let step = 40;
                let y0 = cy - item.links.length * step / 2;
                let destinationX = this._x(item.area.x + item.area.w + 10);

                // taking side panel into account
                if (destinationX > this.width - 500) {
                    let maxLinkLength = _.chain(item.links).map(link => link.title ? link.title.length : link.url.length).max().value();
                    destinationX = item.area.x - maxLinkLength * LINK_FONT_SYMBOL_SIZE;
                }

                _.forEach(item.links, (link, index) => {
                    let svgLink = {
                        url: link.url,
                        type: link.type,
                        shortTitle: this.getFontAwesomeSymbolForLink(link),
                        title: link.title,
                        x: cx,
                        y: cy,
                        startX,
                        startY,
                        destinationX,
                        destinationY: y0 + step * index
                    };

                    links.push(svgLink);
                });
            }
            return links;
        },

        calculateLinkBackgroundRectWidth(link) {
            if (link.title) {
                return link.title.length * LINK_FONT_SYMBOL_SIZE;
            } else {
                return link.url.length * LINK_FONT_SYMBOL_SIZE;
            }
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

        onRightClickedItem(item, mouseX, mouseY) {
            this.contextMenu.item = item;
            this.contextMenu.mouseX = mouseX;
            this.contextMenu.mouseY = mouseY;
            this.contextMenu.show = true;
        },

        onItemInEditorTextEditTriggered(item, x, y) {
            this.displayItemTextEditor(item, x, y);
        },

        displayItemTextEditor(item, x, y) {
            const itemPoint = this.calculateItemLocalPoint(item, x, y);
            const shape = Shape.make(item.shape);
            const textEditArea = shape.identifyTextEditArea(item, itemPoint.x, itemPoint.y);

            item.meta.hiddenTextProperty = textEditArea.property;
            EventBus.emitItemChanged(item.id);
            if (!this.itemTextEditor.shown) {
                setTimeout(() => {
                    document.addEventListener('click', this.itemTextEditorOutsideClickListener);
                    const domElement = document.getElementById('item-text-editor');
                    if (domElement) {
                        domElement.focus();
                    }
                }, 50);
            }
            this.itemTextEditor.itemId = item.id;
            this.itemTextEditor.text = item[textEditArea.property];
            this.itemTextEditor.property = textEditArea.property;
            this.itemTextEditor.style = textEditArea.style;
            if (textEditArea.area) {
                this.itemTextEditor.area = textEditArea.area;
                this.itemTextEditor.area.x = item.area.x + textEditArea.area.x;
                this.itemTextEditor.area.y = item.area.y + textEditArea.area.y;
                this.itemTextEditor.area.w = textEditArea.area.w;
                this.itemTextEditor.area.h = textEditArea.area.h;
            } else {
                this.itemTextEditor.area.x = item.area.x;
                this.itemTextEditor.area.y = item.area.y;
                this.itemTextEditor.area.w = item.area.w;
                this.itemTextEditor.area.h = item.area.h;
            }
            this.itemTextEditor.shown = true;
        },

        itemTextEditorOutsideClickListener(event) {
            if (!this.hasParentNode(event.target, domElement => domElement.id === 'item-text-editor')) {
                document.removeEventListener('click', this.itemTextEditorOutsideClickListener);
                this.itemTextEditor.shown = false;
                const item = this.schemeContainer.findItemById(this.itemTextEditor.itemId);
                if (item) {
                    const domElement = document.getElementById('item-text-editor');
                    if (domElement) {
                        item[this.itemTextEditor.property] = domElement.innerHTML;
                    }
                    item.meta.hiddenTextProperty = null;
                    EventBus.emitItemChanged(item.id);
                }
            }
        },

        hasParentNode(domElement, callbackCheck) {
            if (callbackCheck(domElement)) {
                return true;
            };
            if (domElement.parentElement) {
                return this.hasParentNode(domElement.parentElement, callbackCheck);
            }
            return false;
        },

        // Converts world coordinates to item local coordinates (takes items rotation and translation into account)
        calculateItemLocalPoint(item, x, y) {
            // Rotating a world point around item center in the opposite direction
            // in order to align world coordinates with items coordinates
            const cos = Math.cos(-item.area.r * Math.PI / 180);
            const sin = Math.sin(-item.area.r * Math.PI / 180);

            const dx = x - item.area.x - item.area.w/2;
            const dy = y - item.area.y - item.area.h/2;

            const nx = dx * cos - dy * sin;
            const ny = dx * sin + dy * cos;

            // correcting item center since item position is defined by its top left corner
            return {
                x: nx + item.area.w / 2,
                y: ny + item.area.h / 2
            };
        },

        _x(x) { return x * this.vZoom + this.vOffsetX; },
        _y(y) { return y * this.vZoom + this.vOffsetY; },
        _z(v) { return v * this.vZoom; },
        x_(x) { return x / this.vZoom - this.vOffsetX; },
        y_(y) { return y / this.vZoom - this.vOffsetY; },
        z_(v) { return v / this.vZoom; }
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
        },
        offsetX(newOffsetX) {
            this.vOffsetX = parseInt(newOffsetX);
        },
        offsetY(newOffsetY) {
            this.vOffsetY = parseInt(newOffsetY);
        },
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
