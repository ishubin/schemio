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
            @dblclick="mouseDoubleClick">

            <g v-if="mode === 'view'">
                <g v-if="interactiveSchemeContainer" data-type="scene-transform" :transform="transformSvgInteractiveMode">
                    <g v-for="item in interactiveSchemeContainer.worldItems" class="item-container"
                        v-if="item.visible"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        <!-- Drawing search highlight box -->
                        <!-- TODO refactor it. It should be available for all item levels (childItems) -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />

                        <item-svg 
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                            @custom-event="onItemCustomEvent"/>
                    </g>
                </g>

                <g :transform="viewportTransform">
                    <g v-for="item in interactiveSchemeContainer.viewportItems" class="item-container"
                        v-if="item.visible"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        <!-- Drawing search highlight box -->
                        <!-- TODO refactor it. It should be available for all item levels (childItems) -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />

                        <item-svg 
                            :key="`${item.id}-${item.shape}`"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                            @custom-event="onItemCustomEvent"/>
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

                        <foreignObject :x="link.x + 16" :y="link.y - 11" :width="1000" height="30">
                            <span class="item-link-title">{{link | formatLinkTitle}}</span>
                        </foreignObject>
                    </a>
                </g>
            </g>


            <!--  EDIT MODE -->

            <g v-if="mode === 'edit'">
                <g class="grid" data-preview-ignore="true" :transform="gridTransform">
                    <line v-for="index in gridCount.x" :x1="index * gridStep" y1="0" :x2="index * gridStep" :y2="height" 
                        :stroke="schemeContainer.scheme.style.gridColor"
                    />
                    <line v-for="index in gridCount.y" x1="0" :y1="index * gridStep" :x2="width" :y2="index * gridStep"
                        :stroke="schemeContainer.scheme.style.gridColor"
                    />
                </g>
                <g data-type="scene-transform" :transform="transformSvg">
                    <g v-for="item in schemeContainer.worldItems" class="item-container"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        >

                        <!-- Drawing search highlight box -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />

                        <item-svg
                            :key="`${item.id}-${item.shape}-${schemeContainer.revision}`"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
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

                    <item-edit-box v-for="item in schemeContainer.selectedItems" v-if="item.area.type !== 'viewport' && state !== 'editCurve'"
                        :key="`item-edit-box-${item.id}`"
                        :item="item"
                        :zoom="schemeContainer.screenTransform.scale"
                        :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"/>

                    <!-- Drawing items hitbox so that connecting state is able to identify hovered items even when reroute point or connector line is right below it -->
                    <g v-if="state === 'connecting'">
                        <!-- TODO change the way connector hitbox is rendered to use its shape instead -->
                        <g v-for="item in schemeContainer.getItems()" :transform="`translate(${item.meta.transform.x},${item.meta.transform.y}) rotate(${item.meta.transform.r})`">
                            <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`">
                                <rect class="item-hitbox" data-preview-ignore="true"
                                    :data-item-id="item.id"
                                    :x="0"
                                    :y="0"
                                    :width="item.area.w"
                                    :height="item.area.h"
                                    fill="rgba(255, 0, 255, 0.0)"
                                    stroke="none"
                                    ></rect>
                            </g>
                        </g>
                    </g>
                </g>


                <g :transform="viewportTransform">
                    <g v-for="item in schemeContainer.viewportItems" class="item-container"
                        :class="[item.meta.selected?'selected':'', 'item-cursor-' + item.cursor]">
                        >

                        <!-- Drawing search highlight box -->
                        <rect v-if="item.meta.searchHighlighted" class="item-search-highlight"
                            :x="item.area.x - 5"
                            :y="item.area.y - 5"
                            :width="item.area.w + 10"
                            :height="item.area.h + 10"
                        />

                        <item-svg
                            :key="`${item.id}-${item.shape}-${schemeContainer.revision}`"
                            :item="item"
                            :mode="mode"
                            :scheme-container="schemeContainer"
                            :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                            />
                    </g>
                    <item-edit-box v-for="item in schemeContainer.selectedItems" v-if="item.area.type === 'viewport' && state !== 'editCurve'"
                        :key="`item-edit-box-${item.id}`"
                        :item="item"
                        :zoom="1"
                        :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"/>
                </g>

                <!-- Item Text Editor -->    
                <g v-if="itemTextEditor.shown" :transform="itemTextEditor.area.type === 'viewport' ? viewportTransform : transformSvg">
                    <foreignObject :x="itemTextEditor.area.x" :y="itemTextEditor.area.y" :width="itemTextEditor.area.w" :height="itemTextEditor.area.h">
                        <div id="item-text-editor" class="item-text-container" :style="itemTextEditor.style" v-html="itemTextEditor.text" contenteditable="true"></div>
                    </foreignObject>
                </g>

                <g v-if="state === 'editCurve' && curveEditItem && curveEditItem.meta" :transform="curveEditItem.area.type === 'viewport' ? viewportTransform : transformSvg">
                    <curve-edit-box 
                        :key="`item-curve-edit-box-${curveEditItem.id}`"
                        :item="curveEditItem"
                        :zoom="1"
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

        <context-menu v-if="contextMenu.show"
            :key="contextMenu.id"
            :mouse-x="contextMenu.mouseX"
            :mouse-y="contextMenu.mouseY"
            @close="contextMenu.show = false"
        >
            <ul>
                <li @click="$emit('clicked-bring-to-front')">
                    Bring to Front
                </li>
                <li @click="$emit('clicked-bring-to-back')">
                    Bring to Back
                </li>
                <li @click="$emit('clicked-start-connecting', contextMenu.item)">
                    <i class="fas fa-network-wired"></i> Connect
                </li>
                <li @click="$emit('clicked-add-item-link', contextMenu.item)">
                    <i class="fas fa-link"></i> Add link
                </li>
                <li @click="$emit('clicked-add-item-to-item', contextMenu.item)">
                    <i class="far fa-plus-square"></i> Add item
                </li>
                <li @click="$emit('clicked-create-child-scheme-to-item', contextMenu.item)">
                    <i class="far fa-file"></i> Create scheme for this element...
                </li>
                <li @click="copySelectedItems()">
                    Copy
                </li>
                <li @click="deleteSelectedItemsAndConnectors()">
                    <i class="fa fa-times"></i> Delete
                </li>
            </ul>
        </context-menu>

        <context-menu v-if="customContextMenu.show"
            :key="customContextMenu.id"
            :mouse-x="customContextMenu.mouseX"
            :mouse-y="customContextMenu.mouseY"
            @close="customContextMenu.show = false"
        >
            <ul>
                <li v-for="(option, optionIndex) in customContextMenu.menuOptions" @click="onCustomMenuOptionSelected(optionIndex)">
                    {{option.name}}
                </li>
            </ul>
        </context-menu>

    </div>
</template>

<script>
import StateInteract from './states/StateInteract.js';
import StateDragItem from './states/StateDragItem.js';
import StateCreateItem from './states/StateCreateItem.js';
import StateEditCurve from './states/StateEditCurve.js';
import StateConnecting from './states/StateConnecting.js';
import StatePickElement from './states/StatePickElement.js';
import EventBus from './EventBus.js';
import ItemEditBox from './ItemEditBox.vue';
import CurveEditBox from './CurveEditBox.vue';
import ItemSvg from './items/ItemSvg.vue';
import linkTypes from './LinkTypes.js';
import utils from '../../utils.js';
import SchemeContainer from '../../scheme/SchemeContainer.js';
import UserEventBus from '../../userevents/UserEventBus.js';
import Compiler from '../../userevents/Compiler.js';
import ContextMenu from './ContextMenu.vue';
import Shape from './items/shapes/Shape';
import htmlSanitize from '../../../htmlSanitize';
import AnimationRegistry from '../../animations/AnimationRegistry';
import ValueAnimation from '../../animations/ValueAnimation';
import shortid from 'shortid';
import Events from '../../userevents/Events';

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
    connecting: new StateConnecting(EventBus),
    pickElement: new StatePickElement(EventBus)
};
let currentState = states.interact;

export default {
    props: ['mode', 'width', 'height', 'schemeContainer', 'viewportTop', 'viewportLeft', 'shouldSnapToGrid'],
    components: {ItemSvg, ContextMenu, ItemEditBox, CurveEditBox},
    beforeMount() {
        _.forEach(states, state => {
            state.setSchemeContainer(this.schemeContainer);
            state.setEditor(this);
        })
        if (this.mode === 'edit') {
            this.switchStateDragItem();
        } else {
            this.switchStateInteract();
        }

        EventBus.$on(EventBus.START_CREATING_COMPONENT, this.onSwitchStateCreateItem);
        EventBus.$on(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$on(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$on(EventBus.ITEM_LINKS_SHOW_REQUESTED, this.onShowItemLinks);
        EventBus.$on(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$on(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$on(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$on(EventBus.ITEM_INEDITOR_TEXTEDIT_TRIGGERED, this.onItemInEditorTextEditTriggered);
        EventBus.$on(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$on(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$on(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
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
        EventBus.$off(EventBus.START_CONNECTING_ITEM, this.onSwitchStateConnecting);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$off(EventBus.BRING_TO_VIEW, this.onBringToView);
        EventBus.$off(EventBus.ITEM_LINKS_SHOW_REQUESTED, this.onShowItemLinks);
        EventBus.$off(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.switchStateDragItem);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_APPEARED, this.onMultiSelectBoxAppear);
        EventBus.$off(EventBus.MULTI_SELECT_BOX_DISAPPEARED, this.onMultiSelectBoxDisappear);
        EventBus.$off(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$off(EventBus.ITEM_INEDITOR_TEXTEDIT_TRIGGERED, this.onItemInEditorTextEditTriggered);
        EventBus.$off(EventBus.ELEMENT_PICK_REQUESTED, this.onElementPickRequested);
        EventBus.$off(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$off(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);

        var svgElement = document.getElementById('svg_plot');
        if (svgElement) {
            svgElement.removeEventListener('mousewheel', this.mouseWheel);
        }
    },
    data() {
        return {
            // TODO move them outside of Vue component. They don't have to be reactive

            interactiveSchemeContainer: null,
            mouseEventsEnabled: true,
            linkPalette: ['#ec4b4b', '#bd4bec', '#4badec', '#5dec4b', '#cba502', '#02cbcb'],
            state: 'interact',

            cursor: 'default',

            selectedItemLinks: [],
            lastHoveredItem: null,

            multiSelectBox: null,

            contextMenu: {
                id: shortid.generate(),
                show: false,
                item: null,
                mouseX: 0, mouseY: 0,
                selectedMultipleItems: false
            },

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

            itemTextEditor: {
                shown: false,
                property: 'text',
                itemId: null,
                text: '',
                style: {},
                area: {x: 0, y: 0, w: 0, h: 0, type: 'relative'}
            },

            curveEditItem: null,

        };
    },
    methods: {
        copySelectedItems() {
            this.schemeContainer.copySelectedItems();
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

        identifyElement(element) {
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
                }

                const itemId = element.getAttribute('data-item-id');
                if (itemId) {
                    return {
                        item: this.schemeContainer.findItemById(itemId)
                    }
                }

                const connectorId = element.getAttribute('data-connector-id');
                if (connectorId) {
                    const connector = this.schemeContainer.findConnectorById(connectorId);
                    if (connector) {
                        return {
                            connector,
                        };
                    }
                }

                const rerouteIndex = element.getAttribute('data-reroute-index');
                if (rerouteIndex) {
                    const path = rerouteIndex.split('/');
                    const connectorId = path[0];
                    const connector = this.schemeContainer.findConnectorById(connectorId);
                    if (connector) {
                        return {
                            connector,
                            rerouteId: path[1],
                        };
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
                                item
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
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseMove(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseDown(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseDown(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseUp(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseUp(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
            }
        },
        mouseDoubleClick(event) {
            if (this.mouseEventsEnabled) {
                var coords = this.mouseCoordsFromEvent(event);
                var p = this.toLocalPoint(coords.x, coords.y);

                states[this.state].mouseDoubleClick(p.x, p.y, coords.x, coords.y, this.identifyElement(event.srcElement), event);
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
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), EventBus);
            this.interactiveSchemeContainer.screenTransform.x = this.schemeContainer.screenTransform.x;
            this.interactiveSchemeContainer.screenTransform.y = this.schemeContainer.screenTransform.y;
            this.interactiveSchemeContainer.screenTransform.scale = this.schemeContainer.screenTransform.scale;

            states.interact.schemeContainer = this.interactiveSchemeContainer;
            this.state = 'interact';

            const boundingBox = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());
            let maxX = boundingBox.x + boundingBox.w,
                maxY = boundingBox.y + boundingBox.h;
            this.interactiveSchemeContainer.screenSettings.width = this.width;
            this.interactiveSchemeContainer.screenSettings.height = this.height;
            this.interactiveSchemeContainer.screenSettings.x1 = -maxX + 100;
            this.interactiveSchemeContainer.screenSettings.y1 = -maxY + 50;
            this.interactiveSchemeContainer.screenSettings.x2 = (this.width - boundingBox.x) - 100;
            this.interactiveSchemeContainer.screenSettings.y2 = (this.height - boundingBox.y) - 50;

            this.reindexUserEvents();
            states[this.state].reset();
        },
        switchStateDragItem() {
            this.state = 'dragItem';
            states.dragItem.reset();
        },
        switchStatePickElement(elementPickCallback) {
            this.state = 'pickElement';
            states.pickElement.reset();
            states.pickElement.setElementPickCallback(elementPickCallback);
        },
        onSwitchStateCreateItem(item) {
            if (item.shape === 'curve') {
                this.curveEditItem = item;
                this.state = 'editCurve';
            } else {
                this.state = 'createItem';
            }
            states[this.state].reset();
            states[this.state].setItem(item);
        },
        onSwitchStateConnecting(item) {
            this.state = 'connecting';
            states.connecting.reset();
            states.connecting.setSourceItem(item);
        },

        onCurveEditRequested(item) {
            this.state = 'editCurve';
            states.editCurve.reset();
            states.editCurve.setItem(item);
            this.curveEditItem = item;
        },

        reindexUserEvents() {
            userEventBus.clear();

            // ids of items that have subscribed for Init event
            const itemsForInit = {};

            _.forEach(this.interactiveSchemeContainer.getItems(), item => {
                if (item.behavior) {
                    _.forEach(item.behavior, rule => {
                        if (!rule.on) {
                            return;
                        }
                        const eventCallback = behaviorCompiler.compileActions(this.interactiveSchemeContainer, item, rule.do);

                        if (rule.on.element && rule.on.element.item) {
                            if (!rule.on.element.connector) {
                                let itemId = rule.on.element.item;
                                if (itemId === 'self') {
                                    itemId = item.id;
                                }
                                if (rule.on.event === Events.standardEvents.init.id) {
                                    itemsForInit[itemId] = 1;
                                }
                                userEventBus.subscribeItemEvent(itemId, rule.on.event, rule.on.args, eventCallback);
                            }
                        }
                    })
                }
            });

            _.forEach(itemsForInit, (val, itemId) => {
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
                this.deleteSelectedItemsAndConnectors();
            } else {
                states[this.state].keyPressed(key, keyOptions);
            }
        },

        onKeyUp(key, keyOptions) {
            if (key !== EventBus.KEY.ESCAPE && key != EventBus.KEY.DELETE) {
                states[this.state].keyUp(key, keyOptions);
            }
        },

        deleteSelectedItemsAndConnectors() {
            this.schemeContainer.deleteSelectedItemsAndConnectors();
            EventBus.emitSchemeChangeCommited();
            this.$emit('deleted-items');
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
                this.startLinksAnimation();
            }
        },

        onAnyItemClicked(item) {
            this.removeDrawnLinks();
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
            const headerHeight = 50;
            let newZoom = 1.0;
            if (area.w > 0 && area.h > 0 && this.width - 400 > 0 && this.height > 0) {
                newZoom = Math.floor(100.0 * Math.min(this.width/area.w, (this.height - headerHeight)/area.h)) / 100.0;
                newZoom = Math.max(0.05, Math.min(newZoom, 1.0));
            }

            const oldX = this.schemeContainer.screenTransform.x;
            const oldY = this.schemeContainer.screenTransform.y;
            const oldZoom = this.schemeContainer.screenTransform.scale;

            const destX = this.width/2 - (area.x + area.w/2) * newZoom;
            const destY = (this.height)/2 - (area.y - headerHeight + area.h/2) *newZoom;

            AnimationRegistry.play(new ValueAnimation({
                durationMillis: 1000,
                update: (t) => {
                    this.schemeContainer.screenTransform.scale = (oldZoom * (1.0 - t) + newZoom * t);
                    this.schemeContainer.screenTransform.x = oldX * (1.0 - t) + destX * t;
                    this.schemeContainer.screenTransform.y = oldY * (1.0 - t) + destY * t;
                }, 
                destroy: () => {
                    EventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, this.schemeContainer.screenTransform);
                }
            }));
        },

        startLinksAnimation() {
            AnimationRegistry.play(new ValueAnimation({
                durationMillis: 300,

                update: (t) => {
                    _.forEach(this.selectedItemLinks, link => {
                        link.x = link.startX * (1.0 - t) + link.destinationX * t;
                        link.y = link.startY * (1.0 - t) + link.destinationY * t;
                    });
                }
            }));
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

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
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
            this.contextMenu.selectedMultipleItems = this.schemeContainer.selectedItems.length > 1;
            this.contextMenu.show = true;
            this.contextMenu.id = shortid.generate();
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
            this.itemTextEditor.text = htmlSanitize(item[textEditArea.property]);
            this.itemTextEditor.property = textEditArea.property;
            this.itemTextEditor.style = textEditArea.style;
            this.itemTextEditor.area.type = item.area.type;
            const worldPoint = this.schemeContainer.worldPointOnItem(0, 0, item);
            if (textEditArea.area) {
                this.itemTextEditor.area = textEditArea.area;
                this.itemTextEditor.area.x = worldPoint.x + textEditArea.area.x;
                this.itemTextEditor.area.y = worldPoint.y + textEditArea.area.y;
                this.itemTextEditor.area.w = textEditArea.area.w;
                this.itemTextEditor.area.h = textEditArea.area.h;
            } else {
                this.itemTextEditor.area.x = worldPoint.x;
                this.itemTextEditor.area.y = worldPoint.y;
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

        onItemCustomEvent(event) {
            userEventBus.emitItemEvent(event.itemId, event.eventName, event.args);
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

        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },
        x_(x) { return x / this.schemeContainer.screenTransform.scale - this.schemeContainer.screenTransform.x; },
        y_(y) { return y / this.schemeContainer.screenTransform.scale - this.schemeContainer.screenTransform.y; },
        z_(v) { return v / this.schemeContainer.screenTransform.scale; }
    },
    watch: {
        mode(newMode) {
            if (newMode === 'edit') {
                userEventBus.clear();
                this.removeDrawnLinks();
                this.switchStateDragItem();
            } else if (newMode === 'view') {
                this.switchStateInteract();
            }
        },
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
