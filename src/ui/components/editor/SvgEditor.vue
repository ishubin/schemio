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
            :class="['mode-' + mode, 'state-' + state]"
            :style="{cursor: cursor, background: schemeContainer.scheme.style.backgroundColor}"
            @mousemove="mouseMove"
            @mousedown="mouseDown"
            @mouseup="mouseUp"
            @dblclick="mouseDoubleClick"
            data-void="true">

            <g v-if="mode === 'view'">
                <g v-if="interactiveSchemeContainer" data-type="scene-transform" :transform="transformSvgInteractiveMode">
                    <g v-for="item in interactiveSchemeContainer.worldItems" class="item-container"
                        v-if="item.visible"
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

                <g :transform="viewportTransform">
                    <g v-for="item in interactiveSchemeContainer.viewportItems" class="item-container"
                        v-if="item.visible"
                        :class="'item-cursor-' + item.cursor">
                        <item-svg 
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :mode="mode"
                            @custom-event="onItemCustomEvent"/>
                    </g>
                    <g v-for="item in viewportHighlightedItems" :transform="item.transform">
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
            </g>


            <!--  EDIT MODE -->

            <g v-if="mode === 'edit'">
                <g class="grid" data-preview-ignore="true" :transform="gridTransform" data-void="true">
                    <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height" 
                        :stroke="schemeContainer.scheme.style.gridColor"
                        data-void="true"
                    />
                    <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width" :y2="index * gridStep"
                        :stroke="schemeContainer.scheme.style.gridColor"
                        data-void="true"
                    />
                </g>

                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems"
                        v-if="item.visible"
                        class="item-container"
                        :class="'item-cursor-'+item.cursor">
                        >

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

                    <multi-item-edit-box  v-if="schemeContainer.multiItemEditBoxes.relative && state !== 'editCurve'"
                        :edit-box="schemeContainer.multiItemEditBoxes.relative"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"/>


                    <g v-for="item in worldHighlightedItems" :transform="item.transform">
                        <path :d="item.path" fill="none" :stroke="item.stroke"
                            :stroke-width="item.strokeSize+'px'"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            data-preview-ignore="true"/>
                    </g>

                </g>


                <g :transform="viewportTransform">
                    <g v-for="item in schemeContainer.viewportItems"
                        v-if="item.visible"
                        class="item-container"
                        :class="'item-cursor-'+item.cursor">
                        >

                        <item-svg
                            :key="`${item.id}-${item.shape}-${schemeContainer.revision}`"
                            :item="item"
                            :mode="mode"
                            />
                    </g>
                    <multi-item-edit-box  v-if="schemeContainer.multiItemEditBoxes.viewport && state !== 'editCurve'"
                        :edit-box="schemeContainer.multiItemEditBoxes.viewport"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"/>

                    <g v-for="item in viewportHighlightedItems" :transform="item.transform">
                        <path :d="item.path" fill="none" :stroke="item.stroke"
                            :stroke-width="item.strokeSize+'px'"
                            :data-item-id="item.id"
                            style="opacity: 0.5"
                            data-preview-ignore="true"/>
                    </g>
                </g>

                <!-- Item Text Editor -->    
                <in-place-text-edit-box v-if="inPlaceTextEditor.shown"
                    :key="`in-place-text-edit-${inPlaceTextEditor.itemId}-${inPlaceTextEditor.slotName}`"
                    :area="inPlaceTextEditor.area"
                    :css-style="inPlaceTextEditor.style"
                    :text="inPlaceTextEditor.text"
                    :viewport-transform="viewportTransform"
                    :relative-transform="transformSvg"
                    :transform-type="inPlaceTextEditor.transformType"
                    @close="closeItemTextEditor"
                    @updated="onInPlaceTextEditorUpdate"
                    />

                <g v-if="state === 'editCurve' && curveEditItem && curveEditItem.meta" :transform="curveEditItem.area.type === 'viewport' ? viewportTransform : transformSvg">
                    <curve-edit-box 
                        :key="`item-curve-edit-box-${curveEditItem.id}`"
                        :item="curveEditItem"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"/>
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

    </div>
</template>

<script>
import myMath from '../../myMath';
import {ItemInteractionMode} from '../../scheme/Item';
import StateInteract from './states/StateInteract.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateItem from './states/StateCreateItem.js';
import StateEditCurve from './states/StateEditCurve.js';
import StatePickElement from './states/StatePickElement.js';
import EventBus from './EventBus.js';
import MultiItemEditBox from './MultiItemEditBox.vue';
import CurveEditBox from './CurveEditBox.vue';
import ItemSvg from './items/ItemSvg.vue';
import {generateTextBox, generateTextStyle} from './text/ItemText';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import UserEventBus from '../../userevents/UserEventBus.js';
import Compiler from '../../userevents/Compiler.js';
import ContextMenu from './ContextMenu.vue';
import InPlaceTextEditBox from './InPlaceTextEditBox.vue';
import Shape from './items/shapes/Shape';
import htmlSanitize from '../../../htmlSanitize';
import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import Modal from '../Modal.vue';
import shortid from 'shortid';
import Events from '../../userevents/Events';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import max from 'lodash/max';

const EMPTY_OBJECT = {type: 'nothing'};
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
    interact: new StateInteract(EventBus, userEventBus),
    createItem: new StateCreateItem(EventBus),
    editCurve: new StateEditCurve(EventBus),
    dragItem: new StateDragItem(EventBus),
    pickElement: new StatePickElement(EventBus)
};
let currentState = states.interact;


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
    props: ['mode', 'width', 'height', 'schemeContainer', 'viewportTop', 'viewportLeft', 'shouldSnapToGrid', 'zoom'],
    components: {ItemSvg, ContextMenu, MultiItemEditBox, CurveEditBox, InPlaceTextEditBox, Modal},
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

        forEach(states, state => state.setViewportCorrection(this.viewportTop, this.viewportLeft));

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
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$on(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$on(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$on(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$on(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$on(EventBus.SHAPE_STYLE_APPLIED, this.onShapeStyleApplied);
        EventBus.$on(EventBus.ITEMS_HIGHLIGHTED, this.highlightItems);
    },
    mounted() {
        const svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.addEventListener('mousewheel', this.mouseWheel);
        }
    },
    beforeDestroy(){
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
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$off(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$off(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$off(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$off(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$off(EventBus.SHAPE_STYLE_APPLIED, this.onShapeStyleApplied);
        EventBus.$off(EventBus.ITEMS_HIGHLIGHTED, this.highlightItems);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.removeEventListener('mousewheel', this.mouseWheel);
        }
    },
    data() {
        return {
            interactiveSchemeContainer: null,
            mouseEventsEnabled: true,
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],
            state: 'interact',

            cursor: 'default',

            selectedItemLinks: [],
            lastHoveredItem: null,

            multiSelectBox: null,

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
                transformType: 'relative',
                style: {}
            },

            rotateAroundCenterModal: {
                shown: false,
                angle: 0,
                originalItemAreas: {} // used to reset back to it, so that user can experiment with multiple angles
            },

            curveEditItem: null,
            worldHighlightedItems: [ ],
            viewportHighlightedItems: [ ]
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
                    const boxId = element.getAttribute('data-multi-item-edit-box-id');
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBoxes[boxId]
                    };
                } else if (elementType === 'multi-item-edit-box-resize-dragger') {
                    const boxId = element.getAttribute('data-multi-item-edit-box-id');
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBoxes[boxId],
                        draggerEdges: map(element.getAttribute('data-dragger-edges').split(','), edge => edge.trim())
                    };
                } else if (elementType === 'multi-item-edit-box-edit-curve-link') {
                    const boxId = element.getAttribute('data-multi-item-edit-box-id');
                    return {
                        type: elementType,
                        multiItemEditBox: this.schemeContainer.multiItemEditBoxes[boxId],
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

            const boundingBox = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());

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
                this.curveEditItem = item;
                this.state = 'editCurve';
            } else {
                this.state = 'createItem';
            }
            states[this.state].reset();
            states[this.state].setItem(item);
        },

        onStartConnecting(item, worldPoint) {
            this.highlightItems([]);
            let localPoint = null;
            if (worldPoint) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, item);
            }
            states.editCurve.reset();
            const curveItem = states.editCurve.initConnectingFromSourceItem(item, localPoint);
            this.curveEditItem = curveItem;
            this.state = 'editCurve';
        },

        onCurveEditRequested(item) {
            this.highlightItems([]);
            this.state = 'editCurve';
            states.editCurve.reset();
            states.editCurve.setItem(item);
            this.curveEditItem = item;
        },

        onCurveEditStopped() {
            if (this.state === 'editCurve') {
                states.editCurve.cancel();
            }
        },

        highlightItems(itemIds) {
            this.worldHighlightedItems = [];
            this.viewportHighlightedItems = [];

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
                if (item.area.type === 'viewport') {
                    this.viewportHighlightedItems.push(itemHighlight);
                } else {
                    this.worldHighlightedItems.push(itemHighlight);
                }
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
            if (key === EventBus.KEY.ESCAPE) {
                states[this.state].cancel();
            } else if (key === EventBus.KEY.DELETE && this.mode === 'edit') {
                this.deleteSelectedItems();
            } else {
                states[this.state].keyPressed(key, keyOptions);
            }
        },

        onKeyUp(key, keyOptions) {
            if (key !== EventBus.KEY.ESCAPE && key != EventBus.KEY.DELETE) {
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

        onMultiSelectBoxAppear(multiSelectBox) {
            this.multiSelectBox = multiSelectBox;
        },
        onMultiSelectBoxDisappear() {
            this.multiSelectBox = null;
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
            if (this.viewportHighlightedItems.length > 0) {
                this.viewportHighlightedItems = [];
            }
            if (this.worldHighlightedItems.length > 0) {
                this.worldHighlightedItems = [];
            }
        },

        onVoidClicked(item) {
            this.removeDrawnLinks();
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
                clicked: () => {this.$emit('clicked-start-connecting', item);}
            }, {
                name: 'Add link',
                iconClass: 'fas fa-link',
                clicked: () => {this.$emit('clicked-add-item-link', item);}
            }, {
                name: 'Create scheme for this element...',
                iconClass: 'far fa-file',
                clicked: () => {this.$emit('clicked-create-child-scheme-to-item', item);}
            }, {
                name: 'Copy',
                clicked: () => {this.$emit('clicked-copy-selected-items', item);}
            }, {
                name: 'Delete',
                clicked: this.deleteSelectedItems
            }, {
                name: 'Rotate around center...',
                clicked: () => {this.triggerRotateAroundCenterModal();}
            }];
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

        onItemTextSlotEditTriggered(item, slotName, area) {
            // it is expected that text slot is always available with all fields as it is supposed to be enriched based on the return of getTextSlots function
            const itemTextSlot = item.textSlots[slotName];
            const worldPoint = this.schemeContainer.worldPointOnItem(area.x, area.y, item);

            this.inPlaceTextEditor.itemId = item.id;
            this.inPlaceTextEditor.slotName = slotName;
            this.inPlaceTextEditor.item = item;
            this.inPlaceTextEditor.text = itemTextSlot.text;
            this.inPlaceTextEditor.style = generateTextStyle(itemTextSlot);
            this.inPlaceTextEditor.style.width = `${area.w}px`;
            this.inPlaceTextEditor.style.height = `${area.h}px`;
            this.inPlaceTextEditor.transformType = item.area.type;
            this.inPlaceTextEditor.area.x = worldPoint.x;
            this.inPlaceTextEditor.area.y = worldPoint.y;
            this.inPlaceTextEditor.area.w = area.w;
            this.inPlaceTextEditor.area.h = area.h;
            this.inPlaceTextEditor.shown = true;
        },

        onInPlaceTextEditorUpdate(text) {
            if (this.inPlaceTextEditor.shown) {
                this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName].text = text;
            }
        },

        closeItemTextEditor() {
            if (this.inPlaceTextEditor.item) {
                EventBus.emitItemTextSlotEditCanceled(this.inPlaceTextEditor.item, this.inPlaceTextEditor.slotName);
                EventBus.emitSchemeChangeCommited(`item.${this.inPlaceTextEditor.item.id}.textSlots.${this.inPlaceTextEditor.slotName}.text`);
                EventBus.emitItemChanged(this.inPlaceTextEditor.item.id, `textSlots.${this.inPlaceTextEditor.slotName}.text`);
            }
            this.inPlaceTextEditor.shown = false;
        },

        updateInPlaceTextEditorStyle() {
            const textSlot = this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName];
            this.inPlaceTextEditor.style = generateTextStyle(textSlot);
            this.inPlaceTextEditor.style.width = `${this.inPlaceTextEditor.area.w}px`;
            this.inPlaceTextEditor.style.height = `${this.inPlaceTextEditor.area.h}px`;
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
            if (this.schemeContainer.selectedItems.length > 0) {
                forEach(this.schemeContainer.selectedItems, item => {
                    const originalItemArea = this.rotateAroundCenterModal.originalItemAreas[item.id];
                    // reseting back to original area, so that a user can re-submit the same angle from a modal and get the same result
                    if (originalItemArea) {
                        item.area.x = originalItemArea.x;
                        item.area.y = originalItemArea.y;
                        item.area.r = originalItemArea.r;
                    }
                });
                this.schemeContainer.rotateItemsAroundCenter(this.schemeContainer.selectedItems, angle);
                EventBus.emitSchemeChangeCommited();
            }
        },

        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },

        //calculates coords from world to screen in view mode
        _vx(x) { return x * this.interactiveSchemeContainer.screenTransform.scale + this.interactiveSchemeContainer.screenTransform.x },
        _vy(y) { return y * this.interactiveSchemeContainer.screenTransform.scale + this.interactiveSchemeContainer.screenTransform.y; },
        _vz(v) { return v * this.interactiveSchemeContainer.screenTransform.scale; },

        //calculates from screen to world in view mode
        vx_(x) { return x / this.interactiveSchemeContainer.screenTransform.scale - this.interactiveSchemeContainer.screenTransform.x; },
        vy_(y) { return y / this.interactiveSchemeContainer.screenTransform.scale - this.interactiveSchemeContainer.screenTransform.y; },
        vz_(v) { return v / this.interactiveSchemeContainer.screenTransform.scale; }
    },
    watch: {
        state(newState) {
            EventBus.$emit(EventBus.EDITOR_STATE_CHANGED, newState);
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
        viewportTop(value) {
            states[this.state].setViewportCorrection(value, this.viewportLeft);
        },
        viewportLeft(value) {
            states[this.state].setViewportCorrection(this.viewportTop, value);
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
        viewportTransform() {
            return `translate(${this.viewportLeft} ${this.viewportTop})`;
        },
        gridStep() {
            return 20 * this.schemeContainer.screenTransform.scale;
        },
        gridCount() {
            if (this.schemeContainer.screenTransform.scale > 0.6) {
                return {
                    x: Math.ceil(this.width / (20 *this.schemeContainer.screenTransform.scale)),
                    y: Math.ceil(this.height / (20 * this.schemeContainer.screenTransform.scale))
                };
            } else {
                return 0;
            }
        },
        gridTransform() {
            let x = Math.ceil(this.schemeContainer.screenTransform.x % (20 * this.schemeContainer.screenTransform.scale));
            let y = Math.ceil(this.schemeContainer.screenTransform.y % (20 * this.schemeContainer.screenTransform.scale));
            return `translate(${x} ${y})`;
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
    }
}
</script>

<style lang="css">
</style>
