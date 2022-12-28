<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div id="svg-editor" class="svg-editor">
        <svg :id="`svg-plot-${editorId}`" ref="svgDomElement"
            class="svg-editor-plot"
            :class="cssClass"
            :style="{background: schemeContainer.scheme.style.backgroundColor}"
            @mousemove="mouseMove"
            @touchstart="touchStart"
            @touchend="touchEnd"
            @touchmove="touchMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp"
            @dblclick="mouseDoubleClick"
            @dragenter="onDragEnter"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            data-void="true"
            oncontextmenu="return false;">

            <g v-if="mode === 'view' && schemeContainer">
                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems" class="item-container"
                        v-if="item.visible && item.shape !== 'hud'"
                        :class="'item-cursor-' + item.cursor">
                        <ItemSvg
                            :key="`${item.id}-${item.shape}-${textSelectionEnabled}`"
                            :item="item"
                            :editorId="editorId"
                            :mode="mode"
                            :textSelectionEnabled="textSelectionEnabled"
                            :patchIndex="patchIndex"
                            @custom-event="onItemCustomEvent"
                            @frame-animator="onFrameAnimatorEvent" />
                    </g>
                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" fill="none" :stroke="item.stroke"
                            :stroke-width="`${item.strokeSize + 6/(item.scalingFactor*safeZoom)}px`"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            data-preview-ignore="true"/>
                    </g>
                    <g data-preview-ignore="true" v-if="showClickableMarkers">
                        <circle v-for="marker in clickableItemMarkers"
                            v-if="marker.visible"
                            class="clickable-item-marker"
                            :cx="marker.x" :cy="marker.y"
                            :r="5 / safeZoom"
                            :data-item-id="marker.itemId"
                            :stroke="schemeContainer.scheme.style.itemMarkerColor"
                            :fill="schemeContainer.scheme.style.itemMarkerColor"/>
                    </g>
                </g>

                <g v-for="link, linkIndex in selectedItemLinks" data-preview-ignore="true">
                    <a :id="`item-link-${linkIndex}`" class="item-link" @click="onSvgItemLinkClick(link.url, arguments[0])" :xlink:href="linksAnimated ? '#' : link.url">
                        <circle :cx="link.x" :cy="link.y" :r="12" :stroke="linkPalette[linkIndex % linkPalette.length]" :fill="linkPalette[linkIndex % linkPalette.length]"/>
                        <text class="item-link-icon" :class="['link-icon-' + link.type]"
                            :x="link.x - 6"
                            :y="link.y + 5"
                            :font-size="13 + 'px'"
                            :title="link.title"
                            >{{link.shortTitle}}</text>

                        <foreignObject :x="link.x + 16" :y="link.y - 11" :width="link.width" :height="link.height">
                            <span class="item-link-title">{{link | formatLinkTitle}}</span>
                        </foreignObject>
                    </a>
                </g>

                <g>
                    <g v-for="hud in schemeContainer.hudItems" v-if="hud.visible" :transform="createHUDTransform(hud)"
                        :style="{'opacity': hud.opacity/100.0, 'mix-blend-mode': hud.blendMode}"
                        >
                        <ItemSvg
                            v-for="item in hud.childItems"
                            v-if="item.visible"
                            :key="`${item.id}-${item.shape}-${textSelectionEnabled}`"
                            :item="item"
                            :editorId="editorId"
                            :textSelectionEnabled="textSelectionEnabled"
                            :patchIndex="patchIndex"
                            :mode="mode"
                            @custom-event="onItemCustomEvent"
                            @frame-animator="onFrameAnimatorEvent"/>
                    </g>
                </g>

            </g>


            <!--  EDIT MODE -->

            <g v-if="mode === 'edit'">
                <g class="grid" data-preview-ignore="true" :transform="gridTransform" data-void="true">
                    <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height + 2 * gridStep"
                        :stroke="schemeContainer.scheme.style.gridColor"
                        :class="{'grid-line-zero': index === gridCount.x0}"
                        data-void="true"
                    />
                    <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width + 2 * gridStep" :y2="index * gridStep"
                        :stroke="schemeContainer.scheme.style.gridColor"
                        :class="{'grid-line-zero': index === gridCount.y0}"
                        data-void="true"
                    />
                </g>

                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems"
                        v-if="item.visible"
                        class="item-container"
                        :class="'item-cursor-'+item.cursor">
                        <ItemSvg
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :editorId="editorId"
                            :patchIndex="patchIndex"
                            :mode="mode"
                            />
                    </g>

                    <g v-if="schemeContainer.activeBoundaryBox" data-preview-ignore="true">
                        <!-- Drawing boundary edit box -->
                        <rect class="boundary-box"
                            :stroke="schemeContainer.scheme.style.boundaryBoxColor"
                            :x="schemeContainer.activeBoundaryBox.x"
                            :y="schemeContainer.activeBoundaryBox.y"
                            :width="schemeContainer.activeBoundaryBox.w"
                            :height="schemeContainer.activeBoundaryBox.h"
                        />
                    </g>


                    <slot name="scene-transform"></slot>


                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" fill="none" :stroke="item.stroke"
                            :stroke-width="`${item.strokeSize + 6/(item.scalingFactor*safeZoom)}px`"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            stroke-linejoin="round"
                            data-preview-ignore="true"/>
                        <circle v-for="pin in item.pins" :cx="pin.x" :cy="pin.y" :r="8/(item.scalingFactor*safeZoom)" style="opacity:0.5" data-preview-ignore="true" :fill="item.stroke"/>
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

                <line v-if="horizontalSnapper" :x1="0" :y1="_y(horizontalSnapper.value)" :x2="width" :y2="_y(horizontalSnapper.value)" style="stroke: red; opacity: 0.4; stroke-width: 1px;"/>
                <line v-if="verticalSnapper" :x1="_x(verticalSnapper.value)" :y1="0" :x2="_x(verticalSnapper.value)" :y2="height" style="stroke: red; opacity:0.4; stroke-width: 1px;"/>

                <rect class="state-hover-layer" v-if="stateLayerShown"  x="0" y="0" :width="width" :height="height" fill="rgba(255, 255, 255, 0.0)"/>
            </g>
        </svg>

        <slot name="overlay"></slot>
    </div>
</template>

<script>
import map from 'lodash/map';
import max from 'lodash/max';
import forEach from 'lodash/forEach';
import find from 'lodash/find';

import '../../typedef';

import myMath from '../../myMath';
import {ItemInteractionMode, defaultItem, traverseItems, hasItemDescription} from '../../scheme/Item';
import {enrichItemWithDefaults} from '../../scheme/ItemFixer';
import ItemSvg from './items/ItemSvg.vue';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer, { itemCompleteTransform, worldScalingVectorOnItem } from '../../scheme/SchemeContainer.js';
import Compiler from '../../userevents/Compiler.js';
import Shape from './items/shapes/Shape';
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import Events from '../../userevents/Events';
import StoreUtils from '../../store/StoreUtils';
import { COMPONENT_LOADED_EVENT, COMPONENT_FAILED } from './items/shapes/Component.vue';
import EditorEventBus from './EditorEventBus';

const EMPTY_OBJECT = {type: 'void'};
const LINK_FONT_SYMBOL_SIZE = 10;

const behaviorCompiler = new Compiler();

/**
 * This variable is used for storing the last known position of mouse cursor
 * The reason this is needed is because some items handle click event themselves.
 * Because of this the position of the mouse is not available.
 * But the mouse position is needed to render item tooltip.
 * That is why these coords get updated on each mouse move and click event inside SvgEditor component.
 */
const lastMousePosition = {
    x: 0,
    y: 0
};

export default {
    props: {
        editorId            : {type: String, required: true},
        mode                : { type: String, default: 'edit' },
        textSelectionEnabled: {type: Boolean, default: false},
        stateLayerShown     : { type: Boolean, default: false},
        userEventBus        : { type: Object, default: null},
        patchIndex          : { type: Object, default: null},
        highlightedItems    : { type: Object, default: null},

        /** @type {SchemeContainer} */
        schemeContainer : { default: null, type: Object },
        zoom            : { default: 1.0, type: Number },
        useMouseWheel   : { default: true, type: Boolean}
    },

    components: { ItemSvg },
    beforeMount() {
        if (this.mode === 'view') {
            StoreUtils.setShowClickableMarkers(this.$store, this.schemeContainer.scheme.style.itemMarkerToggled);
            this.buildClickableItemMarkers();
            this.reindexUserEvents();
            this.prepareFrameAnimations();
        }

        EditorEventBus.zoomToAreaRequested.$on(this.editorId, this.onBringToView);
        EditorEventBus.item.linksShowRequested.any.$on(this.editorId, this.onShowItemLinks);

        EditorEventBus.item.clicked.any.$on(this.editorId, this.onAnyItemClicked);

        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        EditorEventBus.void.doubleClicked.$on(this.editorId, this.onVoidDoubleClicked);

        EditorEventBus.item.selected.any.$on(this.editorId, this.onAnyItemSelected);

        EditorEventBus.component.mounted.any.$on(this.editorId, this.onComponentSchemeMounted);
        EditorEventBus.component.loadFailed.any.$on(this.editorId, this.onComponentLoadFailed);

        EditorEventBus.framePlayer.prepared.$on(this.editorId, this.onFramePlayerPrepared);
        EditorEventBus.clickableMarkers.toggled.$on(this.editorId, this.updateClickableMarkers);
    },
    mounted() {
        this.updateSvgSize();
        window.addEventListener("resize", this.updateSvgSize);

        if (this.useMouseWheel) {
            var svgElement = this.$refs.svgDomElement;
            if (svgElement) {
                svgElement.addEventListener('wheel', this.mouseWheel);
            }
        }

        if (this.mode === 'view') {
            forEach(this.itemsForInit, (val, itemId) => {
                this.userEventBus.emitItemEvent(itemId, Events.standardEvents.init.id);
            });
        }
    },
    beforeDestroy(){
        window.removeEventListener("resize", this.updateSvgSize);
        this.mouseEventsEnabled = false;
        EditorEventBus.zoomToAreaRequested.$off(this.editorId, this.onBringToView);
        EditorEventBus.item.linksShowRequested.any.$off(this.editorId, this.onShowItemLinks);

        EditorEventBus.item.clicked.any.$off(this.editorId, this.onAnyItemClicked);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        EditorEventBus.void.doubleClicked.$off(this.editorId, this.onVoidDoubleClicked);

        EditorEventBus.item.selected.any.$off(this.editorId, this.onAnyItemSelected);

        EditorEventBus.component.mounted.any.$off(this.editorId, this.onComponentSchemeMounted);
        EditorEventBus.component.loadFailed.any.$off(this.editorId, this.onComponentLoadFailed);

        EditorEventBus.framePlayer.prepared.$off(this.editorId, this.onFramePlayerPrepared);
        EditorEventBus.clickableMarkers.toggled.$off(this.editorId, this.updateClickableMarkers);

        if (this.useMouseWheel) {
            const svgElement = this.$refs.svgDomElement;
            if (svgElement) {
                svgElement.removeEventListener('wheel', this.mouseWheel);
            }
        }
    },
    data() {
        return {
            mouseEventsEnabled: !(this.mode === 'view' && this.textSelectionEnabled),
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],

            // the following two properties are going to be updated in mounted hook
            width: window.innerWidth,
            height: window.innerHeight,

            selectedItemLinks: [],
            // this flag is used in order to make links non-clickable while they are animated.
            // in mobile devices a click is registered when links are rendered under the thumb.
            linksAnimated: false,
            lastHoveredItem: null,

            // ids of items that have subscribed for Init event
            itemsForInit: {},

            // array of markers for items that are clickable
            clickableItemMarkers: [],

            worldHighlightedItems: [ ],

        };
    },
    methods: {
        updateSvgSize() {
            if (!this.$refs.svgDomElement) {
                return;
            }
            const svgRect = this.$refs.svgDomElement.getBoundingClientRect();
            this.width = svgRect.width;
            this.height = svgRect.height;

            this.schemeContainer.screenSettings.width = svgRect.width;
            this.schemeContainer.screenSettings.height = svgRect.height;
            this.$emit('svg-size-updated', {
                width: this.width,
                height: this.height
            });
        },

        mouseCoordsFromEvent(event) {
            if (event.touches) {
                if (event.touches.length > 0) {
                    return this.mouseCoordsFromPageCoords(event.touches[0].pageX, event.touches[0].pageY);
                } else if (event.changedTouches.length > 0) {
                    return this.mouseCoordsFromPageCoords(event.changedTouches[0].pageX, event.changedTouches[0].pageY);
                }
            } else {
                return this.mouseCoordsFromPageCoords(event.pageX, event.pageY);
            }
            return null;
        },

        mouseCoordsFromPageCoords(pageX, pageY) {
            var rect = this.$refs.svgDomElement.getBoundingClientRect(),
                offsetX = pageX - rect.left,
                offsetY  = pageY - rect.top;

            return {
                x: Math.round(offsetX),
                y: Math.round(offsetY)
            }
        },

        identifyElement(element, point) {
            if (element) {
                const elementType = element.getAttribute('data-type');
                if (elementType === 'path-segment') {
                    return {
                        type: elementType,
                        pathIndex: parseInt(element.getAttribute('data-path-index')),
                        segmentIndex: parseInt(element.getAttribute('data-path-segment-index')),
                    };
                } else if (elementType === 'path-point') {
                    return {
                        type: elementType,
                        pointIndex: parseInt(element.getAttribute('data-path-point-index')),
                        pathIndex: parseInt(element.getAttribute('data-path-index'))
                    };
                } else if (elementType === 'path-control-point') {
                    return {
                        type: elementType,
                        pointIndex: parseInt(element.getAttribute('data-path-point-index')),
                        pathIndex: parseInt(element.getAttribute('data-path-index')),
                        controlPointIndex: parseInt(element.getAttribute('data-path-control-point-index'))
                    };
                } else if (elementType === 'multi-item-edit-box'
                        || elementType === 'multi-item-edit-box-rotational-dragger'
                        || elementType === 'multi-item-edit-box-pivot-dragger'
                        || elementType === 'multi-item-edit-box-reset-image-crop-link') {
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBox
                    };
                } else if (elementType === 'multi-item-edit-box-resize-dragger') {
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBox,
                        draggerEdges: map(element.getAttribute('data-dragger-edges').split(','), edge => edge.trim())
                    };
                }

                const itemId = element.getAttribute('data-item-id');
                if (itemId) {
                    const item = this.schemeContainer.findItemById(itemId);
                    if (item) {
                        return {
                            type: 'item',
                            item
                        };
                    }
                }

                const connectorStarterItemId = element.getAttribute('data-connector-starter-item-id');
                if (connectorStarterItemId) {
                    const item = this.schemeContainer.findItemById(connectorStarterItemId);
                    if (item) {
                        return {
                            type: 'connection-starter',
                            connectorStarter: {
                                item,
                                point
                            }
                        };
                    }
                }
                const controlPointId = element.getAttribute('data-control-point-id');
                if (controlPointId) {
                    const item = this.schemeContainer.findItemById(element.getAttribute('data-control-point-item-id'));
                    if (item) {
                        return {
                            type: 'control-point',
                            controlPoint: {
                                pointId: controlPointId,
                                item
                            }
                        };
                    }
                }

                const textContainerElement = element.closest('.item-text-element');
                if (textContainerElement) {
                    const item = this.schemeContainer.findItemById(textContainerElement.getAttribute('data-item-text-element-item-id'));
                    if (item) {
                        return {
                            type: 'item-text-element',
                            itemTextElement: { item }
                        };
                    }
                }
            }
            return EMPTY_OBJECT;
        },

        mouseWheel(event) {
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);
            this.$emit('mouse-wheel', p.x, p.y, coords.x, coords.y, event);
        },

        touchStart(event) {
            this.mouseEvent('mouse-down', event);
        },
        touchEnd(event) {
            this.mouseEvent('mouse-up', event);
        },
        touchMove(event) {
            this.mouseEvent('mouse-move', event);
        },

        mouseMove(event) {
            this.mouseEvent('mouse-move', event);
        },
        mouseDown(event) {
            this.mouseEvent('mouse-down', event);
        },
        mouseUp(event) {
            this.mouseEvent('mouse-up', event);
        },
        mouseDoubleClick(event) {
            this.mouseEvent('mouse-double-click', event);
        },

        mouseEvent(eventName, event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);
                lastMousePosition.x = coords.x;
                lastMousePosition.y = coords.y;
                this.$emit(eventName, p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
            }
        },

        buildClickableItemMarkers() {
            const markers = [];

            const traverseVisibleItems = (itemArray, callback) => {
                if (!itemArray || !Array.isArray(itemArray)) {
                    return;
                }
                itemArray.forEach(item => {
                    if (item.visible && item.opacity > 0 && item.selfOpacity > 0) {
                        callback(item);

                        traverseVisibleItems(item.childItems, callback);
                        traverseVisibleItems(item._childItems, callback);
                    }
                });
            };

            traverseVisibleItems(this.schemeContainer.worldItems, item => {
                const hasItemLinks = item.links && item.links.length > 0;
                const hasItemClickEvents = find(item.behavior.events, event => event.event === Events.standardEvents.clicked.id);

                if (hasItemDescription(item) || hasItemLinks || hasItemClickEvents) {
                    const box = this.schemeContainer.getBoundingBoxOfItems([item]);
                    markers.push({
                        x: box.x + box.w,
                        y: box.y,
                        itemId: item.id,
                        visible: true
                    });
                }
            });
            this.clickableItemMarkers = markers;
        },

        updateClickableMarkers() {
            if (this.mode === 'view') {
                this.buildClickableItemMarkers();
                this.$forceUpdate();
            }
        },

        highlightItems(itemIds, showPins) {
            this.worldHighlightedItems = [];

            forEach(itemIds, itemId => {
                const item = this.schemeContainer.findItemById(itemId);
                if (!item) {
                    return;
                }

                const shape = Shape.find(item.shape);
                if (!shape) {
                    return;
                }

                const path = shape.computeOutline(item);
                if (!path) {
                    return;
                }

                const m = itemCompleteTransform(item);
                const scalingVector = worldScalingVectorOnItem(item);

                let scalingFactor = Math.max(scalingVector.x, scalingVector.y);
                if (myMath.tooSmall(scalingFactor)) {
                    scalingFactor = 1;
                }

                let fill = this.schemeContainer.scheme.style.boundaryBoxColor;
                let strokeSize = 6;
                if (item.shape === 'path') {
                    strokeSize = item.shapeProps.strokeSize;
                    if (item.shapeProps.fill.type === 'none' && !item.shapeProps.closed) {
                        fill = 'none';
                    }
                } else {
                    const shape = Shape.find(item.shape);
                    if (Shape.getShapePropDescriptor(shape, 'strokeSize')) {
                        strokeSize = item.shapeProps.strokeSize;
                    }
                }



                const itemHighlight = {
                    id: itemId,
                    transform: `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`,
                    path,
                    fill,
                    strokeSize,
                    stroke: this.schemeContainer.scheme.style.boundaryBoxColor,
                    pins: [],
                    scalingFactor
                };

                if (showPins) {
                    itemHighlight.pins = shape.getPins(item);
                }

                this.worldHighlightedItems.push(itemHighlight);
            });
        },

        reindexUserEvents() {
            if (this.userEventBus) {
                this.userEventBus.clear();
                this.indexUserEventsInItems(this.schemeContainer.scheme.items, this.itemsForInit);
            }
        },

        /**
         *
         * @param {Array} items
         * @param {Object} itemsForInit - used for collecting items that have subscribed for init event
         */
        indexUserEventsInItems(items, itemsForInit) {
            forEach(items, rootItem => {
                traverseItems(rootItem, item => {
                    if (item.behavior && item.behavior.events) {
                        forEach(item.behavior.events, event => {
                            const eventCallback = behaviorCompiler.compileActions(this.schemeContainer, item, event.actions);

                            if (event.event === Events.standardEvents.init.id) {
                                itemsForInit[item.id] = 1;
                            }
                            this.userEventBus.subscribeItemEvent(item.id, event.event, eventCallback);
                        });
                    }
                });
            });
        },

        onComponentSchemeMounted(item) {
            if (item._childItems) {
                const componentItemsForInit = {};
                this.indexUserEventsInItems(item._childItems, componentItemsForInit);
                forEach(componentItemsForInit, (val, itemId) => {
                    this.userEventBus.emitItemEvent(itemId, Events.standardEvents.init.id);
                });
            }
            if (item.shape === 'component' && this.userEventBus) {
                this.userEventBus.emitItemEvent(item.id, COMPONENT_LOADED_EVENT);
            }
        },

        onComponentLoadFailed(item) {
            if (item.shape === 'component' && this.userEventBus) {
                this.userEventBus.emitItemEvent(item.id, COMPONENT_FAILED);
            }
        },

        /**
         * Compiles animations for all frame players in the scheme so that they could be played in view mode
         */
        prepareFrameAnimations() {
            this.schemeContainer.prepareFrameAnimations();
        },

        onFramePlayerPrepared(item, frameCallbacks) {
            if (this.mode !== 'view') {
                return;
            }

            const frameAnimation = this.schemeContainer.getFrameAnimation(item.id);
            if (!frameAnimation) {
                return;
            }

            frameAnimation.setCallbacks(frameCallbacks);
        },

        onFrameAnimatorEvent(args) {
            if (this.mode !== 'view') {
                return;
            }
            const itemId = args.item.id;
            const frameAnimation = this.schemeContainer.getFrameAnimation(itemId);
            if (!frameAnimation) {
                return;
            }

            if (args.operation === 'play') {
                frameAnimation.setCallbacks(args.callbacks);
                frameAnimation.setFrame(args.frame);
                if (args.stopFrame) {
                    frameAnimation.setStopFrame(args.stopFrame);
                } else {
                    frameAnimation.setStopFrame(-1);
                }
                playInAnimationRegistry(this.editorId, frameAnimation, itemId, 'frame-player');

            } else if (args.operation === 'setFrame') {
                frameAnimation.toggleFrame(args.frame);

            } else if (args.operation === 'stop') {
                frameAnimation.stop();
            }
        },


        onSvgItemLinkClick(url, event) {
            if (url.startsWith('/') && !this.linksAnimated) {
                window.location = url;
                event.preventDefault();
            }
            return false;
        },

        onShowItemLinks(item) {
            if (this.mode === 'view') {
                this.selectedItemLinks = this.generateItemLinks(item);
                this.$nextTick(() => {
                    //readjusting links width and height
                    forEach(this.selectedItemLinks, (link, index) => {
                        const domLinkTitle = document.querySelector(`#item-link-${index} span.item-link-title`);
                        if (domLinkTitle) {
                            const bbRect = domLinkTitle.getBoundingClientRect();
                            link.width = bbRect.width;
                            link.height = bbRect.height;
                        }
                    });
                });
                this.startLinksAnimation();
            }
        },

        onAnyItemClicked(item) {
            this.removeDrawnLinks();
            this.resetHighlightedItems();
        },

        onAnyItemSelected() {
            this.resetHighlightedItems();
        },

        resetHighlightedItems() {
            if (this.worldHighlightedItems.length > 0) {
                this.worldHighlightedItems = [];
            }
        },

        onVoidClicked() {
            this.removeDrawnLinks();
        },

        onVoidDoubleClicked(x, y, mx, my) {
            if (this.mode === 'edit') {
                const textItem = utils.clone(defaultItem);
                textItem.name = this.schemeContainer.copyNameAndMakeUnique('Label');
                textItem.textSlots = {
                    body: {
                        text  : '',
                        halign: 'left',
                        valign: 'top',
                        paddingLeft: 0,
                        paddingRight: 0,
                        paddingTop: 0,
                        paddingBottom: 0
                    }
                };
                textItem.shape = 'none';
                textItem.area = {x, y, w: 40, h: 40};
                enrichItemWithDefaults(textItem);
                this.schemeContainer.addItem(textItem);
                this.$nextTick(() => {
                    EditorEventBus.textSlot.triggered.specific.$emit(this.editorId, textItem, 'body', {
                        x: 0, y: 0, w: textItem.area.w, h: textItem.area.h
                    }, false, true);
                });
            }
        },

        removeDrawnLinks() {
            if (this.selectedItemLinks.length > 0) {
                this.selectedItemLinks = [];
            }
        },

        onBringToView(area, animated) {
            let newZoom = 1.0;
            if (area.w > 0 && area.h > 0 && this.width - 400 > 0 && this.height > 0) {
                newZoom = Math.floor(100.0 * Math.min(this.width/area.w, (this.height)/area.h)) / 100.0;
                newZoom = Math.max(0.0001, newZoom);
            }

            if (newZoom > 0.7 && newZoom < 1) {
                newZoom = 1;
            }

            const oldX = this.schemeContainer.screenTransform.x;
            const oldY = this.schemeContainer.screenTransform.y;
            const oldZoom = this.schemeContainer.screenTransform.scale;

            const destX = this.width/2 - (area.x + area.w/2) * newZoom;
            const destY = (this.height)/2 - (area.y + area.h/2) *newZoom;

            if (animated) {
                playInAnimationRegistry(this.editorId, new ValueAnimation({
                    durationMillis: 400,
                    animationType: 'ease-out',
                    update: (t) => {
                        this.schemeContainer.screenTransform.scale = (oldZoom * (1.0 - t) + newZoom * t);
                        this.schemeContainer.screenTransform.x = oldX * (1.0 - t) + destX * t;
                        this.schemeContainer.screenTransform.y = oldY * (1.0 - t) + destY * t;
                    },
                    destroy: () => {
                        this.informUpdateOfScreenTransform(this.schemeContainer.screenTransform);
                    }
                }), 'screen', 'screen-tansform');
            } else {
                this.schemeContainer.screenTransform.scale = newZoom;
                this.schemeContainer.screenTransform.x = destX;
                this.schemeContainer.screenTransform.y = destY;
                this.informUpdateOfScreenTransform(this.schemeContainer.screenTransform);
            }
        },

        startLinksAnimation() {
            this.linksAnimated = true;
            playInAnimationRegistry(this.editorId, new ValueAnimation({
                durationMillis: 300,

                update: (t) => {
                    forEach(this.selectedItemLinks, link => {
                        link.x = link.startX * (1.0 - t) + link.destinationX * t;
                        link.y = link.startY * (1.0 - t) + link.destinationY * t;
                    });
                },

                destroy: () => {
                    this.linksAnimated = false;
                }
            }), 'screen', 'links-animation');
        },

        generateItemLinks(item) {
            if (item.links && item.links.length > 0) {
                const worldPointCenter = this.schemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
                let cx = this._x(worldPointCenter.x);
                let cy = this._y(worldPointCenter.y);
                let startX = cx;
                let startY = cy;

                if (cy > this.height - 100 || cy < 100) {
                    cy = this.height / 4;
                }

                let step = Math.max(20, Math.min(40, this.height / (item.links.length + 1)));
                let y0 = cy - item.links.length * step / 2;
                const worldPointRight = this.schemeContainer.worldPointOnItem(item.area.w, 0, item);
                let destinationX = this._x(worldPointRight.x) + 10;
                if (this.width - destinationX < 300) {
                    destinationX = Math.max(10, this.width - 300);
                }

                // perhaps not the best way to handle this, but for now this trick should do
                // drive app uses different type of router and therefor we need to adjust the url so that it can properly reference other diagrams
                const convertLinkUrl = link => {
                    if (link.type === 'doc' && link.url && link.url.startsWith('/docs/') && this.$router && this.$router.mode !== 'history') {
                        return '#' + link.url;
                    }
                    return link.url;
                }

                return map(item.links, (link, index) => {
                    return {
                        url: convertLinkUrl(link),
                        type: link.type,
                        shortTitle: this.getFontAwesomeSymbolForLink(link),
                        title: link.title,
                        x: cx,
                        y: cy,
                        startX,
                        startY,
                        destinationX,
                        destinationY: y0 + step * index,
                        width: 1000,
                        height: 30
                    };
                });
            }
            return [];
        },


        informUpdateOfScreenTransform(screenTransform) {
            this.$emit('screen-transform-updated', screenTransform);
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

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
            };
        },

        onItemCustomEvent(event) {
            if (event.eventName === 'clicked') {
                // handling links and toolip/side-panel appearance
                const item = this.schemeContainer.findItemById(event.itemId);
                if (item.links && item.links.length > 0) {
                    this.onShowItemLinks(item);
                }
                if (item.description.trim().length > 8) {
                    if (item.interactionMode === ItemInteractionMode.SIDE_PANEL) {
                        this.$emit('item-side-panel-requested', item);
                    } else if (item.interactionMode === ItemInteractionMode.TOOLTIP) {
                        this.$emit('item-tooltip-requested', item, lastMousePosition.x, lastMousePosition.y);
                    }
                }
            }

            if (this.userEventBus) {
                this.userEventBus.emitItemEvent(event.itemId, event.eventName);
            }
        },

        /**
         * Generates transform for HUD item so that it is rendered in correct position in view mode
         */
        createHUDTransform(hud) {
            let x = 0;
            let y = 0;
            if (hud.shapeProps.horizontalPosition === 'left') {
                x = 0;
            } else if (hud.shapeProps.horizontalPosition === 'right') {
                x = this.width - hud.area.w;
            } else if (hud.shapeProps.horizontalPosition === 'center') {
                x = (this.width - hud.area.w) / 2;
            }

            if (hud.shapeProps.verticalPosition === 'top') {
                y = 0;
            } else if (hud.shapeProps.verticalPosition === 'bottom') {
                y = this.height - hud.area.h;
            } else if (hud.shapeProps.verticalPosition === 'center') {
                y = (this.height - hud.area.h) / 2;
            }return `translate(${x} ${y})`;
        },


        onDragEnter(event) {
            event.preventDefault();
            event.stopPropagation();
        },
        onDragOver(event) {
            event.preventDefault();
            event.stopPropagation();
        },
        onDragLeave(event) {
            event.preventDefault();
            event.stopPropagation();
        },

        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },

        //TODO apparently something is off if the formula is identical to conversion from world to screen. This needs to be investigated
        //calculates from screen to world
        x_(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        y_(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        z_(v) { return v * this.schemeContainer.screenTransform.scale; },

    },
    computed: {
        cssClass() {
            const css = ['mode-' + this.mode];
            if (!(this.mode === 'view' && this.textSelectionEnabled)) {
                css.push('text-nonselectable');
            }
            return css;
        },
        safeZoom() {
            if (this.schemeContainer.screenTransform.scale > 0.00001) {
                return this.schemeContainer.screenTransform.scale;
            }
            return 1.0;
        },

        transformSvg() {
            const x = Math.floor(this.schemeContainer.screenTransform.x || 0);
            const y = Math.floor(this.schemeContainer.screenTransform.y || 0);
            const scale = this.schemeContainer.screenTransform.scale || 1.0;
            return `translate(${x} ${y}) scale(${scale} ${scale})`;
        },
        gridStep() {
            const snapSize = myMath.getSnappingWidthForScale(this.schemeContainer.screenTransform.scale);
            return snapSize * this.schemeContainer.screenTransform.scale;
        },
        gridCount() {
            const snapSize = myMath.getSnappingWidthForScale(this.schemeContainer.screenTransform.scale);
            const screenStep = (snapSize * this.schemeContainer.screenTransform.scale);
            if (screenStep < 4) {
                return {
                    x: 0, y: 0, x0: 0, y0: 0
                };
            }

            const x = Math.ceil(this.width / screenStep) + 1;
            const y = Math.ceil(this.height / screenStep) + 1;


            const zSnap = snapSize * this.schemeContainer.screenTransform.scale;
            let dx = Math.ceil(this.schemeContainer.screenTransform.x % zSnap) - zSnap;
            let dy = Math.ceil(this.schemeContainer.screenTransform.y % zSnap) - zSnap;

            return {
                x, y,
                x0: Math.ceil((this._x(0) - dx) / screenStep),
                y0: Math.ceil((this._y(0) - dy)/ screenStep),
            };
        },
        gridTransform() {
            const snapSize = myMath.getSnappingWidthForScale(this.schemeContainer.screenTransform.scale);
            const zSnap = snapSize * this.schemeContainer.screenTransform.scale;
            let x = Math.ceil(this.schemeContainer.screenTransform.x % zSnap) - zSnap;
            let y = Math.ceil(this.schemeContainer.screenTransform.y % zSnap) - zSnap;
            return `translate(${x} ${y})`;
        },
        multiSelectBox() {
            return this.$store.getters.multiSelectBox;
        },
        horizontalSnapper() {
            return this.$store.getters.horizontalSnapper;
        },
        verticalSnapper() {
            return this.$store.getters.verticalSnapper;
        },

        shouldShowDropMask() {
            return this.$store.getters.isDraggingItemCreation;
        },

        showClickableMarkers() {
            return this.$store.getters.showClickableMarkers;
        },
    },
    filters: {
        formatLinkTitle(link) {
            if (link.title) {
                return link.title;
            } else {
                return link.url;
            }
        }
    },
    watch: {
        textSelectionEnabled(isEnabled) {
            this.mouseEventsEnabled = !(this.mode === 'view' && isEnabled);
            this.$forceUpdate();
        },

        highlightedItems(value) {
            this.highlightItems(value.itemIds, value.showPins);
        }
    }
}
</script>

<style lang="css">
</style>
