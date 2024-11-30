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
                            :key="`${item.id}-${item.shape}-${textSelectionEnabled}-${itemsReloadKey}`"
                            :item="item"
                            :editorId="editorId"
                            :mode="mode"
                            :textSelectionEnabled="textSelectionEnabled"
                            :patchIndex="patchIndex"
                            :eventListener="eventListenerInterceptor"
                            @frame-animator="onFrameAnimatorEvent" />
                    </g>
                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" :fill="item.fill" :stroke="item.stroke"
                            :stroke-width="`${item.strokeSize + 6/(item.scalingFactor*safeZoom)}px`"
                            :data-item-id="item.id"
                            :style="{opacity: item.opacity}"
                            data-preview-ignore="true"/>
                    </g>
                </g>

                <g v-for="link, linkIndex in selectedItemLinks" data-preview-ignore="true">
                    <a :id="`item-link-${linkIndex}`" class="item-link" @click="onSvgItemLinkClick(link.url, arguments[0])"
                        :xlink:href="linksAnimated ? '#' : link.url" target="_blank"
                        :title="link.title"
                        >
                        <circle :cx="link.x" :cy="link.y" :r="12" :stroke="linkPalette[linkIndex % linkPalette.length]" :fill="linkPalette[linkIndex % linkPalette.length]"/>

                        <foreignObject :x="link.x-7" :y="link.y - 6" :width="16" :height="16">
                            <div class="item-link-icon">
                                <i :class="link.iconClass"></i>
                            </div>
                        </foreignObject>

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
                            :key="`${item.id}-${item.shape}-${textSelectionEnabled}-${itemsReloadKey}`"
                            :item="item"
                            :editorId="editorId"
                            :textSelectionEnabled="textSelectionEnabled"
                            :patchIndex="patchIndex"
                            :mode="mode"
                            :eventListener="eventListenerInterceptor"
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

                <rect data-preview-ignore="true"
                    x="0"
                    y="0"
                    :width="width"
                    :height="height"
                    :fill="fileDropLayerFill"
                    @dragenter="onFileDragEnter"
                    @dragover="onFileDragOver"
                    @dragleave="onFileDragLeave"
                    @drop="onFileDrop"
                    />

                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems"
                        v-if="item.visible"
                        class="item-container"
                        :class="'item-cursor-'+item.cursor">
                        <ItemSvg
                            :key="`${item.id}-${item.shape}-${itemsReloadKey}`"
                            :item="item"
                            :editorId="editorId"
                            :patchIndex="patchIndex"
                            :mode="mode"
                            :eventListener="eventListenerInterceptor"
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
                        <path :d="item.path" :fill="item.fill" :stroke="item.stroke"
                            :stroke-width="`${item.strokeSize + 6/(item.scalingFactor*safeZoom)}px`"
                            :data-item-id="item.id"
                            :style="{opacity: item.opacity}"
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
import {forEach, map } from '../../collections';

import '../../typedef';

import myMath from '../../myMath';
import {defaultItem, traverseItemsConditionally} from '../../scheme/Item';
import {enrichItemWithDefaults} from '../../scheme/ItemFixer';
import ItemSvg from './items/ItemSvg.vue';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer  from '../../scheme/SchemeContainer.js';
import { calculateScreenTransformForArea, calculateZoomingAreaForItems, itemCompleteTransform, worldScalingVectorOnItem } from '../../scheme/ItemMath.js';
import Shape from './items/shapes/Shape';
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import Events from '../../userevents/Events';
import StoreUtils from '../../store/StoreUtils';
import { COMPONENT_FAILED, computeButtonPath } from './items/shapes/Component.vue';
import EditorEventBus from './EditorEventBus';
import {ObjectTypes} from './ObjectTypes';
import { parseExpression } from '../../templater/ast.js';
import { createMainScriptScope } from '../../userevents/functions/ScriptFunction.js';
import { KeyBinder } from './KeyBinder.js';
import { loadAndMountExternalComponent } from './Component.js';

const EMPTY_OBJECT = {type: 'void'};
const LINK_FONT_SYMBOL_SIZE = 10;

// milliseconds between mouse down events that should trigger double click event
const DOUBLE_CLICK_REACTION_MILLIS = 400;

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
        zoomedItems         : { type: Array, default: null},
        // hack that is used in order to trigger zooming of items from parent component without using event bus
        zoomToItemsTrigger  : { type: String, default: null},

        /** @type {SchemeContainer} */
        schemeContainer : { default: null, type: Object },
        zoom            : { default: 1.0, type: Number },
        useMouseWheel   : { default: true, type: Boolean},

        // used to reload item svg components when scheme is rebased
        itemsReloadKey  : { default: 0, type: Number },
    },

    components: { ItemSvg },
    beforeMount() {
        if (this.mode === 'view') {
            this.loadUserKeyBinders();
            this.reindexUserEvents();
            this.prepareFrameAnimations();

            const initScriptSource = this.schemeContainer.scheme.scripts.main.source;
            if (initScriptSource) {
                try {
                    this.compiledMainScript = parseExpression(initScriptSource);
                } catch(ex) {
                    this.compiledMainScript = null;
                    console.error(ex);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to compile main script', 'main-script-compilation-error');
                }
            }
        }

        EditorEventBus.zoomToAreaRequested.$on(this.editorId, this.onBringToView);
        EditorEventBus.item.linksShowRequested.any.$on(this.editorId, this.onShowItemLinks);

        EditorEventBus.item.clicked.any.$on(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$on(this.editorId, this.onAnyItemChanged);

        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        EditorEventBus.void.doubleClicked.$on(this.editorId, this.onVoidDoubleClicked);

        EditorEventBus.item.selected.any.$on(this.editorId, this.onAnyItemSelected);

        EditorEventBus.component.loadFailed.any.$on(this.editorId, this.onComponentLoadFailed);

        EditorEventBus.framePlayer.prepared.$on(this.editorId, this.onFramePlayerPrepared);
        EditorEventBus.clickableMarkers.toggled.$on(this.editorId, this.toggleClickableMarkers);

        EditorEventBus.editorResized.$on(this.editorId, this.updateSvgSize);
        EditorEventBus.component.loadRequested.any.$on(this.editorId, this.onComponentLoadRequested);
    },

    mounted() {
        this.updateSvgSize();
        window.addEventListener("resize", this.updateSvgSize);
        window.addEventListener('message', this.onExternalMessage, false);

        if (this.useMouseWheel) {
            var svgElement = this.$refs.svgDomElement;
            if (svgElement) {
                svgElement.addEventListener('wheel', this.mouseWheel);
            }
        }

        if (this.mode === 'view') {
            if (this.compiledMainScript && this.userEventBus) {
                try {
                    const scope = createMainScriptScope(this.schemeContainer, this.userEventBus);
                    this.compiledMainScript.evalNode(scope);
                    this.schemeContainer.mainScopeData = scope.data;
                } catch(ex) {
                    console.error(ex);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to execute main script', 'main-script-failure');
                }
            }

            forEach(this.itemsForInit, (itemId) => {
                this.userEventBus.emitItemEvent(itemId, Events.standardEvents.init.id);
            });
        }
    },

    beforeDestroy(){
        this.highlightAnimated = true;
        window.removeEventListener('message', this.onExternalMessage);
        window.removeEventListener("resize", this.updateSvgSize);
        this.mouseEventsEnabled = false;
        EditorEventBus.zoomToAreaRequested.$off(this.editorId, this.onBringToView);
        EditorEventBus.item.linksShowRequested.any.$off(this.editorId, this.onShowItemLinks);

        EditorEventBus.item.clicked.any.$off(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$off(this.editorId, this.onAnyItemChanged);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        EditorEventBus.void.doubleClicked.$off(this.editorId, this.onVoidDoubleClicked);

        EditorEventBus.item.selected.any.$off(this.editorId, this.onAnyItemSelected);

        EditorEventBus.component.loadFailed.any.$off(this.editorId, this.onComponentLoadFailed);

        EditorEventBus.framePlayer.prepared.$off(this.editorId, this.onFramePlayerPrepared);
        EditorEventBus.clickableMarkers.toggled.$off(this.editorId, this.toggleClickableMarkers);

        EditorEventBus.editorResized.$off(this.editorId, this.updateSvgSize);
        EditorEventBus.component.loadRequested.any.$off(this.editorId, this.onComponentLoadRequested);

        if (this.mode === 'view') {
            this.destroyUserKeyBinders();
        }

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
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#226D18', '#6A590E', '#0F8989', '#7B245B'],


            lastClickPoint: null,
            // setting last click time to -1000 as performance.now() returns 0 when the page just loaded
            // because of this it might register a double click when user clicks immediatelly after page loaded
            doubleClickLastTime: -1000,

            // the following two properties are going to be updated in mounted hook
            width: window.innerWidth,
            height: window.innerHeight,

            selectedItemLinks: [],
            // this flag is used in order to make links non-clickable while they are animated.
            // in mobile devices a click is registered when links are rendered under the thumb.
            linksAnimated: false,
            lastHoveredItem: null,

            // ids of items that have subscribed for Init event
            itemsForInit: new Set(),

            // array of markers for items that are clickable
            clickableItemMarkers: [],

            worldHighlightedItems: [ ],
            lastTouchStartTime: 0,
            lastTouchStartCoords: {x: -1000, y: -1000},

            draggingFileOver: false,

            highlightAnimated : false,
            highlightAnimationTime: 0,

            compiledMainScript : null,

            keyBinder: new KeyBinder(this.userEventBus, this.schemeContainer),

            eventListenerInterceptor: {
                mouseDown: (event, componentItem) => {
                    this.onEventListenerInterceptorMouseEvent('mouse-down', event, componentItem);
                },
                mouseUp: (event, componentItem) => {
                    this.onEventListenerInterceptorMouseEvent('mouse-up', event, componentItem);
                },
                mouseMove: (event, componentItem) => {
                    this.onEventListenerInterceptorMouseEvent('mouse-move', event, componentItem);
                }
            }
        };
    },
    methods: {
        loadUserKeyBinders() {
            this.keyBinder.init();
            this.schemeContainer.getItems().forEach(item => {
                if (item.shape === 'key_bind') {
                    this.keyBinder.registerKeyBindItem(item);
                }
            });
        },

        destroyUserKeyBinders() {
            this.keyBinder.destroy();
        },

        /**
         * Triggered when user sends a message from outside (e.g. when Schemio player is loaded via iframe).
         * This could be used when Schemio player is embedded into some presentation (e.g. Reveal.js).
         * The user is supposed to send event like this
         *
         * 	document.getElementById('my-iframe').contentWindow.postMessage({
		 *		type: 'item-event',
		 *		name: 'GlobalFrameHandler',
		 *		event: 'My Frame event'
		 *	}, '*');
         * @param event
         */
        onExternalMessage(event) {
            if (this.mode !== 'view' || !this.userEventBus || typeof event.data !== 'object') {
                return;
            }
            if (event.data.type === 'item-event' && event.data.hasOwnProperty('name') && event.data.hasOwnProperty('event')) {
                const itemName = event.data.name;
                const eventName = event.data.event;
                const eventArgs = Array.isArray(event.data.args) ? event.data.args : [];
                const item = this.schemeContainer.findItemByName(itemName);
                if (!item) {
                    return;
                }

                this.userEventBus.emitItemEvent(item.id, eventName, ...eventArgs);
            }
        },

        /**
         * @param {Item} item
         */
        onComponentLoadRequested(item) {
            loadAndMountExternalComponent(this.schemeContainer, this.userEventBus, item, this.$store, this.onCompilerError)
            .then(() => {
                if (item.shape === 'component' && item.shapeProps.autoZoom) {
                    this.zoomToItems([item]);
                }
            });
        },

        zoomToItems(items) {
            if (items.length === 0) {
                if (this.schemeContainer.scheme.items.length === 0) {
                    this.schemeContainer.screenTransform.scale = 1;
                    this.schemeContainer.screenTransform.x = 0;
                    this.schemeContainer.screenTransform.y = 0;
                    this.informUpdateOfScreenTransform(this.schemeContainer.screenTransform);
                }
                return;
            }
            const area = calculateZoomingAreaForItems(items, this.mode);
            if (area) {
                this.onBringToView(area, true);
            }
        },

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
                } else if (elementType === 'edit-box'
                        || elementType === 'edit-box-template-control'
                        || elementType === 'edit-box-custom-control'
                        || elementType === 'edit-box-rotational-dragger'
                        || elementType === 'edit-box-pivot-dragger'
                        || elementType === 'edit-box-reset-image-crop-link'
                        || elementType === 'edit-box-context-menu-button') {
                    return {
                        type: elementType,
                        editBox: this.schemeContainer.editBox
                    };
                } else if (elementType === 'edit-box-resize-dragger') {
                    return {
                        type: elementType,
                        editBox: this.schemeContainer.editBox,
                        draggerEdges: map(element.getAttribute('data-dragger-edges').split(','), edge => edge.trim())
                    };
                } else if (elementType === 'custom-item-area') {
                    return {
                        type: elementType,
                        item: this.schemeContainer.findItemById(element.getAttribute('data-item-id')),
                        areaId: element.getAttribute('data-custom-area-id'),
                    };
                } else if (elementType === ObjectTypes.ITEM_DETAILS_MARKER) {
                    return {
                        type: elementType,
                        item: this.schemeContainer.findItemById(element.getAttribute('data-item-id')),
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
            const coords = this.mouseCoordsFromEvent(event);
            const p = this.toLocalPoint(coords.x, coords.y);
            this.$emit('mouse-wheel', p.x, p.y, coords.x, coords.y, event);
        },

        touchStart(event) {
            if (this.mouseEventsEnabled) {
                event.preventDefault();
            } else {
                return;
            }
            const coords = this.mouseCoordsFromEvent(event);
            const now = performance.now();

            const d = (coords.x - this.lastTouchStartCoords.x) * (coords.x - this.lastTouchStartCoords.x)
                + (coords.y - this.lastTouchStartCoords.y) * (coords.y - this.lastTouchStartCoords.y);
            if (now - this.lastTouchStartTime < 500 && d < 50) {
                this.mouseEvent('mouse-double-click', event);
            } else {
                this.mouseEvent('mouse-down', event);
            }
            this.lastTouchStartTime = now;
            this.lastTouchStartCoords = coords;
        },
        touchEnd(event) {
            if (this.mouseEventsEnabled) {
                event.preventDefault();
            } else {
                return;
            }
            this.mouseEvent('mouse-up', event);
        },
        touchMove(event) {
            if (this.mouseEventsEnabled) {
                event.preventDefault();
            } else {
                return;
            }
            this.mouseEvent('mouse-move', event);
        },

        mouseMove(event) {
            if (this.mouseEventsEnabled) {
                event.preventDefault();
            } else {
                return;
            }
            this.mouseEvent('mouse-move', event);
        },

        mouseDown(event) {
            let newClickTime = performance.now();
            // implementing own double click event hanlding
            // as for some reason the native dblclick event is not reliable
            let moveOffset = 0;
            if (this.lastClickPoint) {
                moveOffset = Math.abs(event.pageX - this.lastClickPoint.x) + Math.abs(event.pageY - this.lastClickPoint.y);
            }
            this.lastClickPoint = {x: event.pageX, y: event.pageY};

            const dt = newClickTime - this.doubleClickLastTime;
            if (event.button === 0 && moveOffset <= 2 && dt < DOUBLE_CLICK_REACTION_MILLIS) {
                this.doubleClickLastTime = 0;
                this.mouseDoubleClick(event);
            } else {
                if (event.button === 0) {
                    this.doubleClickLastTime = newClickTime;
                }
                this.mouseEvent('mouse-down', event);
            }
        },

        mouseUp(event) {
            this.mouseEvent('mouse-up', event);
        },

        mouseDoubleClick(event) {
            this.mouseEvent('mouse-double-click', event);
        },

        mouseEvent(eventName, event) {
            if (!this.mouseEventsEnabled) {
                return;
            }
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);
            lastMousePosition.x = coords.x;
            lastMousePosition.y = coords.y;
            this.$emit(eventName, p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
        },

        onEventListenerInterceptorMouseEvent(eventName, event, componentItem) {
            if (!this.mouseEventsEnabled) {
                return;
            }
            var coords = this.mouseCoordsFromEvent(event);
            var p = this.toLocalPoint(coords.x, coords.y);
            lastMousePosition.x = coords.x;
            lastMousePosition.y = coords.y;
            this.$emit(eventName, p.x, p.y, coords.x, coords.y, null, event, componentItem);
        },

        generateItemHighlight(item, showPins) {
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

            let strokeSize = 6;
            if (item.shape === 'path') {
                strokeSize = item.shapeProps.strokeSize;
            } else {
                const shape = Shape.find(item.shape);
                if (Shape.getShapePropDescriptor(shape, 'strokeSize')) {
                    strokeSize = item.shapeProps.strokeSize;
                }
            }
            const itemHighlight = {
                id: item.id,
                transform: `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`,
                path,
                fill: 'none',
                strokeSize,
                stroke: this.schemeContainer.scheme.style.boundaryBoxColor,
                pins: [],
                opacity: 0.5,
                scalingFactor
            };

            if (showPins) {
                itemHighlight.pins = shape.getPins(item);
            }
            return itemHighlight;
        },

        highlightItems(itemIds, showPins) {
            this.worldHighlightedItems = [];
            this.highlightAnimated = false;
            this.highlightAnimationTime = 0;

            forEach(itemIds, itemId => {
                const item = this.schemeContainer.findItemById(itemId);
                if (!item) {
                    return;
                }

                const itemHighlight = this.generateItemHighlight(item, showPins);
                this.worldHighlightedItems.push(itemHighlight);
            });
        },

        reindexUserEvents() {
            if (this.userEventBus) {
                this.userEventBus.clear();
                this.itemsForInit = this.schemeContainer.indexUserEvents(this.userEventBus, (err) => {
                    this.onCompilerError(err);
                });
            }
        },

        onCompilerError(err) {
            // cannot use EditorEvent bus to pass error message to ScriptConsole component
            // due to the race condition of when components subscribe to event bus
            this.$emit('compiler-error', err);
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
                window.open(url, '_blank') || window.location.replace(url);
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

        onAnyItemChanged(itemId, fieldPath) {
            if (fieldPath === 'visible') {
                this.$forceUpdate();
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
            this.highlightAnimated = false;
            this.highlightAnimationTime = 0;
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
            const dstTransform = calculateScreenTransformForArea(area, this.width, this.height);

            const oldX = this.schemeContainer.screenTransform.x;
            const oldY = this.schemeContainer.screenTransform.y;
            const oldZoom = this.schemeContainer.screenTransform.scale;

            if (animated) {
                playInAnimationRegistry(this.editorId, new ValueAnimation({
                    durationMillis: 400,
                    animationType: 'ease-out',
                    update: (t) => {
                        this.schemeContainer.screenTransform.scale = (oldZoom * (1.0 - t) + dstTransform.scale * t);
                        this.schemeContainer.screenTransform.x = oldX * (1.0 - t) + dstTransform.x * t;
                        this.schemeContainer.screenTransform.y = oldY * (1.0 - t) + dstTransform.y * t;
                    },
                    destroy: () => {
                        this.informUpdateOfScreenTransform(this.schemeContainer.screenTransform);
                    }
                }), 'screen', 'screen-tansform');
            } else {
                this.schemeContainer.screenTransform.scale = dstTransform.scale;
                this.schemeContainer.screenTransform.x = dstTransform.x;
                this.schemeContainer.screenTransform.y = dstTransform.y;
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
                        iconClass: this.getIconClassForLink(link),
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
            EditorEventBus.screenTransformUpdated.$emit(this.editorId, screenTransform);
        },

        calculateLinkBackgroundRectWidth(link) {
            if (link.title) {
                return link.title.length * LINK_FONT_SYMBOL_SIZE;
            } else {
                return link.url.length * LINK_FONT_SYMBOL_SIZE;
            }
        },

        getIconClassForLink(link) {
            if (link.type === 'file') {
                const extensionIdx = link.title.lastIndexOf('.');
                const extension = link.title.substring(Math.max(0, extensionIdx + 1)).toLowerCase();
                return linkTypes.findFileIcon(extension).cssClass;
            }
            return linkTypes.findTypeByNameOrDefault(link.type).cssClass;
        },

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
            };
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


        areaToViewport(area, screenTransform) {
            const p = this.pointToViewport(area.x, area.y, screenTransform);
            return {
                x: p.x,
                y: p.y,
                w: area.w * screenTransform.scale,
                h: area.h * screenTransform.scale,
            }
        },

        pointToViewport(x, y, screenTransform) {
            return {
                x: x * screenTransform.scale + screenTransform.x,
                y: y * screenTransform.scale + screenTransform.y,
            };
        },

        onFileDragEnter(event) {
            if (event.dataTransfer && this.$store.state.apiClient && this.$store.state.apiClient.uploadFile) {
                this.draggingFileOver = true;
            }
        },

        onFileDragOver(event) {
            if (event.dataTransfer && this.$store.state.apiClient && this.$store.state.apiClient.uploadFile) {
                this.draggingFileOver = true;
            }
        },

        onFileDragLeave(event) {
            this.draggingFileOver = false;
        },

        onFileDrop(event) {
            this.draggingFileOver = false;
            event.preventDefault();

            if (this.mode !== 'edit' || !this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile) {
                return;
            }

            let fileItems = [...event.dataTransfer.items].filter(item => item.kind === 'file');

            if (fileItems.length === 0) {
                return;
            }

            const mp = this.mouseCoordsFromPageCoords(event.pageX, event.pageY);
            const p = this.toLocalPoint(mp.x, mp.y);

            let fileIdx = -1;
            fileItems.map(item => item.getAsFile())
            .map(file => {
                const fileType = file.type || '';
                const title = file.name;
                StoreUtils.addInfoSystemMessage(this.$store, `Uploading file "${title}"...`, `file-uploading-${title}`, 'fas fa-spinner fa-spin fa-1x');
                return this.$store.state.apiClient.uploadFile(file)
                .then(url => {
                    fileIdx += 1;
                    const item = utils.clone(defaultItem);
                    if (fileType.startsWith('image/')) {
                        item.name = title;
                        item.shape = 'image';
                        item.shapeProps = {
                            image: url
                        };
                        const height = 200;
                        item.area = {x: p.x, y: p.y + fileIdx * (height + 10), w: 200, h: height};
                    } else {
                        item.name = 'Link to ' + title;
                        item.shape = 'link';
                        item.shapeProps = {
                            url: url,
                            icon: 'file'
                        };
                        item.cursor = 'pointer';
                        item.textSlots = {
                            link: {
                                text: title,
                                halign: 'left',
                                valign: 'top',
                                fontSize: 16,
                                paddingLeft: 0,
                                paddingTop: 0,
                                paddingBottom: 0,
                                paddingRight: 0,
                                color: '#047EFB',
                            }
                        };
                        item.area = {x: p.x, y: p.y + 40 * fileIdx, w: 12 * title.length + 30, h: 30};
                    }

                    enrichItemWithDefaults(item);
                    this.schemeContainer.addItem(item);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'links');
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                })
                .catch(err => {
                    console.error(err);
                    if (err.response && err.response.data && err.response.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.response.data.message, `item-upload-error-${title}`);
                    } else {
                        StoreUtils.addErrorSystemMessage(this.$store, 'Something went wrong, could not upload file', `item-upload-error-${title}`);
                    }
                    return null;
                });
            });
        },

        toggleClickableMarkers() {
            const hasMouseEvent = (events) => {
                if (events.length === 0) {
                    return false;
                }
                for (let i = 0; i < events.length; i++) {
                    const event = events[i].event;
                    if (event === Events.standardEvents.mousein.id
                        || event === Events.standardEvents.clicked.id) {
                        return true;
                    }
                }
                return false;
            };

            const highlights = [];

            traverseItemsConditionally(this.schemeContainer.scheme.items, (item) => {
                if (!item.visible) {
                    return false;
                }
                if ((item.description && item.description.length > 4)
                    || (item.links && item.links.length > 0)
                    || hasMouseEvent(item.behavior.events)
                    || (item.behavior.dragging && item.behavior.dragging !== 'none')
                ) {
                    const itemHighlight = this.generateItemHighlight(item, false);
                    itemHighlight.fill = itemHighlight.stroke;
                    highlights.push(itemHighlight);
                } else if (item.shape === 'component' && item.shapeProps.kind === 'external' && item.shapeProps.showButton === true) {
                    const scalingVector = worldScalingVectorOnItem(item);
                    let scalingFactor = Math.max(scalingVector.x, scalingVector.y);
                    if (myMath.tooSmall(scalingFactor)) {
                        scalingFactor = 1;
                    }
                    const m = itemCompleteTransform(item);
                    highlights.push({
                        id: item.id,
                        transform: `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`,
                        path: computeButtonPath(item),
                        fill: this.schemeContainer.scheme.style.boundaryBoxColor,
                        strokeSize: Math.max(2, item.shapeProps.buttonStrokeSize + 2),
                        stroke: this.schemeContainer.scheme.style.boundaryBoxColor,
                        pins: [],
                        opacity: 0.5,
                        scalingFactor
                    });
                }
                return true;
            });

            this.worldHighlightedItems = highlights;
            this.animateCurrentHighlightedItems();
        },

        animateCurrentHighlightedItems() {
            const maxDuration = 5000;
            const fadeDurationTrigger = 4000;

            this.highlightAnimationTime = 0;
            if (this.highlightAnimated) {
                return;
            }
            if (this.worldHighlightedItems.length === 0) {
                return;
            }

            this.highlightAnimated = true;

            const highlightAnimationLoop = (time) => {
                const latestTime = performance.now();
                const dt = latestTime - time;
                this.highlightAnimationTime += dt;

                if (!this.highlightAnimated || this.highlightAnimationTime > maxDuration || this.worldHighlightedItems.length === 0) {
                    this.highlightAnimationTime = 0.0;
                    this.highlightAnimated = false;
                    this.worldHighlightedItems = [];
                    this.$forceUpdate();
                    return;
                }

                let fadeMultiplier = 1;
                if (this.highlightAnimationTime > fadeDurationTrigger) {
                    fadeMultiplier = (maxDuration - this.highlightAnimationTime) / (maxDuration - fadeDurationTrigger);
                }
                for (let i = 0; i < this.worldHighlightedItems.length; i++) {
                    this.worldHighlightedItems[i].opacity = fadeMultiplier * (0.2 * Math.cos(this.highlightAnimationTime / 300) + 0.3);
                }
                this.$forceUpdate();

                requestAnimationFrame(() => highlightAnimationLoop(latestTime));
            };
            requestAnimationFrame(() => highlightAnimationLoop(performance.now()));
        },

        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },
    },
    computed: {
        fileDropLayerFill() {
            if (this.draggingFileOver) {
                return 'rgba(200,255,200,0.6)';
            }
            return 'rgba(255,255,255,0.0)';
        },
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
        },

        zoomToItemsTrigger() {
            this.zoomToItems(this.zoomedItems);
        }
    }
}
</script>

<style lang="css">
</style>
