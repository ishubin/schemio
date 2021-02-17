<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div id="svg-editor" class="svg-editor">
        <svg id="svg_plot" ref="svgDomElement"
            :class="['mode-' + mode, 'state-' + state]"
            :style="{cursor: cursor, background: schemeContainer.scheme.style.backgroundColor}"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp"
            @dblclick="mouseDoubleClick"
            @dragenter="onDragEnter"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
            data-void="true">

            <g v-if="mode === 'view' && interactiveSchemeContainer">
                <g data-type="scene-transform" :transform="transformSvgInteractiveMode">
                    <g v-for="item in interactiveSchemeContainer.worldItems" class="item-container"
                        v-if="item.visible && item.shape !== 'hud'"
                        :class="'item-cursor-' + item.cursor">
                        <item-svg 
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :mode="mode"
                            @custom-event="onItemCustomEvent"/>
                    </g>
                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" :fill="item.fill" :stroke="item.stroke"
                            :stroke-width="item.strokeSize+'px'"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            data-preview-ignore="true"/>
                    </g>
                </g>

                <g v-for="link, linkIndex in selectedItemLinks" data-preview-ignore="true">
                    <a :id="`item-link-${linkIndex}`" class="item-link" @click="onSvgItemLinkClick(link.url, arguments[0])" :xlink:href="link.url">
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
                    <g v-for="hud in interactiveSchemeContainer.hudItems" v-if="hud.visible" :transform="createHUDTransform(hud)"
                        :style="{'opacity': hud.opacity/100.0, 'mix-blend-mode': hud.blendMode}"
                        >
                        <item-svg 
                            v-for="item in hud.childItems"
                            v-if="item.visible"
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :mode="mode"
                            @custom-event="onItemCustomEvent"/>
                    </g>
                </g>
            </g>


            <!--  EDIT MODE -->

            <g v-if="mode === 'edit'">
                <g class="grid" data-preview-ignore="true" :transform="gridTransform" data-void="true">
                    <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height + 2 * gridStep" 
                        :stroke="schemeContainer.scheme.style.gridColor"
                        data-void="true"
                    />
                    <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width + 2 * gridStep" :y2="index * gridStep"
                        :stroke="schemeContainer.scheme.style.gridColor"
                        data-void="true"
                    />
                </g>

                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems"
                        v-if="item.visible"
                        class="item-container"
                        :class="'item-cursor-'+item.cursor">
                        <item-svg
                            :key="`${item.id}-${item.shape}-${schemeContainer.revision}`"
                            :item="item"
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

                    <multi-item-edit-box  v-if="schemeContainer.multiItemEditBox && state !== 'editCurve' && !inPlaceTextEditor.shown"
                        :key="`multi-item-edit-box-${schemeContainer.multiItemEditBox.id}`"
                        :edit-box="schemeContainer.multiItemEditBox"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"
                        :controlPointsColor="schemeContainer.scheme.style.controlPointsColor"/>


                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" fill="none" :stroke="item.stroke"
                            :stroke-width="item.strokeSize+'px'"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            data-preview-ignore="true"/>
                    </g>

                </g>


                <g v-if="state === 'editCurve' && curveEditItem && curveEditItem.meta" :transform="transformSvg">
                    <curve-edit-box 
                        :key="`item-curve-edit-box-${curveEditItem.id}`"
                        :item="curveEditItem"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                        :control-points-color="schemeContainer.scheme.style.controlPointsColor"/>
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
            </g>
        </svg>

        <!-- Item Text Editor -->
        <in-place-text-edit-box v-if="inPlaceTextEditor.shown"
            :key="`in-place-text-edit-${inPlaceTextEditor.itemId}-${inPlaceTextEditor.slotName}`"
            :item="inPlaceTextEditor.item"
            :area="inPlaceTextEditor.area"
            :css-style="inPlaceTextEditor.style"
            :text="inPlaceTextEditor.text"
            :creating-new-item="inPlaceTextEditor.creatingNewItem"
            :zoom="schemeContainer.screenTransform.scale"
            @close="closeItemTextEditor"
            @updated="onInPlaceTextEditorUpdate"
            @item-renamed="onInPlaceTextEditorItemRenamed"
            @item-area-changed="onInPlaceTextEditorItemAreaChanged"
            @item-text-cleared="onInPlaceTextEditorItemTextCleared"
            />


        <context-menu v-if="customContextMenu.show"
            :key="customContextMenu.id"
            :mouse-x="customContextMenu.mouseX"
            :mouse-y="customContextMenu.mouseY"
            @close="customContextMenu.show = false"
        >
            <ul>
                <li v-for="(option, optionIndex) in customContextMenu.menuOptions" @click="onCustomMenuOptionSelected(optionIndex)">
                    <i v-if="option.iconClass" :class="option.iconClass"/>
                    {{option.name}}
                </li>
            </ul>
        </context-menu>

        <modal title="Rotate around center" v-if="rotateAroundCenterModal.shown"
            primary-button="Rotate"
            @primary-submit="onRotateAroundCenterModalSubmit"
            @close="rotateAroundCenterModal.shown = false"
            >
            <h5>Angle</h5>
            <input type="text" class="textfield" v-model="rotateAroundCenterModal.angle" v-on:keyup.enter="onRotateAroundCenterModalSubmit"/>
        </modal>

        <export-svg-modal v-if="exportSVGModal.shown"
            :exported-items="exportSVGModal.exportedItems"
            :width="exportSVGModal.width"
            :height="exportSVGModal.height"
            :background-color="exportSVGModal.backgroundColor"
            @close="exportSVGModal.shown = false"/>
    </div>
</template>

<script>
import shortid from 'shortid';
import map from 'lodash/map';
import max from 'lodash/max';
import forEach from 'lodash/forEach';
import filter from 'lodash/filter';

import '../../typedef';

import {Keys} from '../../events';
import myMath from '../../myMath';
import {ItemInteractionMode, defaultItem, enrichItemWithDefaults} from '../../scheme/Item';
import StateInteract from './states/StateInteract.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateItem from './states/StateCreateItem.js';
import StateEditCurve from './states/StateEditCurve.js';
import StatePickElement from './states/StatePickElement.js';
import EventBus from './EventBus.js';
import MultiItemEditBox from './MultiItemEditBox.vue';
import CurveEditBox from './CurveEditBox.vue';
import ItemSvg from './items/ItemSvg.vue';
import generateTextStyle from './text/ItemText';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import UserEventBus from '../../userevents/UserEventBus.js';
import Compiler from '../../userevents/Compiler.js';
import ContextMenu from './ContextMenu.vue';
import InPlaceTextEditBox from './InPlaceTextEditBox.vue';
import Shape from './items/shapes/Shape';
import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import Modal from '../Modal.vue';
import Events from '../../userevents/Events';
import StrokePattern from './items/StrokePattern';
import ExportSVGModal from './ExportSVGModal.vue';
import { filterOutPreviewSvgElements } from '../../svgPreview';
import store from '../../store/Store';
import apiClient from '../../apiClient';

const EMPTY_OBJECT = {type: 'void'};
const LINK_FONT_SYMBOL_SIZE = 10;

const userEventBus = new UserEventBus();
const behaviorCompiler = new Compiler();
const allDraggerEdges = [
    ['top', 'left'],
    ['top'],
    ['top', 'right'],
    ['right'],
    ['bottom', 'right'],
    ['bottom'],
    ['bottom', 'left'],
    ['left']
];


const states = {
    interact: new StateInteract(EventBus, store, userEventBus),
    createItem: new StateCreateItem(EventBus, store),
    editCurve: new StateEditCurve(EventBus, store),
    dragItem: new StateDragItem(EventBus, store),
    pickElement: new StatePickElement(EventBus, store)
};


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
        offline  : { type: Boolean, default: false},
        projectId: { type: String, default: null },
        mode     : { type: String, default: 'edit' },

        /** @type {SchemeContainer} */
        schemeContainer : { default: null, type: Object },
        zoom            : { default: 1.0, type: Number },
        useMouseWheel   : { default: true, type: Boolean}
    },

    components: {ItemSvg, ContextMenu, MultiItemEditBox, CurveEditBox, InPlaceTextEditBox, Modal, 'export-svg-modal': ExportSVGModal},
    beforeMount() {
        forEach(states, state => {
            state.setSchemeContainer(this.schemeContainer);
            state.setEditor(this);
        })
        if (this.mode === 'edit') {
            this.switchStateDragItem();
        } else {
            this.switchStateInteract();
        }

        EventBus.$on(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateItem);
        EventBus.$on(EventBus.START_CONNECTING_ITEM, this.onStartConnecting);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$on(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$on(EventBus.ITEM_LINKS_SHOW_REQUESTED, this.onShowItemLinks);
        EventBus.$on(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$on(EventBus.ANY_ITEM_CHANGED, this.onAnyItemChanged);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.VOID_DOUBLE_CLICKED, this.onVoidDoubleClicked);
        EventBus.$on(EventBus.VOID_RIGHT_CLICKED, this.onRightClickedVoid);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$on(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$on(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$on(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$on(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$on(EventBus.SHAPE_STYLE_APPLIED, this.onShapeStyleApplied);
        EventBus.$on(EventBus.ITEMS_HIGHLIGHTED, this.highlightItems);
        EventBus.$on(EventBus.EXPORT_SVG_REQUESTED, this.onExportSVGRequested);
    },
    mounted() {
        this.updateSvgSize();
        window.addEventListener("resize", this.updateSvgSize);

        if (this.useMouseWheel) {
            var svgElement = this.$refs.svgDomElement;
            if (svgElement) {
                svgElement.addEventListener('mousewheel', this.mouseWheel);
            }
        }
    },
    beforeDestroy(){
        window.removeEventListener("resize", this.updateSvgSize);
        this.mouseEventsEnabled = false;
        EventBus.$off(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateItem);
        EventBus.$off(EventBus.START_CONNECTING_ITEM, this.onStartConnecting);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$off(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$off(EventBus.ITEM_LINKS_SHOW_REQUESTED, this.onShowItemLinks);
        EventBus.$off(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$off(EventBus.ANY_ITEM_CHANGED, this.onAnyItemChanged);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.VOID_DOUBLE_CLICKED, this.onVoidDoubleClicked);
        EventBus.$off(EventBus.VOID_RIGHT_CLICKED, this.onRightClickedVoid);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$off(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$off(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$off(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$off(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$off(EventBus.SHAPE_STYLE_APPLIED, this.onShapeStyleApplied);
        EventBus.$off(EventBus.ITEMS_HIGHLIGHTED, this.highlightItems);
        EventBus.$off(EventBus.EXPORT_SVG_REQUESTED, this.onExportSVGRequested);

        if (this.useMouseWheel) {
            var svgElement = this.$refs.svgDomElement;
            if (svgElement) {
                svgElement.removeEventListener('mousewheel', this.mouseWheel);
            }
        }
    },
    data() {
        return {
            /** @type {SchemeContainer} */
            interactiveSchemeContainer: null,
            mouseEventsEnabled: true,
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],
            state: 'interact',

            cursor: 'default',

            // the following two properties are going to be updated in mounted hook
            width: window.innerWidth,
            height: window.innerHeight,

            selectedItemLinks: [],
            lastHoveredItem: null,

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

            inPlaceTextEditor: {
                itemId: '',
                item: null,
                slotName: '',
                shown: false,
                area: {x: 0, y: 0, w: 100, h: 100},
                text: '',
                creatingNewItem: false,
                style: {}
            },

            rotateAroundCenterModal: {
                shown: false,
                angle: 0,
                originalItemAreas: {} // used to reset back to it, so that user can experiment with multiple angles
            },

            worldHighlightedItems: [ ],

            exportSVGModal: {
                width: 100,
                height: 100,
                shown: false,
                exportedItems: [],
                backgroundColor: 'rgba(255,255,255,1.0)'
            },

        };
    },
    methods: {
        updateSvgSize() {
            const svgRect = this.$refs.svgDomElement.getBoundingClientRect();
            this.width = svgRect.width;
            this.height = svgRect.height;

            this.schemeContainer.screenSettings.width = svgRect.width;
            this.schemeContainer.screenSettings.height = svgRect.height;

            if (this.interactiveSchemeContainer) {
                this.interactiveSchemeContainer.screenSettings.width = svgRect.width;
                this.interactiveSchemeContainer.screenSettings.height = svgRect.height;
            }
        },

        mouseCoordsFromEvent(event) {
            var rect = this.$refs.svgDomElement.getBoundingClientRect(),
                offsetX = event.clientX - rect.left,
                offsetY  = event.clientY - rect.top;

            return {
                x: Math.round(offsetX),
                y: Math.round(offsetY)
            }
        },

        identifyElement(element, point) {
            if (element) {
                const elementType = element.getAttribute('data-type');
                if (elementType === 'curve-point') {
                    return {
                        type: elementType,
                        pointIndex: parseInt(element.getAttribute('data-curve-point-index'))
                    };
                } else if (elementType === 'curve-control-point') {
                    return {
                        type: elementType,
                        pointIndex: parseInt(element.getAttribute('data-curve-point-index')),
                        controlPointIndex: parseInt(element.getAttribute('data-curve-control-point-index'))
                    };
                } else if (elementType === 'multi-item-edit-box' || elementType === 'multi-item-edit-box-rotational-dragger') {
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
                } else if (elementType === 'multi-item-edit-box-edit-curve-link') {
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBox,
                    };
                }

                const itemId = element.getAttribute('data-item-id');
                if (itemId) {
                    return {
                        item: this.schemeContainer.findItemById(itemId)
                    }
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
                                edges: allDraggerEdges[parseInt(element.getAttribute('data-dragger-index'))]
                            }
                        };
                    }
                }

                const connectorStarterItemId = element.getAttribute('data-connector-starter-item-id');
                if (connectorStarterItemId) {
                    const item = this.schemeContainer.findItemById(connectorStarterItemId);
                    if (item) {
                        return {
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
            states[this.state].mouseWheel(p.x, p.y, coords.x, coords.y, event);
        },
        mouseMove(event) {
            if (this.mouseEventsEnabled) {
                const coords = this.mouseCoordsFromEvent(event);
                const p = this.toLocalPoint(coords.x, coords.y);
                lastMousePosition.x = coords.x;
                lastMousePosition.y = coords.y;

                states[this.state].mouseMove(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
            }
        },
        mouseDown(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);
                lastMousePosition.x = coords.x;
                lastMousePosition.y = coords.y;

                states[this.state].mouseDown(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
            }
        },
        mouseUp(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseUp(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
            }
        },
        mouseDoubleClick(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseDoubleClick(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement, p), event);
            }
        },
        onCancelCurrentState() {
            if (this.mode === 'edit') {
                this.state = 'dragItem';
            } else {
                this.state = 'interact';
            }
            states[this.state].reset();
        },
        switchStateInteract() {
            this.highlightItems([]);
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), EventBus);
            this.interactiveSchemeContainer.screenTransform.x = this.schemeContainer.screenTransform.x;
            this.interactiveSchemeContainer.screenTransform.y = this.schemeContainer.screenTransform.y;
            this.interactiveSchemeContainer.screenTransform.scale = this.schemeContainer.screenTransform.scale;

            states.interact.schemeContainer = this.interactiveSchemeContainer;
            this.state = 'interact';

            const boundingBox = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.filterNonHUDItems(this.schemeContainer.getItems()));

            this.interactiveSchemeContainer.screenSettings.width = this.width;
            this.interactiveSchemeContainer.screenSettings.height = this.height;
            this.interactiveSchemeContainer.screenSettings.boundingBox = boundingBox;

            this.reindexUserEvents();
            states[this.state].reset();
        },
        switchStateDragItem() {
            this.highlightItems([]);
            this.state = 'dragItem';
            states.dragItem.reset();
        },
        switchStatePickElement(elementPickCallback) {
            this.highlightItems([]);
            this.state = 'pickElement';
            states.pickElement.reset();
            states.pickElement.setElementPickCallback(elementPickCallback);
        },
        onSwitchStateCreateItem(item) {
            this.highlightItems([]);
            if (item.shape === 'curve') {
                this.setCurveEditItem(item);
                // making sure every new curve starts non-closed
                item.shapeProps.closed = false;
                this.state = 'editCurve';
                EventBus.emitCurveEdited(item);
            } else {
                this.state = 'createItem';
            }
            states[this.state].reset();
            states[this.state].setItem(item);
        },

        setCurveEditItem(item) {
            this.$store.dispatch('setCurveEditItem', item);
        },

        onStartConnecting(sourceItem, worldPoint) {
            this.highlightItems([]);
            let localPoint = null;
            if (worldPoint) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, sourceItem);
            }
            states.editCurve.reset();
            const curveItem = states.editCurve.initConnectingFromSourceItem(sourceItem, localPoint);
            this.setCurveEditItem(curveItem);
            this.state = 'editCurve';
        },

        onCurveEditRequested(item) {
            this.highlightItems([]);
            this.state = 'editCurve';
            states.editCurve.reset();
            states.editCurve.setItem(item);
            this.setCurveEditItem(item);
        },

        onCurveEditStopped() {
            if (this.state === 'editCurve') {
                states.editCurve.cancel();
            }
        },

        highlightItems(itemIds) {
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

                const path = shape.computePath(item);
                if (!path) {
                    return;
                }

                const worldPoint = this.schemeContainer.worldPointOnItem(0, 0, item);
                let angle = item.area.r;
                if (item.meta && item.meta.transform) {
                    angle += item.meta.transform.r;
                }

                let fill = this.schemeContainer.scheme.style.boundaryBoxColor;
                let strokeSize = 6;
                if (item.shape === 'curve') {
                    strokeSize = item.shapeProps.strokeSize + 6;
                    if (item.shapeProps.fill.type === 'none' && !item.shapeProps.closed) {
                        fill = 'none';
                    }
                }


                const itemHighlight = {
                    id: itemId,
                    transform: `translate(${worldPoint.x}, ${worldPoint.y}) rotate(${angle})`,
                    path,
                    fill,
                    strokeSize,
                    stroke: this.schemeContainer.scheme.style.boundaryBoxColor
                };
                this.worldHighlightedItems.push(itemHighlight);
            });
        },

        reindexUserEvents() {
            userEventBus.clear();

            // ids of items that have subscribed for Init event
            const itemsForInit = {};

            forEach(this.interactiveSchemeContainer.getItems(), item => {
                if (item.behavior && item.behavior.events) {
                    forEach(item.behavior.events, event => {
                        const eventCallback = behaviorCompiler.compileActions(this.interactiveSchemeContainer, item, event.actions);

                        if (event.event === Events.standardEvents.init.id) {
                            itemsForInit[item.id] = 1;
                        }
                        userEventBus.subscribeItemEvent(item.id, event.event, eventCallback);
                    })
                }
            });

            forEach(itemsForInit, (val, itemId) => {
                userEventBus.emitItemEvent(itemId, Events.standardEvents.init.id);
            });
        },

        onSvgItemLinkClick(url, event) {
            if (url.startsWith('/')) {
                this.$router.push({path: url});
                event.preventDefault();
            }
            return false;
        },

        onKeyPress(key, keyOptions) {
            if (key === Keys.ESCAPE) {
                states[this.state].cancel();
            } else if (key === Keys.DELETE && this.mode === 'edit') {
                if (this.state === 'editCurve') {
                    states.editCurve.deleteSelectedPoints();
                } else if (this.state === 'dragItem') {
                    this.deleteSelectedItems();
                }
            } else {
                states[this.state].keyPressed(key, keyOptions);
            }
        },

        onKeyUp(key, keyOptions) {
            if (key !== Keys.ESCAPE && key != Keys.DELETE) {
                states[this.state].keyUp(key, keyOptions);
            }
        },

        deleteSelectedItems() {
            if (this.state === 'editCurve') {
                states[this.state].cancel();
            }
            this.schemeContainer.deleteSelectedItems();
            EventBus.emitSchemeChangeCommited();
            this.$forceUpdate();
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
            // this.schemeContain
            const textItem = utils.clone(defaultItem);
            textItem.name = this.schemeContainer.copyNameAndMakeUnique('Label');
            textItem.textSlots = {
                body: {
                    text  : '',
                    halign: 'left',
                    valign: 'top',
                }
            };
            textItem.shape = 'none';
            // using tiny area so that in-place text editor renders it without bounds
            textItem.area = {x, y, w: 10, h: 10};
            enrichItemWithDefaults(textItem);
            this.schemeContainer.addItem(textItem);
            this.$nextTick(() => {
                EventBus.emitItemTextSlotEditTriggered(textItem, 'body', {
                    x: 0, y: 0, w: textItem.area.w, h: textItem.area.h
                }, true);
            });
        },

        removeDrawnLinks() {
            if (this.selectedItemLinks.length > 0) {
                this.selectedItemLinks = [];
            }
        },

        onBringToView(area) {
            let schemeContainer = this.schemeContainer;
            if (this.mode === 'view') {
                schemeContainer = this.interactiveSchemeContainer;
            }
            const headerHeight = 50;
            let newZoom = 1.0;
            if (area.w > 0 && area.h > 0 && this.width - 400 > 0 && this.height > 0) {
                newZoom = Math.floor(100.0 * Math.min(this.width/area.w, (this.height - headerHeight)/area.h)) / 100.0;
                newZoom = Math.max(0.05, Math.min(newZoom, 1.0));
            }

            const oldX = schemeContainer.screenTransform.x;
            const oldY = schemeContainer.screenTransform.y;
            const oldZoom = schemeContainer.screenTransform.scale;

            const destX = this.width/2 - (area.x + area.w/2) * newZoom;
            const destY = (this.height)/2 - (area.y - headerHeight + area.h/2) *newZoom;

            AnimationRegistry.play(new ValueAnimation({
                durationMillis: 400,
                animationType: 'ease-out',
                update: (t) => {
                    schemeContainer.screenTransform.scale = (oldZoom * (1.0 - t) + newZoom * t);
                    schemeContainer.screenTransform.x = oldX * (1.0 - t) + destX * t;
                    schemeContainer.screenTransform.y = oldY * (1.0 - t) + destY * t;
                }, 
                destroy: () => {
                    EventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, schemeContainer.screenTransform);
                }
            }));
        },

        startLinksAnimation() {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: 300,

                update: (t) => {
                    forEach(this.selectedItemLinks, link => {
                        link.x = link.startX * (1.0 - t) + link.destinationX * t;
                        link.y = link.startY * (1.0 - t) + link.destinationY * t;
                    });
                }
            }));
        },

        generateItemLinks(item) {
            if (item.links && item.links.length > 0) {
                const worldPointCenter = this.interactiveSchemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
                let cx = this._vx(worldPointCenter.x);
                let cy = this._vy(worldPointCenter.y);
                let startX = cx;
                let startY = cy;

                if (cy > this.height - 100 || cy < 100) {
                    cy = this.height / 4;
                }

                let step = 40;
                let y0 = cy - item.links.length * step / 2;
                const worldPointRight = this.interactiveSchemeContainer.worldPointOnItem(item.area.w, 0, item);
                let destinationX = this._vx(worldPointRight.x) + 10;

                // taking side panel into account
                if (destinationX > this.width - 500) {
                    let maxLinkLength = max(map(item.links, link => link.title ? link.title.length : link.url.length));
                    const leftX = this._vx(this.interactiveSchemeContainer.worldPointOnItem(0, 0, item).x);
                    destinationX = leftX - maxLinkLength * LINK_FONT_SYMBOL_SIZE;
                }

                return map(item.links, (link, index) => {
                    return {
                        url: link.url,
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

        onRightClickedItem(item, mouseX, mouseY) {
            this.customContextMenu.menuOptions = [{
                name: 'Bring to Front', 
                clicked: () => {this.$emit('clicked-bring-to-front');}
            }, {
                name: 'Bring to Back',
                clicked: () => {this.$emit('clicked-bring-to-back');}
            }, {
                name: 'Connect',
                iconClass: 'fas fa-network-wired',
                clicked: () => {this.$emit('clicked-start-connecting', item, this.x_(mouseX), this.y_(mouseY), mouseX, mouseY);}
            }, {
                name: 'Add link',
                iconClass: 'fas fa-link',
                clicked: () => {this.$emit('clicked-add-item-link', item);}
            }];

            if (!this.offline) {
                this.customContextMenu.menuOptions.push({
                    name: 'Create scheme for this element...',
                    iconClass: 'far fa-file',
                    clicked: () => {this.$emit('clicked-create-child-scheme-to-item', item); }
                });
            }

            this.customContextMenu.menuOptions = this.customContextMenu.menuOptions.concat([{
                name: 'Copy',
                clicked: () => {this.$emit('clicked-copy-selected-items', item);}
            }, {
                name: 'Delete',
                clicked: this.deleteSelectedItems
            }, {
                name: 'Rotate around center...',
                clicked: () => { this.triggerRotateAroundCenterModal(); }
            }, {
                name: 'Surround items',
                clicked: () => { this.surroundSelectedItems(); }
            }, {
                name: 'Export as SVG...',
                clicked: () => { this.exportSelectedItemsAsSVG(); }
            }]);
            if (item.shape === 'curve') {
                this.customContextMenu.menuOptions.push({
                    name: 'Edit Curve',
                    clicked: () => { EventBus.emitCurveEdited(item); }
                });
            }
            this.customContextMenu.show = true;
            this.customContextMenu.mouseX = mouseX;
            this.customContextMenu.mouseY = mouseY;
            this.customContextMenu.id = shortid.generate();
        },

        onRightClickedVoid(x, y, mouseX, mouseY) {
            if (this.mode === 'edit') {
                this.customContextMenu.menuOptions = [{
                    name: 'Paste',
                    clicked: () => {this.$emit('clicked-items-paste')}
                }];
                this.customContextMenu.show = true;
                this.customContextMenu.mouseX = mouseX;
                this.customContextMenu.mouseY = mouseY;
                this.customContextMenu.id = shortid.generate();
            }
        },

        onExportSVGRequested() {
            let schemeContainer = this.schemeContainer;
            if (this.mode === 'view') {
                schemeContainer = this.interactiveSchemeContainer;
            }
            this.openExportSVGModal(schemeContainer, schemeContainer.scheme.items);
        },

        exportSelectedItemsAsSVG() {
            if (!this.schemeContainer.multiItemEditBox) {
                return;
            }
            const box = this.schemeContainer.multiItemEditBox;
            if (box.items.length === 0) {
                return;
            }

            // picking all root selected items
            // we don't want to double export selected items if their ancestors were already picked for export
            const items = [];
            const pickedItemIds = {};
            forEach(box.items, item => {
                let shouldExport = true;
                for (let i = 0; i < item.meta.ancestorIds.length && shouldExport; i++) {
                    if (pickedItemIds[item.meta.ancestorIds[i]]) {
                        shouldExport = false;
                    }
                }
                if (shouldExport) {
                    items.push(item);
                    pickedItemIds[item.id] = 1;
                }
            });

            this.openExportSVGModal(this.schemeContainer, items);
        },

        openExportSVGModal(schemeContainer, items) {
            const exportedItems = [];
            let minP = null;
            let maxP = null;

            const collectedItems = [];

            forEach(items, item => {
                if (item.visible && item.opacity > 0.0001) {
                    const domElement = document.querySelector(`g[data-svg-item-container-id="${item.id}"]`);
                    if (domElement) {
                        const itemBoundingBox = this.calculateBoundingBoxOfAllSubItems(schemeContainer, item);
                        if (minP) {
                            minP.x = Math.min(minP.x, itemBoundingBox.x);
                            minP.y = Math.min(minP.y, itemBoundingBox.y);
                        } else {
                            minP = {
                                x: itemBoundingBox.x,
                                y: itemBoundingBox.y
                            };
                        }
                        if (maxP) {
                            maxP.x = Math.max(maxP.x, itemBoundingBox.x + itemBoundingBox.w);
                            maxP.y = Math.max(maxP.y, itemBoundingBox.y + itemBoundingBox.h);
                        } else {
                            maxP = {
                                x: itemBoundingBox.x + itemBoundingBox.w,
                                y: itemBoundingBox.y + itemBoundingBox.h
                            };
                        }
                        const itemDom = domElement.cloneNode(true);
                        filterOutPreviewSvgElements(itemDom);
                        collectedItems.push({
                            item, itemDom
                        });
                    }
                }
            });

            forEach(collectedItems, collectedItem => {
                const item = collectedItem.item;
                const itemDom = collectedItem.itemDom;
                const worldPoint = schemeContainer.worldPointOnItem(0, 0, item);
                const angle = item.meta.transform.r + item.area.r;
                const x = worldPoint.x - minP.x;
                const y = worldPoint.y - minP.y;

                itemDom.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
                const html = itemDom.outerHTML;
                exportedItems.push({item, html})
            });

            this.exportSVGModal.exportedItems = exportedItems;
            this.exportSVGModal.width = maxP.x - minP.x;
            this.exportSVGModal.height = maxP.y - minP.y;
            if (this.exportSVGModal.width > 5) {
                this.exportSVGModal.width = Math.round(this.exportSVGModal.width);
            }
            if (this.exportSVGModal.height > 5) {
                this.exportSVGModal.height = Math.round(this.exportSVGModal.height);
            }

            // this check is needed when export straigt vertical or horizontal curve lines
            // in such case area is defined with zero width or height and it makes SVG export confused
            if (this.exportSVGModal.width < 0.001) {
                this.exportSVGModal.width = 20;
            }
            if (this.exportSVGModal.height < 0.001) {
                this.exportSVGModal.height = 20;
            }
            this.exportSVGModal.backgroundColor = schemeContainer.scheme.style.backgroundColor
            this.exportSVGModal.shown = true;
        },

        /**
         * Calculates bounding box taking all sub items into account and excluding the ones that are not visible
         */
        calculateBoundingBoxOfAllSubItems(schemeContainer, item) {
            const items = [];
            const traverse = (item) => {
                if (item.visible && item.opacity > 0.0001) {
                    // we don't want dummy shapes to effect the view area as these shapes are not supposed to be visible
                    if (item.shape !== 'dummy' && item.selfOpacity > 0.0001) {
                        items.push(item);
                    }
                    if (item.childItems) {
                        forEach(item.childItems, childItem => {
                            traverse(childItem);
                        });
                    }
                }
            };
            traverse(item);
            return schemeContainer.getBoundingBoxOfItems(items)
        },

        onItemTextSlotEditTriggered(item, slotName, area, creatingNewItem) {
            // it is expected that text slot is always available with all fields as it is supposed to be enriched based on the return of getTextSlots function
            const itemTextSlot = item.textSlots[slotName];
            const worldPoint = this.schemeContainer.worldPointOnItem(area.x, area.y, item);

            this.inPlaceTextEditor.itemId = item.id;
            this.inPlaceTextEditor.slotName = slotName;
            this.inPlaceTextEditor.item = item;
            this.inPlaceTextEditor.text = itemTextSlot.text;
            this.inPlaceTextEditor.style = generateTextStyle(itemTextSlot);
            this.inPlaceTextEditor.width = area.w;
            this.inPlaceTextEditor.height = area.h;
            this.inPlaceTextEditor.creatingNewItem = creatingNewItem;

            this.inPlaceTextEditor.area.x = this._x(worldPoint.x);
            this.inPlaceTextEditor.area.y = this._y(worldPoint.y);
            this.inPlaceTextEditor.area.w = this._z(area.w);
            this.inPlaceTextEditor.area.h = this._z(area.h);
            this.inPlaceTextEditor.shown = true;
        },

        onInPlaceTextEditorUpdate(text) {
            if (this.inPlaceTextEditor.shown) {
                this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName].text = text;
            }
        },

        onInPlaceTextEditorItemAreaChanged(item, width, height) {
            if (item.shape === 'none') {
                item.area.w = width;
                item.area.h = height;
            }
        },

        onInPlaceTextEditorItemRenamed(item, name) {
            item.name = name;
        },

        onInPlaceTextEditorItemTextCleared(item) {
            if (!item.shape === 'none') {
                return;
            }
            if (item.childItems && item.childItems.length > 0) {
                return;   
            }
            this.schemeContainer.deleteItem(item);
        },

        closeItemTextEditor() {
            if (this.inPlaceTextEditor.item) {
                EventBus.emitItemTextSlotEditCanceled(this.inPlaceTextEditor.item, this.inPlaceTextEditor.slotName);
                EventBus.emitSchemeChangeCommited(`item.${this.inPlaceTextEditor.item.id}.textSlots.${this.inPlaceTextEditor.slotName}.text`);
                EventBus.emitItemChanged(this.inPlaceTextEditor.item.id, `textSlots.${this.inPlaceTextEditor.slotName}.text`);
                this.schemeContainer.reindexItems();
            }
            this.inPlaceTextEditor.shown = false;
        },

        updateInPlaceTextEditorStyle() {
            const textSlot = this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName];
            this.inPlaceTextEditor.style = generateTextStyle(textSlot);
            this.inPlaceTextEditor.width = this.inPlaceTextEditor.area.w;
            this.inPlaceTextEditor.height = this.inPlaceTextEditor.area.h;
        },

        onAnyItemChanged(itemId) {
            if (this.inPlaceTextEditor.itemId === itemId) {
                this.updateInPlaceTextEditorStyle();
            }
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
                        EventBus.$emit(EventBus.ITEM_SIDE_PANEL_TRIGGERED, item);
                    } else if (item.interactionMode === ItemInteractionMode.TOOLTIP) {
                        EventBus.$emit(EventBus.ITEM_TOOLTIP_TRIGGERED, item, lastMousePosition.x, lastMousePosition.y);
                    }
                }
            }

            userEventBus.emitItemEvent(event.itemId, event.eventName);
        },

        onElementPickRequested(elementPickCallback) {
            this.switchStatePickElement(elementPickCallback);
        },

        onCustomContextMenuRequested(mouseX, mouseY, menuOptions) {
            this.customContextMenu.menuOptions = menuOptions;
            this.customContextMenu.show = true;
            this.customContextMenu.mouseX = mouseX;
            this.customContextMenu.mouseY = mouseY;
            this.customContextMenu.id = shortid.generate();
        },

        onCustomMenuOptionSelected(optionIndex) {
            const option = this.customContextMenu.menuOptions[optionIndex];
            if (option) {
                option.clicked();
            }
            this.customContextMenu.show = false;
        },

        onShapeStyleApplied(shapeName, shapeProps) {
            if (this.state === 'createItem' && states.createItem.item && states.createItem.item.shape === shapeName) {
                const shape = Shape.find(shapeName);
                if (!shape) {
                    return;
                }
                const item = states.createItem.item;
                forEach(shape.args, (arg, argName) => {
                    item.shapeProps[argName] = arg.value;
                });
                forEach(shapeProps, (argValue, argName) => {
                    item.shapeProps[argName] = argValue;
                });
            }
        },

        triggerRotateAroundCenterModal() {
            if (this.schemeContainer.selectedItems.length > 0) {
                this.rotateAroundCenterModal.originalItemAreas = {};
                forEach(this.schemeContainer.selectedItems, item => {
                    this.rotateAroundCenterModal.originalItemAreas[item.id] = utils.clone(item.area);
                });
                this.rotateAroundCenterModal.angle = 0;
                this.rotateAroundCenterModal.shown = true;
            }
        },

        onRotateAroundCenterModalSubmit() {
            this.rotateSelectedItemsAroundCenter(parseFloat(this.rotateAroundCenterModal.angle));
        },

        rotateSelectedItemsAroundCenter(angle) {
            const box = this.schemeContainer.multiItemEditBox;
            if (box !== null && box.items.length > 0) {
                box.area.r = angle;
                this.schemeContainer.updateMultiItemEditBoxItems(box, false);
            }
        },

        /**
         * Used to generate a surrounding rect arround selected items.
         * It also remounts the selected item to the new rect
         */
        surroundSelectedItems() {
            const box = this.schemeContainer.multiItemEditBox;
            if (box !== null && box.items.length > 0) {
                const padding = this.$store.state.itemSurround.padding;
                const rect = utils.clone(defaultItem);
                rect.name = 'Group';
                rect.area = {
                    x: box.area.x - padding,
                    y: box.area.y - padding,
                    w: box.area.w + padding * 2,
                    h: box.area.h + padding * 2,
                    r: box.area.r,
                };
                rect.shape = 'rect';
                rect.shapeProps = {
                    strokePattern: StrokePattern.DASHED,
                    strokeSize: 2,
                    fill: {type: 'none'},
                };
                rect.textSlots = {
                    body: {
                        halign: 'left',
                        valign: 'top',
                        text: '<i>Group...</i>'
                    }
                };
                this.schemeContainer.addItem(rect);
                this.schemeContainer.remountItemBeforeOtherItem(rect.id, box.items[0].id);

                const remountedItemIds = {};

                forEach(box.items, item => {
                    let remountAllowed = true;
                    // making sure we don't have to remount item if it's ancestor was already remounted
                    if (item.meta && item.meta.ancestorIds) {
                        for (let i = 0; i < item.meta.ancestorIds.length && remountAllowed; i++) {
                            if (remountedItemIds[item.meta.ancestorIds[i]]) {
                                remountAllowed = false;
                            }
                        }
                    }
                    if (remountAllowed) {
                        if (rect.childItems && rect.childItems.length > 0) {
                            // trying to preserve original order of items
                            this.schemeContainer.remountItemAfterOtherItem(item.id, rect.childItems[rect.childItems.length - 1].id);
                        } else {
                            this.schemeContainer.remountItemInsideOtherItem(item.id, rect.id);
                        }

                        remountedItemIds[item.id] = 1;
                    }
                });
                this.schemeContainer.selectItem(rect);
                EventBus.emitItemSurroundCreated(rect, box.area, padding);
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
        onDrop(event) {
            event.preventDefault();
            event.stopPropagation();

            if (this.projectId && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                const files = filter(event.dataTransfer.files, file => file.type.indexOf('image/') === 0);

                const x = this.x_(this.width / 2);
                const y = this.y_(this.height / 2);

                let chain = Promise.resolve(null);
                forEach(files, (file, index) => {
                    chain = chain.then(() => {
                        const imageId = shortid.generate();
                        this.$store.dispatch('updateImageUploadStatus', { imageId, uploading: true, uploadFailed: false });

                        return apiClient.uploadFile(this.projectId, file)
                            .then(imageUrl => {
                                this.addUploadedImage(imageUrl, x + index * 20, y);

                                this.$store.dispatch('updateImageUploadStatus', { imageId, uploading: false, uploadFailed: false });
                            })
                            .catch(err => {
                                this.$store.dispatch('updateImageUploadStatus', { imageId, uploading: false, uploadFailed: true });
                            });
                    });
                })
            }
        },

        addUploadedImage(imageUrl, x, y) {
            const img = new Image();
            const that = this;
            img.onload = function() {
                that.addUploadedImageWithSize(imageUrl, x, y, this.width, this.height);
            }
            img.onerror = function() {
                that.addUploadedImageWithSize(imageUrl, x, y, 100, 100);
            }
            img.src = imageUrl;
        },
        addUploadedImageWithSize(imageUrl, x, y, w, h) {
            const image = {
                name: this.schemeContainer.copyNameAndMakeUnique('Image'),
                area: {x, y, w, h, r: 0},
                shape: 'image',
                shapeProps: {
                    image: imageUrl
                }
            };
            this.schemeContainer.addItem(image);
            EventBus.emitSchemeChangeCommited();
        },

        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },

        //calculates from screen to world
        x_(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        y_(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        z_(v) { return v * this.schemeContainer.screenTransform.scale; },

        //calculates coords from world to screen in view mode
        //TODO check why this formula is not aligned with myMath.js, how the hell is it working then?
        _vx(x) { return x * this.interactiveSchemeContainer.screenTransform.scale + this.interactiveSchemeContainer.screenTransform.x },
        _vy(y) { return y * this.interactiveSchemeContainer.screenTransform.scale + this.interactiveSchemeContainer.screenTransform.y; },
        _vz(v) { return v * this.interactiveSchemeContainer.screenTransform.scale; },
    },
    watch: {
        state(newState) {
            this.$store.dispatch('setEditorStateName', newState);
            this.$emit('switched-state', states[newState]);
        },
        mode(newMode) {
            if (newMode === 'edit') {
                userEventBus.clear();
                this.removeDrawnLinks();
                this.switchStateDragItem();
            } else if (newMode === 'view') {
                this.switchStateInteract();
            }
        },
        zoom(newZoom) {
            if (this.interactiveSchemeContainer) {
                this.interactiveSchemeContainer.screenTransform.scale = newZoom / 100.0;
            }
        }
    },
    computed: {
        transformSvg() {
            const x = Math.floor(this.schemeContainer.screenTransform.x || 0);
            const y = Math.floor(this.schemeContainer.screenTransform.y || 0);
            const scale = this.schemeContainer.screenTransform.scale || 1.0;
            return `translate(${x} ${y}) scale(${scale} ${scale})`;
        },
        transformSvgInteractiveMode() {
            const x = Math.floor(this.interactiveSchemeContainer.screenTransform.x || 0);
            const y = Math.floor(this.interactiveSchemeContainer.screenTransform.y || 0);
            const scale = this.interactiveSchemeContainer.screenTransform.scale || 1.0;
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
                    x: 0, y: 0
                };
            }
            return {
                x: Math.ceil(this.width / screenStep) + 1,
                y: Math.ceil(this.height / screenStep) + 1
            };
        },
        gridTransform() {
            const snapSize = myMath.getSnappingWidthForScale(this.schemeContainer.screenTransform.scale);
            const zSnap = snapSize * this.schemeContainer.screenTransform.scale;
            let x = Math.ceil(this.schemeContainer.screenTransform.x % zSnap) - zSnap;
            let y = Math.ceil(this.schemeContainer.screenTransform.y % zSnap) - zSnap;
            return `translate(${x} ${y})`;
        },
        curveEditItem() {
            return this.$store.state.curveEditing.item;
        },
        multiSelectBox() {
            return this.$store.getters.multiSelectBox;
        },
        horizontalSnapper() {
            return this.$store.getters.horizontalSnapper;
        },
        verticalSnapper() {
            return this.$store.getters.verticalSnapper;
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
