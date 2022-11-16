<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-component">
        <QuickHelperPanel
            :key="`quick-helper-panel-${mode}`"
            v-if="currentSchemeContainer"
            :editorId="editorId"
            :scheme-container="currentSchemeContainer"
            :mode="mode"
            :state="state"
            :textSelectionEnabled="textSelectionEnabled"
            :zoom="zoom"
            :edit-allowed="editAllowed"
            :menuOptions="menuOptions"
            :historyUndoable="historyState.undoable"
            :historyRedoable="historyState.redoable"
            @shape-prop-changed="onItemShapePropChanged"
            @text-style-prop-change="onItemGenericTextSlotPropChanged"
            @clicked-zoom-to-selection="zoomToSelection()"
            @clicked-undo="historyUndo()"
            @clicked-redo="historyRedo()"
            @clicked-bring-to-front="bringSelectedItemsToFront()"
            @clicked-bring-to-back="bringSelectedItemsToBack()"
            @convert-path-points-to-simple="convertCurvePointToSimple()"
            @convert-path-points-to-bezier="convertCurvePointToBezier()"
            @zoom-changed="onZoomChanged"
            @zoomed-to-items="zoomToItems"
            @mode-changed="emitModeChangeRequested"
            @text-selection-changed="onTextSelectionForViewChanged"
            @stop-drawing-requested="stopDrawing"
            @path-edit-stopped="onPathEditStopped"
            >
            <ul class="button-group" v-if="mode === 'edit' && (modified || statusMessage.message)">
                <li v-if="modified">
                    <span class="btn btn-primary" @click="saveScheme()">Save</span>
                </li>
                <li v-if="statusMessage.message">
                    <div class="msg" :class="{'msg-error': statusMessage.isError, 'msg-info': !statusMessage.isError}">
                        {{statusMessage.message}}
                        <span class="msg-close" @click="clearStatusMessage"><i class="fas fa-times"/></span>
                    </div>
                </li>
            </ul>
            </QuickHelperPanel>

        <div class="scheme-editor-middle-section" ref="middleSection">
            <div class="scheme-error-message" v-if="!schemeContainer && schemeLoadErrorMessage">
                <h3>{{schemeLoadErrorMessage}}</h3>
            </div>

            <div class="scheme-container" oncontextmenu="return false;" v-if="schemeContainer">
                <SvgEditor
                    v-if="schemeContainer && mode === 'edit'"
                    :class="['state-' + state, 'sub-state-' + editorSubStateName]"
                    :editorId="editorId"
                    :key="`${schemeContainer.scheme.id}-edit-${editorRevision}`"
                    :schemeContainer="schemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :zoom="zoom"
                    :stateLayerShown="state === 'draw' || state === 'createItem'"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @svg-size-updated="onSvgSizeUpdated"
                    @item-tooltip-requested="onItemTooltipTriggered"
                    @item-side-panel-requested="onItemSidePanelTriggered"
                    >
                    <g slot="scene-transform">
                        <MultiItemEditBox  v-if="schemeContainer.multiItemEditBox && state !== 'editPath' && state !== 'cropImage' && !inPlaceTextEditor.shown"
                            :key="`multi-item-edit-box-${schemeContainer.multiItemEditBox.id}`"
                            :edit-box="schemeContainer.multiItemEditBox"
                            :zoom="schemeContainer.screenTransform.scale"
                            :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"
                            :controlPointsColor="schemeContainer.scheme.style.controlPointsColor"/>

                        <MultiItemEditBox  v-if="state === 'cropImage' && cropImage.editBox"
                            :key="`crop-image-edit-box`"
                            :edit-box="cropImage.editBox"
                            kind="crop-image"
                            :zoom="schemeContainer.screenTransform.scale"
                            :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"
                            :controlPointsColor="schemeContainer.scheme.style.controlPointsColor"/>

                        <g v-if="state === 'editPath' && curveEditItem && curveEditItem.meta">
                            <PathEditBox
                                :key="`item-curve-edit-box-${curveEditItem.id}`"
                                :editorId="editorId"
                                :item="curveEditItem"
                                :pathPointsUpdateKey="pathPointsUpdateKey"
                                :zoom="schemeContainer.screenTransform.scale"
                                :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                                :control-points-color="schemeContainer.scheme.style.controlPointsColor"/>
                        </g>
                    </g>

                    <div slot="overlay">
                        <div v-if="state === 'pickElement'" class="editor-top-hint-label">Click any element to pick it</div>

                        <FloatingHelperPanel v-if="floatingHelperPanel.shown && floatingHelperPanel.item"
                            :key="`floating-helper-panel-${floatingHelperPanel.item.id}`"
                            :editorId="editorId"
                            :x="floatingHelperPanel.x"
                            :y="floatingHelperPanel.y"
                            :item="floatingHelperPanel.item"
                            :schemeContainer="schemeContainer"
                            @edit-path-requested="onEditPathRequested"
                            />
                    </div>
                </SvgEditor>

                <SvgEditor
                    v-if="interactiveSchemeContainer && mode === 'view'"
                    :key="`${schemeContainer.scheme.id}-view-${editorRevision}`"
                    :editorId="editorId"
                    :schemeContainer="interactiveSchemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :textSelectionEnabled="textSelectionEnabled"
                    :zoom="zoom"
                    :userEventBus="userEventBus"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @svg-size-updated="onSvgSizeUpdated"
                    @item-tooltip-requested="onItemTooltipTriggered"
                    @item-side-panel-requested="onItemSidePanelTriggered"
                    >

                    <div slot="overlay">
                        <div v-if="mode === 'view' && textSelectionEnabled" class="editor-top-hint-label">
                            You can select any text, but you cannot interact with items
                            <span class="btn btn-primary" @click="textSelectionEnabled = false">Cancel</span>
                        </div>
                    </div>
                </SvgEditor>

                <!-- Item Text Editor -->
                <InPlaceTextEditBox v-if="inPlaceTextEditor.shown"
                    :key="`in-place-text-edit-${inPlaceTextEditor.item.id}-${inPlaceTextEditor.slotName}`"
                    :editorId="editorId"
                    :item="inPlaceTextEditor.item"
                    :slotName="inPlaceTextEditor.slotName"
                    :area="inPlaceTextEditor.area"
                    :css-style="inPlaceTextEditor.style"
                    :text="inPlaceTextEditor.text"
                    :markup-disabled="inPlaceTextEditor.markupDisabled"
                    :creating-new-item="inPlaceTextEditor.creatingNewItem"
                    :scalingVector="inPlaceTextEditor.scalingVector"
                    :zoom="schemeContainer.screenTransform.scale"
                    @close="closeItemTextEditor"
                    @updated="onInPlaceTextEditorUpdate"
                    @item-renamed="onInPlaceTextEditorItemRenamed"
                    @item-area-changed="onInPlaceTextEditorItemAreaChanged"
                    @item-text-cleared="onInPlaceTextEditorItemTextCleared"
                    />

            </div>


            <div v-if="mode === 'edit' && (animatorPanel.framePlayer || animationEditorCurrentFramePlayer)"
                class="bottom-panel"
                :style="{height: animationEditorCurrentFramePlayer ? `${bottomPanelHeight}px`: null}"
                >
                <div class="bottom-panel-dragger" @mousedown="onBottomPanelMouseDown" v-if="animationEditorCurrentFramePlayer"></div>
                <div class="bottom-panel-body">
                    <div class="side-panel-filler-left" :style="{width: `${sidePanelLeftWidth}px`}"></div>
                    <div class="bottom-panel-content">
                        <FrameAnimatorPanel
                            v-if="animationEditorCurrentFramePlayer"
                            :key="animationEditorCurrentFramePlayer.id"
                            :editorId="editorId"
                            :schemeContainer="schemeContainer"
                            :framePlayer="animationEditorCurrentFramePlayer"
                            :light="false"
                            @close="closeAnimatorEditor"
                            />

                        <FrameAnimatorPanel
                            v-else-if="animatorPanel.framePlayer"
                            :key="animatorPanel.framePlayer.id"
                            :editorId="editorId"
                            :schemeContainer="schemeContainer"
                            :framePlayer="animatorPanel.framePlayer"
                            :light="true"
                            @animation-editor-opened="onAnimatiorEditorOpened"
                            />
                    </div>
                    <div class="side-panel-filler-right" :style="{width: `${sidePanelRightWidth}px`}"></div>
                </div>
            </div>

            <div class="side-panel side-panel-left" ref="sidePanelLeft" v-if="mode === 'edit' && schemeContainer" :style="{width: `${sidePanelLeftWidth}px`}">
                <span class="side-panel-expander" @mousedown="onLeftSidePanelExpanderMouseDown">
                    <i v-if="sidePanelLeftWidth > 0" class="fas fa-angle-left"></i>
                    <i v-else class="fas fa-angle-right"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelLeftWidth > 0">
                    <div class="wrapper">
                        <CreateItemMenu :editorId="editorId" :scheme-container="schemeContainer" :projectArtEnabled="projectArtEnabled"
                            @item-picked-for-creation="switchStateCreateItem"
                            @path-edited="startPathEditing"
                            @drawing-requested="switchStateDrawing"
                            @state-drag-item-requested="cancelCurrentState"
                        />
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" ref="sidePanelRight" v-if="schemeContainer" :style="{width: `${sidePanelRightWidth}px`}">
                <span class="side-panel-expander" @mousedown="onRightSidePanelExpanderMouseDown">
                    <i v-if="sidePanelRightWidth > 0" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightWidth > 0">
                    <ul v-if="inPlaceTextEditor.item" class="tabs text-nonselectable">
                        <li><span class="tab active">Text</span></li>
                    </ul>
                    <ul v-else-if="editorStateName === 'draw'" class="tabs text-nonselectable">
                        <li><span class="tab active">Draw</span></li>
                    </ul>
                    <ul v-else class="tabs">
                        <li v-for="tab in tabs">
                            <span class="tab"
                                :class="{active: currentTab === tab}"
                                @click="currentTab = tab"
                                >{{tab}}</span>
                        </li>
                        <li v-if="comments && comments.enabled">
                            <span class="tab"
                                :class="{active: currentTab === 'Comments'}"
                                @click="currentTab = 'Comments'"
                                ><i class="fas fa-comment-alt"></i> {{comments.counter}}</span>

                        </li>
                        <li v-for="itemTextSlotTab in itemTextSlotsAvailable" v-if="mode === 'edit'">
                            <span class="tab"
                                :class="{active: currentTab === itemTextSlotTab.tabName}"
                                @click="currentTab = itemTextSlotTab.tabName"
                                >&#167; {{itemTextSlotTab.slotName}}</span>
                        </li>
                    </ul>

                    <div class="tabs-body" v-if="editorStateName === 'draw'">
                        <div v-for="color in drawColorPallete" class="draw-color-pallete-option" :style="{background: color}" @click="onDrawColorPicked(color)"></div>
                    </div>
                    <div v-else class="tabs-body">
                        <div v-if="currentTab === 'Doc' && schemeContainer && !inPlaceTextEditor.item">
                            <SchemeProperties v-if="mode === 'edit'"
                                :scheme-container="schemeContainer"
                                :editorId="editorId"
                                @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                @export-all-shapes="openExportAllShapesModal"
                                @delete-diagram-requested="$emit('delete-diagram-requested')"/>

                            <scheme-details v-else :scheme="schemeContainer.scheme"></scheme-details>
                        </div>

                        <div v-if="currentTab === 'Item' && !inPlaceTextEditor.item">
                            <div v-if="mode === 'edit'">
                                <panel name="Items">
                                    <ItemSelector
                                        :editorId="editorId"
                                        :scheme-container="schemeContainer"
                                        :min-height="200"
                                        :key="`${schemeRevision}-${schemeContainer.revision}`"
                                        @item-right-clicked="onItemRightClick"/>
                                </panel>

                                <ItemProperties v-if="schemeContainer.selectedItems.length > 0"
                                    :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                    :editorId="editorId"
                                    :item="schemeContainer.selectedItems[0]"
                                    :revision="schemeRevision"
                                    :schemeContainer="schemeContainer"
                                    :userStylesEnabled="userStylesEnabled"
                                    @shape-prop-changed="onItemShapePropChanged"
                                    @item-field-changed="onItemFieldChanged"
                                    @item-style-applied="onItemStyleApplied"
                                    @shape-changed="onItemShapeChanged"
                                    @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                />
                            </div>

                            <item-details v-if="sidePanelItemForViewMode && mode === 'view'" :item="sidePanelItemForViewMode"/>

                        </div>

                        <div v-if="currentTab === 'Comments' && comments && comments.enabled">
                            <Comments :entityId="commentsEntityId" :comments="comments"/>
                        </div>

                        <div v-if="inPlaceTextEditor.item && mode === 'edit'">
                            <TextSlotProperties
                                :editorId="editorId"
                                :item="inPlaceTextEditor.item"
                                :slot-name="inPlaceTextEditor.slotName"
                                @moved-to-slot="onTextSlotMoved(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0]);"
                                @property-changed="onInPlaceEditTextPropertyChanged(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0], arguments[1])"
                                />
                        </div>
                        <div v-else-if="mode === 'edit'">
                            <TextSlotProperties v-for="itemTextSlot in itemTextSlotsAvailable" v-if="currentTab === itemTextSlot.tabName"
                                :key="`text-slot-${itemTextSlot.item.id}-${itemTextSlot.slotName}`"
                                :editorId="editorId"
                                :item="itemTextSlot.item"
                                :slot-name="itemTextSlot.slotName"
                                @moved-to-slot="onTextSlotMoved(itemTextSlot.item, itemTextSlot.slotName, arguments[0]);"
                                @property-changed="onTextPropertyChanged(itemTextSlot.slotName, arguments[0], arguments[1])"
                                />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <context-menu v-if="customContextMenu.show"
            :key="customContextMenu.id"
            :mouse-x="customContextMenu.mouseX"
            :mouse-y="customContextMenu.mouseY"
            :options="customContextMenu.menuOptions"
            @close="customContextMenu.show = false"
            @selected="onCustomContextMenuOptionSelected"
        />


        <link-edit-popup v-if="addLinkPopup.shown"
            :edit="false" title="" url="" type=""
            @submit-link="onItemLinkSubmit"
            @close="addLinkPopup.shown = false"/>

        <item-tooltip v-if="itemTooltip.shown" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>

        <connector-destination-proposal v-if="connectorProposedDestination && connectorProposedDestination.shown"
            :x="connectorProposedDestination.mx"
            :y="connectorProposedDestination.my"
            :connector-item-id="connectorProposedDestination.connectorItemId"
            :scheme-container="schemeContainer"
            @item-selected="onConnectorDestinationItemSelected"
            @close="closeConnectorProposedDestination()"
        />

        <AdvancedBehaviorProperties v-if="advancedBehaviorProperties.shown" @close="advancedBehaviorProperties.shown = false"
            :editorId="editorId"
            :scheme-container="schemeContainer"
        />

        <shape-exporter-modal v-if="exportShapeModal.shown" :scheme="exportShapeModal.scheme" @close="exportShapeModal.shown = false"/>

        <modal v-if="isLoading" :width="380" :show-header="false" :show-footer="false" :use-mask="false">
            <div class="scheme-loading-icon">
                <div v-if="loadingStep === 'load'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Loading scheme...</span>
                </div>
                <div v-if="loadingStep === 'load-shapes'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Loading shapes...</span>
                </div>
                <div v-if="loadingStep === 'img-preload'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Preloading all images...  </span>
                    <span class="btn btn-secondary" @click="isLoading = false">Skip</span>
                </div>
            </div>
        </modal>

    </div>

</template>

<script>
import shortid from 'shortid';
import utils from '../utils.js';
import {dragAndDropBuilder} from '../dragndrop.js';
import myMath from '../myMath';
import { Keys } from '../events';

import {applyStyleFromAnotherItem, defaultItem, traverseItems } from '../scheme/Item';
import {enrichItemWithDefaults} from '../scheme/ItemFixer';
import { generateTextStyle } from './editor/text/ItemText';
import Dropdown from './Dropdown.vue';
import SvgEditor from './editor/SvgEditor.vue';
import MultiItemEditBox from './editor/MultiItemEditBox.vue';
import PathEditBox from './editor/PathEditBox.vue';
import InPlaceTextEditBox from './editor/InPlaceTextEditBox.vue';
import EventBus from './editor/EventBus.js';
import EditorEventBus from './editor/EditorEventBus.js';
import SchemeContainer, { worldPointOnItem, worldScalingVectorOnItem } from '../scheme/SchemeContainer.js';
import ItemProperties from './editor/properties/ItemProperties.vue';
import AdvancedBehaviorProperties from './editor/properties/AdvancedBehaviorProperties.vue';
import TextSlotProperties from './editor/properties/TextSlotProperties.vue';
import ItemDetails from './editor/ItemDetails.vue';
import SchemeProperties from './editor/SchemeProperties.vue';
import SchemeDetails from './editor/SchemeDetails.vue';
import CreateItemMenu   from './editor/CreateItemMenu.vue';
import LinkEditPopup from './editor/LinkEditPopup.vue';
import ItemTooltip from './editor/ItemTooltip.vue';
import ConnectorDestinationProposal from './editor/ConnectorDestinationProposal.vue';
import Comments from './Comments.vue';
import { snapshotSvg } from '../svgPreview.js';
import Shape from './editor/items/shapes/Shape.js';
import AnimationRegistry from '../animations/AnimationRegistry';
import Panel from './editor/Panel.vue';
import ItemSelector from './editor/ItemSelector.vue';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import ShapeExporterModal from './editor/ShapeExporterModal.vue';
import Modal from './Modal.vue';
import FrameAnimatorPanel from './editor/animator/FrameAnimatorPanel.vue';
import recentPropsChanges from '../history/recentPropsChanges';
import forEach from 'lodash/forEach';
import filter from 'lodash/filter';
import map from 'lodash/map';
import {copyToClipboard, getTextFromClipboard} from '../clipboard';
import QuickHelperPanel from './editor/QuickHelperPanel.vue';
import FloatingHelperPanel from './editor/FloatingHelperPanel.vue';
import StoreUtils from '../store/StoreUtils.js';
import ContextMenu from './editor/ContextMenu.vue';
import StrokePattern from './editor/items/StrokePattern';
import StateCreateItem from './editor/states/StateCreateItem.js';
import StateInteract from './editor/states/StateInteract.js';
import StateDragItem from './editor/states/StateDragItem.js';
import StateDraw from './editor/states/StateDraw.js';
import StateEditPath from './editor/states/StateEditPath.js';
import { mergeAllItemPaths } from './editor/states/StateEditPath.js';
import StateConnecting from './editor/states/StateConnecting.js';
import StatePickElement from './editor/states/StatePickElement.js';
import StateCropImage from './editor/states/StateCropImage.js';
import UserEventBus from '../userevents/UserEventBus.js';
import {applyItemStyle} from './editor/properties/ItemStyles';
import { collectAndLoadAllMissingShapes } from './editor/items/shapes/ExtraShapes.js';

const IS_NOT_SOFT = false;
const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};



function imgPreload(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
    });
}

function findAllImages(items) {
    const images = [];
    forEach(items, item => {
        const shape = Shape.find(item.shape);
        if (shape) {
            if (shape.argType('fill') === 'advanced-color') {
                if (item.shapeProps.fill.type === 'image' && item.shapeProps.fill.image) {
                    images.push(item.shapeProps.fill.image);
                }
            }
        }
    });
    return images;
}

function timeoutPromise(timeInMillis) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMillis);
    });
}

const schemeSettingsStorage = createSettingStorageFromLocalStorage('scheme-settings', 40);


const drawColorPallete = [
    "rgba(0, 0, 0, 1)",
    "rgba(76, 76, 76, 1)",
    "rgba(128, 128, 128, 1)",
    "rgba(170, 170, 170, 1)",
    "rgba(255, 255, 255, 1)",
    "rgba(254, 0, 0, 1)",
    "rgba(254, 154, 0, 1)",
    "rgba(255, 220, 0, 1)",
    "rgba(82, 237, 0, 1)",
    "rgba(0, 255, 215, 1)",
    "rgba(0, 236, 254, 1)",
    "rgba(0, 9, 254, 1)",
    "rgba(200, 0, 254, 1)",
    "rgba(254, 93, 93, 1)",
    "rgba(252, 176, 58, 1)",
    "rgba(249, 225, 78, 1)",
    "rgba(141, 241, 88, 1)",
    "rgba(93, 246, 222, 1)",
    "rgba(118, 241, 251, 1)",
    "rgba(137, 141, 242, 1)",
    "rgba(228, 156, 247, 1)",
];


export default {
    components: {
        SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, QuickHelperPanel, FloatingHelperPanel,
        LinkEditPopup, InPlaceTextEditBox,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        ConnectorDestinationProposal, AdvancedBehaviorProperties,
        Modal, ShapeExporterModal, FrameAnimatorPanel, PathEditBox,
        Comments, ContextMenu, MultiItemEditBox,
    },

    props: {
        editorId         : {type: String, required: true},
        mode             : {type: String, default: 'view'},
        scheme           : {type: Object, required: true},
        patchIndex       : {type: Object, default: null},
        editAllowed      : {type: Boolean, default: false},

        // means that it should handle all keyboard and mouse events as it is focused and not hidden
        active           : {type: Boolean, default: true},
        modified         : {type: Boolean, default: false},
        userStylesEnabled: {type: Boolean, default: false},
        projectArtEnabled: {type: Boolean, default: true},
        menuOptions      : {type: Array, default: []},
        historyUndoable  : { type: Boolean, required: true},
        historyRedoable  : { type: Boolean, required: true},

        //Used to signify that SchemeContainer needs to be recreted and item selection needs to be restored
        schemeReloadKey : {type: String, default: null},
        comments         : {type: Object, default: {
            enabled: false,
            isAdmin: false,
            allowed: false,
            counter: 0,
            provider: null
        }},
    },

    created() {
        const onCancel = () => this.cancelCurrentState();
        const onItemChanged = (itemId, propertyPath) => EditorEventBus.item.changed.specific.$emit(this.editorId, itemId, propertyPath);
        const onSchemeChangeCommitted = (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId);

        this.states = {
            interact: new StateInteract(EventBus, this.$store, this.userEventBus, {
                onCancel,
                onItemClicked: (item) => EditorEventBus.item.clicked.any.$emit(this.editorId, item),
                onVoidClicked: () => EditorEventBus.void.clicked.$emit(this.editorId),
                onItemTooltipRequested: (item, mx, my) => this.onItemTooltipTriggered(item, mx, my),
                onItemSidePanelRequested: (item) => this.onItemSidePanelTriggered(item),
                onItemLinksShowRequested: (item) => EditorEventBus.item.linksShowRequested.any.$emit(this.editorId, item),
                onItemChanged
            }),
            createItem: new StateCreateItem(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged
            }),
            editPath: new StateEditPath(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onHistoryStateChange: (undoable, redoable) => {
                    this.historyState.undoable = undoable;
                    this.historyState.redoable = redoable;
                },
                onPathPointsUpdated: () => { this.pathPointsUpdateKey++; },
                onContextMenuRequested: (mx, my, menuOptions) => this.onContextMenuRequested(mx, my, menuOptions),
                onItemChanged
            }),
            connecting: new StateConnecting(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged
            }),
            dragItem: new StateDragItem(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onStartConnecting: (item, point) => this.startConnecting(item, point),
                onVoidRightClicked: (mx, my) => this.onVoidRightClicked(mx, my),
                onVoidDoubleClicked: (x, y, mx, my) => EditorEventBus.void.doubleClicked.$emit(this.editorId, x, y, mx, my),
                onEditPathRequested: (item) => this.onEditPathRequested(item),
                onItemDeselected: (item) => EditorEventBus.item.deselected.specific.$emit(this.editorId, item.id),
                onItemTextSlotEditTriggered: (item, slotName, area, markupDisabled, creatingNewItem) => {
                    EditorEventBus.textSlot.triggered.specific.$emit(this.editorId, item, slotName, area, markupDisabled, creatingNewItem);
                },
                onItemRightClick: (item, mx, my) => this.onItemRightClick(item, mx, my),
                onItemChanged
            }),
            pickElement: new StatePickElement(EventBus, this.$store, {
                onCancel,
                onItemChanged
            }),
            cropImage: new StateCropImage(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged
            }),
            draw: new StateDraw(EventBus, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged
            }),
        };
    },

    beforeMount() {
        EditorEventBus.schemeChangeCommitted.$on(this.editorId, this.commitHistory);
        EditorEventBus.item.clicked.any.$on(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$on(this.editorId, this.onAnyItemChanged);
        EditorEventBus.item.selected.any.$on(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.item.deselected.any.$on(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.component.loadRequested.any.$on(this.editorId, this.onComponentLoadRequested);
        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        EditorEventBus.textSlot.triggered.any.$on(this.editorId, this.onItemTextSlotEditTriggered);
        EditorEventBus.elementPick.requested.$on(this.editorId, this.switchStatePickElement);
        EditorEventBus.elementPick.canceled.$on(this.editorId, this.onElementPickCanceled);
        this.registerEventBusHandlers();
    },
    beforeDestroy() {
        EditorEventBus.schemeChangeCommitted.$off(this.editorId, this.commitHistory);
        EditorEventBus.item.clicked.any.$off(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$off(this.editorId, this.onAnyItemChanged);
        EditorEventBus.item.selected.any.$off(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.item.deselected.any.$off(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.component.loadRequested.any.$off(this.editorId, this.onComponentLoadRequested);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        EditorEventBus.textSlot.triggered.any.$off(this.editorId, this.onItemTextSlotEditTriggered);
        EditorEventBus.elementPick.requested.$off(this.editorId, this.switchStatePickElement);
        EditorEventBus.elementPick.canceled.$off(this.editorId, this.onElementPickCanceled);
        this.deregisterEventBusHandlers();
    },

    mounted() {
        this.init();
    },

    data() {
        return {
            // this is used to trigger full reload of SvgEditor component
            // it is needed only when scheme is imported from file and if history is undone/redone
            editorRevision: 0,

            state: 'interact',
            userEventBus: new UserEventBus(this.editorId),

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),

            isLoading: false,
            loadingStep: 'load', // can be "load", "img-preload"
            schemeLoadErrorMessage: null,

            cropImage: {
                editBox: null,
                item: null
            },

            historyState: {
                undoable: this.historyUndoable,
                redoable: this.historyRedoable,
            },

            // used for triggering update of path points in PathEditBox component
            pathPointsUpdateKey: 0,

            inPlaceTextEditor: {
                item: null,
                slotName: '',
                markupDisabled: false,
                shown: false,
                area: {x: 0, y: 0, w: 100, h: 100},
                text: '',
                creatingNewItem: false,
                scalingVector: {x: 1, y: 1},
                style: {}
            },


            // a reference to an item that was clicked in view mode
            // this is used when the side panel for item is being requested
            sidePanelItemForViewMode: null,
            sidePanelRightWidth: 400,
            sidePanelRightWidthLastUsed: 400,
            sidePanelLeftWidth: 220,
            sidePanelLeftWidthLastUsed: 220,
            schemeContainer: null,
            interactiveSchemeContainer: null,

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

            zoom: 100,
            textSelectionEnabled: false,

            addLinkPopup: {
                item: null,
                shown: false
            },

            currentTab: 'Doc',
            tabs: [ 'Doc', 'Item'],

            offsetSaveTimerId: null,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            },

            // When an item is selected - we want to display additional tabs for it
            itemTextSlotsAvailable: [],

            exportShapeModal: {
                shown: false,
                scheme: null
            },

            advancedBehaviorProperties: {
                shown: false
            },

            drawColorPallete,

            animatorPanel: {
                framePlayer: null,
            },

            floatingHelperPanel: {
                shown: false,
                item: null,
                x: 0,
                y: 0
            },

            bottomPanelHeight: 300,

            eventsRegistered: false
        }
    },
    methods: {
        registerEventBusHandlers() {
            if (!this.eventsRegistered) {
                this.eventsRegistered = true;

                EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
                EventBus.$on(EventBus.KEY_UP, this.onKeyUp);
                EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
                EventBus.$on(EventBus.IMAGE_CROP_TRIGGERED, this.startCroppingImage);
                EventBus.$on(EventBus.ITEM_CREATION_DRAGGED_TO_SVG_EDITOR, this.itemCreationDraggedToSvgEditor);
                EventBus.$on(EventBus.FLOATING_HELPER_PANEL_UPDATED, this.updateFloatingHelperPanel);
            }
        },

        deregisterEventBusHandlers() {
            if (this.eventsRegistered) {
                this.eventsRegistered = false;
                EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
                EventBus.$off(EventBus.KEY_UP, this.onKeyUp);
                EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
                EventBus.$off(EventBus.IMAGE_CROP_TRIGGERED, this.startCroppingImage);
                EventBus.$off(EventBus.ITEM_CREATION_DRAGGED_TO_SVG_EDITOR, this.itemCreationDraggedToSvgEditor);
                EventBus.$off(EventBus.FLOATING_HELPER_PANEL_UPDATED, this.updateFloatingHelperPanel);
            }
        },

        init() {
            this.initSchemeContainer(this.scheme);
        },

        initSchemeContainer(scheme) {
            this.schemeLoadErrorMessage = null;
            this.loadingStep = 'load-shapes';
            this.isLoading = true;
            collectAndLoadAllMissingShapes(scheme.items, this.$store)
            .catch(err => {
                console.error(err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load shapes');
            })
            .then(() => {
                this.isLoading = false;
                this.schemeContainer = new SchemeContainer(scheme, this.editorId, EventBus, {
                    onSchemeChangeCommitted: (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId),
                });

                if (this.mode === 'view') {
                    this.switchToViewMode();
                } else {
                    this.switchToEditMode();
                }

                forEach(this.states, state => {
                    state.setSchemeContainer(this.schemeContainer);
                    state.reset();
                });

                if (this.mode === 'view') {
                    this.switchToViewMode();
                }

                const schemeSettings = schemeSettingsStorage.get(this.schemeId);
                if (schemeSettings && schemeSettings.screenPosition) {
                    // Text tab is only rendered when in place text edit is triggered
                    // therefore it does not make sense to set it as current on scheme load
                    if (schemeSettings.currentTab !== 'Text') {
                        this.currentTab = schemeSettings.currentTab;
                    }
                    this.schemeContainer.screenTransform.x = schemeSettings.screenPosition.offsetX;
                    this.schemeContainer.screenTransform.y = schemeSettings.screenPosition.offsetY;
                    this.zoom = parseFloat(schemeSettings.screenPosition.zoom);
                    this.schemeContainer.screenTransform.scale = parseFloat(this.zoom) / 100.0;
                } else {
                    if (this.schemeContainer.selectedItems.length > 0) {
                        const area = this.calculateZoomingAreaForItems(this.schemeContainer.selectedItems);
                        if (area) {
                            EditorEventBus.zoomToAreaRequested.$emit(this.editorId, area, false);
                        }
                    }
                }
                return this.schemeContainer;
            })
            .then(schemeContainer => {
                this.loadingStep = 'img-preload';
                const images = findAllImages(schemeContainer.getItems());
                return Promise.race([
                    Promise.all(map(images, imgPreload)),
                    timeoutPromise(10000)
                ]);
            })
            .then(() => {
                this.isLoading = false;
            });
        },

        onTextSelectionForViewChanged(textSelectionEnabled) {
            this.textSelectionEnabled = textSelectionEnabled;
        },

        cancelCurrentState() {
            if (this.mode === 'edit') {
                this.state = 'dragItem';
            } else {
                this.state = 'interact';
            }
            this.states[this.state].reset();
        },

        switchStateDragItem() {
            EventBus.emitItemsHighlighted([]);
            this.states.dragItem.schemeContainer = this.schemeContainer;
            this.states[this.state].cancel();
            this.state = 'dragItem';
            this.states.dragItem.reset();
        },


        switchStateInteract() {
            EventBus.emitItemsHighlighted([]);
            this.states.interact.schemeContainer = this.interactiveSchemeContainer;
            this.states[this.state].cancel();
            this.state = 'interact';
            this.states[this.state].reset();
            this.updateFloatingHelperPanel();
        },

        switchStatePickElement(elementPickCallback) {
            EventBus.emitItemsHighlighted([]);
            this.states.pickElement.reset();
            this.states.pickElement.schemeContainer = this.schemeContainer;
            this.states.pickElement.setElementPickCallback(elementPickCallback);
            this.state = 'pickElement';
            this.updateFloatingHelperPanel();
        },


        switchStateCreateItem(item) {
            EventBus.emitItemsHighlighted([]);
            this.states[this.state].cancel();
            if (item.shape === 'path') {
                item.shapeProps.points = [];
                this.setCurveEditItem(item);
                this.state = 'editPath';
                this.onEditPathRequested(item);
            } else if (item.shape === 'connector') {
                item.shapeProps.points = [];
                this.state = 'connecting';
                this.states['connecting'].setItem(item);
            } else {
                this.state = 'createItem';
            }
            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states[this.state].reset();
            this.states[this.state].setItem(item);
            this.updateFloatingHelperPanel();
        },

        setCurveEditItem(item) {
            this.$store.dispatch('setCurveEditItem', item);
        },

        startPathEditing(item) {
            EventBus.emitItemsHighlighted([]);
            this.states[this.state].cancel();

            item.shapeProps.points = [];
            this.setCurveEditItem(item);
            // making sure every new curve starts non-closed
            if (item.shape === 'path') {
                item.shapeProps.closed = false;
            }
            this.state = 'editPath';
            this.onEditPathRequested(item);

            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states[this.state].reset();
            this.states[this.state].setItem(item);
            this.updateFloatingHelperPanel();
        },

        switchStateDrawing() {
            EventBus.emitItemsHighlighted([]);

            this.states[this.state].cancel();
            this.state = 'draw';
            this.states.draw.schemeContainer = this.schemeContainer;
            this.states.draw.reset();
            this.updateFloatingHelperPanel();
        },

        stopDrawing() {
            if (this.state === 'draw') {
                this.states.draw.cancel();
            }
            this.updateFloatingHelperPanel();
        },

        startConnecting(sourceItem, worldPoint) {
            EventBus.emitItemsHighlighted([]);
            this.states[this.state].cancel();
            let localPoint = null;
            if (worldPoint) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, sourceItem);
            }
            this.states.connecting.schemeContainer = this.schemeContainer;
            this.states.connecting.reset();
            const connector = this.states.connecting.initConnectingFromSourceItem(sourceItem, localPoint);
            connector.shapeProps.smoothing = this.$store.state.defaultConnectorSmoothing;
            this.state = 'connecting';
            this.updateFloatingHelperPanel();
        },

        onDrawColorPicked(color) {
            if (this.state === 'draw') {
                this.states.draw.pickColor(color);
            }
        },

        onEditPathRequested(item) {
            EventBus.emitItemsHighlighted([]);
            this.states[this.state].cancel();
            this.state = 'editPath';
            this.states.editPath.reset();
            this.states.editPath.setItem(item);
            this.setCurveEditItem(item);
            this.updateFloatingHelperPanel();
        },

        onPathEditStopped() {
            if (this.state === 'editPath') {
                this.states.editPath.cancel();
            }
        },

        startCroppingImage(item) {
            EventBus.emitItemsHighlighted([]);
            this.states[this.state].cancel();
            this.state = 'cropImage';

            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states.cropImage.reset();
            this.cropImage.editBox = this.schemeContainer.generateMultiItemEditBox([item]);
            this.cropImage.item = item;
            this.states.cropImage.setImageEditBox(this.cropImage.editBox);
            this.states.cropImage.setImageItem(item);
            this.updateFloatingHelperPanel();
        },

        onElementPickCanceled() {
            if (this.state === 'pickElement') {
                this.states.pickElement.cancel();
            }
        },

        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled, creatingNewItem) {
            // it is expected that text slot is always available with all fields as it is supposed to be enriched based on the return of getTextSlots function
            const itemTextSlot = item.textSlots[slotName];
            const p0 = worldPointOnItem(area.x, area.y, item);
            const p1 = worldPointOnItem(area.x + area.w, area.y, item);
            const p2 = worldPointOnItem(area.x + area.w, area.y + area.h, item);
            const p3 = worldPointOnItem(area.x, area.y + area.h, item);
            const center = myMath.averagePoint(p0, p1, p2, p3);

            const worldWidth = myMath.distanceBetweenPoints(p0.x, p0.y, p1.x, p1.y);
            const worldHeight = myMath.distanceBetweenPoints(p0.x, p0.y, p3.x, p3.y);

            const scalingVector = worldScalingVectorOnItem(item);
            const x = center.x - worldWidth / 2;
            const y = center.y - worldHeight / 2;

            this.inPlaceTextEditor.slotName = slotName;
            this.inPlaceTextEditor.item = item;
            this.inPlaceTextEditor.text = itemTextSlot.text;
            this.inPlaceTextEditor.markupDisabled = markupDisabled;
            this.inPlaceTextEditor.style = generateTextStyle(itemTextSlot);
            this.inPlaceTextEditor.creatingNewItem = creatingNewItem;

            // the following correction was calculated empirically and to be honest was done poorly
            // I have no idea why it is needed, but for some reason in place text editor has
            // an offset proportional to the scaling effect of the item
            // Hopefully in future I can fix this differently
            const scaleCorrectionX = 1 / Math.max(0.0000001, scalingVector.x);
            const scaleCorrectionY = 1 / Math.max(0.0000001, scalingVector.y);

            this.inPlaceTextEditor.area.x = this._x(x) - scaleCorrectionX;
            this.inPlaceTextEditor.area.y = this._y(y) - scaleCorrectionY;
            this.inPlaceTextEditor.area.w = this._z(worldWidth);
            this.inPlaceTextEditor.area.h = this._z(worldHeight);
            this.inPlaceTextEditor.shown = true;
            this.inPlaceTextEditor.scalingVector = scalingVector;
            this.updateFloatingHelperPanel();
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
                this.schemeContainer.updateMultiItemEditBox();
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
                EditorEventBus.textSlot.canceled.specific.$emit(this.editorId, this.inPlaceTextEditor.item, this.inPlaceTextEditor.slotName);
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.inPlaceTextEditor.item.id}.textSlots.${this.inPlaceTextEditor.slotName}.text`);
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.inPlaceTextEditor.item.id, `textSlots.${this.inPlaceTextEditor.slotName}.text`);
                this.schemeContainer.reindexItems();
            }
            this.inPlaceTextEditor.shown = false;
            this.inPlaceTextEditor.item = null;
            this.inPlaceTextEditor.markupDisabled = false;
            this.inPlaceTextEditor.slotName = null;
        },

        updateInPlaceTextEditorStyle() {
            const textSlot = this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName];
            this.inPlaceTextEditor.style = generateTextStyle(textSlot);
        },

        onAnyItemChanged(itemId) {
            if (this.inPlaceTextEditor.item && this.inPlaceTextEditor.item.id === itemId) {
                this.updateInPlaceTextEditorStyle();
            }
        },

        emitModeChangeRequested(mode) {
            this.$emit('mode-change-requested', mode);
        },

        saveScheme() {
            const area = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());
            snapshotSvg('#svg_plot [data-type="scene-transform"]', area).then(svgPreview => {
                this.$emit('scheme-save-requested', this.schemeContainer.scheme, svgPreview);
            })
            .catch(err => {
                this.$emit('scheme-save-requested', this.schemeContainer.scheme);
            });
        },

        // Zooms to selected items in edit mode
        // - if no items were selected it zooms into all items
        // - if in view mode - then it will always zoom into all items
        zoomToSelection() {
            if (this.mode === 'edit') {
                if (this.schemeContainer.selectedItems.length > 0) {
                    this.zoomToItems(this.schemeContainer.selectedItems);
                } else {
                    this.zoomToItems(this.schemeContainer.getItems());
                }
            } else if (this.mode === 'view') {
                this.zoomToItems(this.interactiveSchemeContainer.getItems());
            }
        },

        zoomToItems(items) {
            if (items.length === 0) {
                return;
            }
            const area = this.calculateZoomingAreaForItems(items);
            if (area) {
                EditorEventBus.zoomToAreaRequested.$emit(this.editorId, area, true);
            }
        },

        calculateZoomingAreaForItems(items) {
            if (this.mode === 'view') {
                //filtering HUD items out as they are always shown in the viewport  in view mode
                items = this.interactiveSchemeContainer.filterNonHUDItems(items);
            }

            if (!items || items.length === 0) {
                return null;
            }

            let filteredItems = filter(items, item => item.visible && item.meta.calculatedVisibility);

            if (filteredItems.length === 0 && items.length > 0) {
                // this check is needed because in edit mode a user might select an item that is not visible
                // (e.g. in item selector componnent) and click 'zoom to it'
                filteredItems = items;
            }
            return this.schemeContainer.getBoundingBoxOfItems(filteredItems);
        },

        onClickedAddItemLink(item) {
            this.addLinkPopup.item = item;
            this.addLinkPopup.shown = true;
        },

        onClickedStartConnecting(sourceItem, x, y) {
            const point = { x: 0, y: 0 };
            point.x = x;
            point.y = y;
            this.startConnecting(sourceItem, point);
        },

        onItemLinkSubmit(link) {
            this.addLinkPopup.item.links.push({
                id: shortid.generate(),
                title: link.title,
                url: link.url,
                type: link.type,
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        startCreatingExternalComponentForItem(item) {
            this.startCreatingChildSchemeForItem(item, true);
        },

        startCreatingChildSchemeForItem(item, isExternalComponent) {
            throw new Error('not implemented');
        },

        onUpdateOffset(x, y) {
            this.initOffsetSave();
        },

        onZoomChanged(newZoom) {
            this.zoom = newZoom;
            this.initOffsetSave();
        },

        initOffsetSave() {
            if (this.offsetSaveTimerId) {
                clearTimeout(this.offsetSaveTimerId);
            }

            this.offsetSaveTimerId = setTimeout(()=> {
                this.offsetSaveTimerId = null;
                this.saveSchemeSettings();
            }, 200);
        },

        saveSchemeSettings() {
            schemeSettingsStorage.save(this.schemeContainer.scheme.id, {
                currentTab: this.currentTab,
                screenPosition: {
                    offsetX: this.schemeContainer.screenTransform.x,
                    offsetY: this.schemeContainer.screenTransform.y,
                    zoom: this.zoom
                }
            });
        },

        onAnyItemClicked(item) {
            this.sidePanelItemForViewMode = null;
            this.hideSidePanelRight();
        },

        onVoidClicked() {
            if (this.mode === 'view') {
                this.hideSidePanelRight();
                this.sidePanelItemForViewMode = null;
            }
        },

        onKeyPress(key, keyOptions) {
            if (!this.active) {
                return;
            }
            if (this.mode === 'edit') {
                if (key === Keys.CTRL_C) {
                    this.copySelectedItems();
                } else if (key === Keys.CTRL_V) {
                    this.pasteItemsFromClipboard();
                } else if (Keys.CTRL_S === key) {
                    this.saveScheme();
                } else if (Keys.CTRL_Z === key) {
                    this.historyUndo();
                } else if (Keys.CTRL_SHIFT_Z === key) {
                    this.historyRedo();
                } else if (Keys.CTRL_A === key) {
                    this.schemeContainer.selectAllItems();
                } else if (Keys.DELETE === key) {
                    if (this.state === 'editPath') {
                        this.states.editPath.deleteSelectedPoints();
                    } else if (this.state === 'dragItem') {
                        this.deleteSelectedItems();
                    }
                }
            }
            if (key === Keys.ESCAPE) {
                this.states[this.state].cancel();
            } else {
                this.states[this.state].keyPressed(key, keyOptions);
            }
        },

        copySelectedItems() {
            const copyBuffer = this.schemeContainer.copySelectedItems();
            copyToClipboard(copyBuffer);
        },

        copySelectedItemStyle() {
            const selectedItems = this.schemeContainer.getSelectedItems();
            if (selectedItems.length > 0) {
                StoreUtils.copyItemStyle(this.$store, selectedItems[0]);
            }
        },

        createComponentFromItem(refItem) {
            const worldPoint = worldPointOnItem(0, refItem.area.h * 1.2, refItem);

            const item = {
                area: {
                    x: worldPoint.x,
                    y: worldPoint.y,
                    w: refItem.area.w,
                    h: refItem.area.h,
                },
                name: `Component[${refItem.name}]`,
                shape: 'component',
                shapeProps: {
                    kind: 'embedded',
                    referenceItem: '#' + refItem.id,
                    autoZoom: false,
                    showButton: false
                }
            };
            enrichItemWithDefaults(item);

            this.schemeContainer.addItem(item);
        },

        applyCopiedItemStyle() {
            if (this.$store.state.copiedStyleItem) {
                forEach(this.schemeContainer.getSelectedItems(), item => {
                    applyStyleFromAnotherItem(this.$store.state.copiedStyleItem, item);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            }
        },

        pasteItemsFromClipboard() {
            getTextFromClipboard().then(text => {
                if (text) {
                    const items = this.schemeContainer.decodeItemsFromText(text);
                    if (items) {
                        this.isLoading = true;
                        this.loadingStep = 'load-shapes';
                        collectAndLoadAllMissingShapes(items, this.$store)
                        .catch(err => {
                            console.error(err);
                            StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load shapes');
                        })
                        .then(() => {
                            this.isLoading = false;
                            const centerX = (this.schemeContainer.screenSettings.width/2 - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale;
                            const centerY = (this.schemeContainer.screenSettings.height/2 - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale;
                            this.schemeContainer.pasteItems(items, centerX, centerY);
                            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        });
                    }
                }
            })
        },

        onItemTooltipTriggered(item, mouseX, mouseY) {
            this.itemTooltip.item = item;
            this.itemTooltip.x = mouseX;

            const rect = this.$refs.middleSection.getBoundingClientRect();
            this.itemTooltip.y = Math.max(rect.top, mouseY);
            this.itemTooltip.shown = true;
        },

        onItemSidePanelTriggered(item) {
            this.sidePanelItemForViewMode = item;
            this.showSidePanelRight();
            this.currentTab = 'Item';
        },

        commitHistory(affinityId) {
            this.$emit('history-committed', this.schemeContainer.scheme, affinityId);
        },

        historyEditAllowed() {
            return this.state === 'dragItem';
        },

        historyUndo() {
            if (this.state === 'editPath') {
                this.states.editPath.undo();
            } else if (this.historyEditAllowed()) {
                this.$emit('undo-history-requested');
            }
        },

        historyRedo() {
            if (this.state === 'editPath') {
                this.states.editPath.redo();
            } else if (this.historyEditAllowed()) {
                this.$emit('redo-history-requested');
            }
        },

        reloadSchemeContainer() {
            this.schemeContainer.scheme = this.scheme;
            this.schemeContainer.reindexItems();
            this.editorRevision++;
            this.updateRevision();
            this.restoreItemSelection();
            this.restoreCurveEditing();
        },

        restoreCurveEditing() {
            if (this.$store.state.editorStateName === 'editPath') {
                const storeItem = this.$store.state.curveEditing.item;
                if (!storeItem) {
                    return;
                }
                const existingItem = this.schemeContainer.findItemById(storeItem.id);
                if (existingItem) {
                    this.$store.dispatch('setCurveEditItem', existingItem);
                    this.onEditPathRequested(existingItem);
                } else {
                    this.$store.dispatch('setCurveEditItem', null);
                    if (this.$store.state.editorStateName === 'editPath') {
                        this.onPathEditStopped();
                    }
                }
            } else {
                this.$store.dispatch('setCurveEditItem', null);
            }
        },

        restoreItemSelection() {
            const selectedItemIds = map(this.schemeContainer.selectedItems, item => item.id);
            this.schemeContainer.deselectAllItems();

            forEach(selectedItemIds, itemId => {
                const item = this.schemeContainer.findItemById(itemId);
                if (item) {
                    this.schemeContainer.selectItem(item, true);
                }
            });
        },

        updateRevision() {
            this.schemeRevision = new Date().getTime();
        },

        bringSelectedItemsToFront() {
            this.schemeContainer.bringSelectedItemsToFront();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.updateRevision();
        },

        bringSelectedItemsToBack() {
            this.schemeContainer.bringSelectedItemsToBack();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.updateRevision();
        },

        onScreenTransformUpdated(screenTransform) {
            if (screenTransform) {
                this.zoom = Math.round(screenTransform.scale * 10000) / 100;
            }
            this.initOffsetSave();
            if (this.mode === 'edit') {
                this.updateFloatingHelperPanel();
            }
        },



        /**
         * Triggered when any item got selected or deselected
         */
        onItemSelectionUpdated() {
            if (this.schemeContainer.selectedItems.length > 0) {
                this.currentTab = 'Item';
                const item = this.schemeContainer.selectedItems[0];
                const shape = Shape.find(item.shape);
                if (!shape) {
                    return;
                }
                const textSlots = shape.getTextSlots(item);

                if (this.schemeContainer.selectedItems.length === 1 && this.schemeContainer.selectedItems[0].shape === 'frame_player') {
                    const item = this.schemeContainer.selectedItems[0];
                    this.animatorPanel.framePlayer = item;
                } else {
                    this.animatorPanel.framePlayer = null;
                }

                if (textSlots && textSlots.length > 0) {
                    this.itemTextSlotsAvailable = map(textSlots, textSlot => {
                        return {
                            tabName: `Text: ${textSlot.name}`,
                            slotName: textSlot.name,
                            item
                        };
                    });
                } else {
                    this.itemTextSlotsAvailable.length = 0;
                }
            } else {
                this.animatorPanel.framePlayer = null;
                this.itemTextSlotsAvailable.length = 0;
            }

            this.updateFloatingHelperPanel();
        },

        onTextSlotMoved(item, slotName, anotherSlotName) {
            if (anotherSlotName === slotName) {
                return;
            }
            item.textSlots[anotherSlotName] = utils.clone(item.textSlots[slotName]);
            item.textSlots[slotName].text = '';
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.${anotherSlotName}`);
            if (!this.inPlaceTextEditor.item) {
                this.currentTab = `Text: ${anotherSlotName}`;
            }

            EditorEventBus.textSlot.moved.$emit(this.editorId, item, slotName, anotherSlotName);
        },

        // triggered from ItemProperties or QuickHelperPanel components
        onItemShapePropChanged(name, type, value) {
            let itemIds = '';

            let reindexingNeeded = false;

            forEach(this.schemeContainer.selectedItems, item => {
                const shape = Shape.find(item.shape);
                if (shape) {
                    const propDescriptor = Shape.getShapePropDescriptor(shape, name);
                    if (propDescriptor && propDescriptor.type === type) {
                        this.schemeContainer.setPropertyForItem(item, item => {
                            item.shapeProps[name] = utils.clone(value);
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `shapeProps.${name}`);
                        });

                        item.meta.revision += 1;
                        itemIds += item.id;
                        recentPropsChanges.registerItemShapeProp(item.shape, name, value);
                    }

                    if (item.shape === 'component') {
                        if (item.shapeProps.kind !== 'embedded' && item._childItems) {
                            item._childItems = [];
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                        }

                        if (name === 'kind' || name === 'referenceItem' || name === 'placement') {
                            this.schemeContainer.reindexSpecifiedItems([item]);
                            reindexingNeeded = true;
                        }
                    }
                }

                if (item.shape === 'connector' && name === 'smoothing') {
                    reindexingNeeded = true;
                }
            });

            if (this.schemeContainer.selectedItems.length === 1) {
                const item = this.schemeContainer.selectedItems[0];
                if (item.shape === 'connector') {
                    // updating selected connector highlight path
                    StoreUtils.setSelectedConnectorPath(this.$store, Shape.find(item.shape).computeOutline(item));
                }
            }
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.shapeProps.${name}`);
            if (reindexingNeeded) {
                this.schemeContainer.reindexItems();
            }
        },

        onItemFieldChanged(name, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item[name] = utils.clone(value);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, name);
                });
                itemIds += item.id;
            });

            if (name === 'tags') {
                this.schemeContainer.reindexTags();
            }
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.${name}`);
        },

        onItemShapeChanged(shapeName) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item.shape = shapeName;
                    enrichItemWithDefaults(item);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'shape');
                });
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.shape`);
        },

        onItemStyleApplied(style) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (applyItemStyle(item, style)) {
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                    itemIds += item.id;
                }
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.${name}`);
        },

        onInPlaceEditTextPropertyChanged(item, textSlotName, propertyName, value) {
            if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                item.textSlots[textSlotName][propertyName] = utils.clone(value);
                recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
            }
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.textSlots.${textSlotName}.${propertyName}`);
        },

        // this is triggered from quick helper panel
        onItemGenericTextSlotPropChanged(propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots) {
                    forEach(item.textSlots, (textSlot, textSlotName) => {
                        item.textSlots[textSlotName][propertyName] = utils.clone(value);
                        recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                    });
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.*.${propertyName}`);
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.textSlots.*.${propertyName}`);

        },

        // this is triggerd from specific text slot in side panel
        onTextPropertyChanged(textSlotName, propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                    item.textSlots[textSlotName][propertyName] = utils.clone(value);
                    recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.${textSlotName}.${propertyName}`);
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.textSlots.${textSlotName}.${propertyName}`);
        },

        convertCurvePointToSimple() {
            if (this.state === 'editPath') {
                this.states[this.state].convertSelectedPointsToSimple();
            }
        },

        convertCurvePointToBezier() {
            if (this.state === 'editPath') {
                this.states[this.state].convertSelectedPointsToBezier();
            }
        },

        closeConnectorProposedDestination() {
            StoreUtils.disableProposeConnectorDestinationItems(this.$store);
        },

        /**
         * Invoked when user selects an item from ConnectorDestinationProposal panel during creation of a connector
         */
        onConnectorDestinationItemSelected(item) {
            if (this.state === 'connecting') {
                this.states[this.state].submitConnectorDestinationItem(item);
            }
        },

        clearStatusMessage() {
            this.$store.dispatch('clearStatusMessage');
        },

        switchToViewMode() {
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), this.editorId, EventBus, {
                onSchemeChangeCommitted: (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId),
            });
            this.interactiveSchemeContainer.screenTransform = utils.clone(this.schemeContainer.screenTransform);

            const boundingBox = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.filterNonHUDItems(this.schemeContainer.getItems()));

            this.interactiveSchemeContainer.screenSettings.boundingBox = boundingBox;
            AnimationRegistry.enableAnimations();
            this.switchStateInteract();
        },

        switchToEditMode() {
            this.interactiveSchemeContainer = null;
            AnimationRegistry.stopAllAnimations();
            this.switchStateDragItem();
        },

        onDrawColorPicked(color) {
            if (this.state === 'draw') {
                this.states.draw.pickColor(color);
            }
        },

        onSvgSizeUpdated({width, height}) {
            if (this.interactiveSchemeContainer) {
                this.interactiveSchemeContainer.screenSettings.width = width;
                this.interactiveSchemeContainer.screenSettings.height = height;
            }
        },

        onAnimatiorEditorOpened(framePlayer) {
            StoreUtils.startAnimationEditor(this.$store, framePlayer);
        },

        closeAnimatorEditor() {
            StoreUtils.startAnimationEditor(this.$store, null);
        },

        onComponentLoadRequested(item) {
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.getScheme) {
                return;
            }
            if (item._childItems && item._childItems.length > 0) {
                item._childItems = [];
            }
            item.meta.componentLoadFailed = false;

            this.$store.state.apiClient.getScheme(item.shapeProps.schemeId)
            .then(schemeDetails => {
                if (!schemeDetails || !schemeDetails.scheme) {
                    return Promise.reject('Empty document');
                }
                return collectAndLoadAllMissingShapes(schemeDetails.scheme.items, this.$store)
                .catch(err => {
                    console.error(err);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load shapes');
                })
                .then(() => {
                    return schemeDetails;
                });
            })
            .then(schemeDetails => {
                const scheme = schemeDetails.scheme;
                const componentSchemeContainer = new SchemeContainer(scheme, this.editorId, EventBus, {
                    onSchemeChangeCommitted: (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId),
                });
                this.interactiveSchemeContainer.attachItemsToComponentItem(item, componentSchemeContainer.scheme.items);
                this.interactiveSchemeContainer.prepareFrameAnimationsForItems();
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);

                if (item.shape === 'component' && item.shapeProps.autoZoom) {
                    this.zoomToItems([item]);
                }

                this.$nextTick(() => {
                    EditorEventBus.component.mounted.specific.$emit(this.editorId, item.id, item);
                });
            })
            .catch(err => {
                console.error(err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load component', 'scheme-component-load');
                item.meta.componentLoadFailed = true;
                EditorEventBus.component.loadFailed.specific.$emit(this.editorId, item.id, item);
            });
        },

        onItemRightClick(item, mouseX, mouseY) {
            const x = this.x_(mouseX);
            const y = this.y_(mouseY);

            const selectedOnlyOne = this.schemeContainer.multiItemEditBox && this.schemeContainer.multiItemEditBox.items.length === 1 || !this.schemeContainer.multiItemEditBox;

            this.customContextMenu.menuOptions = [{
                name: 'Bring to Front',
                clicked: () => {this.bringSelectedItemsToFront();}
            }, {
                name: 'Bring to Back',
                clicked: () => {this.bringSelectedItemsToBack();}
            }, {
                name: 'Connect',
                iconClass: 'fas fa-network-wired',
                clicked: () => {this.onClickedStartConnecting(item, x, y);}
            }, {
                name: 'Add link',
                iconClass: 'fas fa-link',
                clicked: () => {this.onClickedAddItemLink(item);}
            }];

            if (!this.offline && selectedOnlyOne) {
                if (item.shape === 'component' && item.shapeProps.kind === 'external') {
                    this.customContextMenu.menuOptions.push({
                        name: 'Create external diagram for this component...',
                        iconClass: 'far fa-file',
                        clicked: () => {this.startCreatingExternalComponentForItem(item); }
                    });
                } else {
                    this.customContextMenu.menuOptions.push({
                        name: 'Create diagram for this element...',
                        iconClass: 'far fa-file',
                        clicked: () => {this.startCreatingChildSchemeForItem(item); }
                    });
                }
            }

            this.customContextMenu.menuOptions = this.customContextMenu.menuOptions.concat([{
                name: 'Copy',
                iconsClass: 'fas fa-copy',
                clicked: () => {this.copySelectedItems(item);}
            }, {
                name: 'Copy item style',
                clicked: () => {this.copySelectedItemStyle(item);}
            }]);

            if (this.$store.state.copiedStyleItem) {
                this.customContextMenu.menuOptions.push({
                    name: 'Apply copied item style',
                    clicked: () => {this.applyCopiedItemStyle(item);}
                });
            }

            if (selectedOnlyOne) {
                this.customContextMenu.menuOptions.push({
                    name: 'Create component from this item',
                    clicked: () => {this.createComponentFromItem(item);}
                });
                if (item.shape === 'image') {
                    this.customContextMenu.menuOptions.push({
                        name: 'Crop image',
                        iconClass: 'fas fa-crop',
                        clicked: () => EventBus.$emit(EventBus.IMAGE_CROP_TRIGGERED, item)
                    });
                }
            } else {
                let allCurves = true;
                for (let i = 0; i < this.schemeContainer.multiItemEditBox.items.length && allCurves; i++) {
                    allCurves = this.schemeContainer.multiItemEditBox.items[i].shape === 'path';
                }
                if (allCurves) {
                    this.customContextMenu.menuOptions.push({
                        name: 'Merge paths',
                        clicked: () => this.mergePaths(this.schemeContainer.multiItemEditBox.items)
                    })
                }
            }

            this.customContextMenu.menuOptions = this.customContextMenu.menuOptions.concat([{
                name: 'Delete',
                iconClass: 'fas fa-trash',
                clicked: () => {this.deleteSelectedItems();}
            }, {
                name: 'Surround items',
                clicked: () => { this.surroundSelectedItems(); }
            }, {
                name: 'Export as SVG ...',
                iconsClass: 'fas fa-file-export',
                clicked: () => { this.exportSelectedItemsAsSVG(); }
            }, {
                name: 'Export as PNG ...',
                iconsClass: 'fas fa-file-export',
                clicked: () => { this.exportSelectedItemsAsPNG(); }
            }]);


            let items = [item];
            if (this.schemeContainer.multiItemEditBox) {
                items = this.schemeContainer.multiItemEditBox.items;
            }
            const alignSubOptions = [{
                name: 'Horizontally in parent',
                clicked: () => this.schemeContainer.alignItemsHorizontallyInParent(items)
            }, {
                name: 'Vertically in parent',
                clicked: () => this.schemeContainer.alignItemsVerticallyInParent(items)
            }, {
                name: 'Centered in parent',
                clicked: () => this.schemeContainer.alignItemsCenteredInParent(items)
            }];

            if (items.length > 1) {
                alignSubOptions.push({
                    name: 'All items horizontally',
                    clicked: () => this.schemeContainer.alignItemsHorizontally(items)
                });
                alignSubOptions.push({
                    name: 'All items vertically',
                    clicked: () => this.schemeContainer.alignItemsVertically(items)
                });
            }

            this.customContextMenu.menuOptions.push({
                name: 'Align',
                subOptions: alignSubOptions
            });


            if (selectedOnlyOne) {
                this.customContextMenu.menuOptions.push({
                    name: 'Events',
                    subOptions: [{
                        name: 'Init',
                        clicked: () => { this.addItemBehaviorEvent(item, 'init'); }
                    }, {
                        name: 'Clicked',
                        clicked: () => { this.addItemBehaviorEvent(item, 'clicked'); }
                    }, {
                        name: 'Mouse In',
                        clicked: () => { this.addItemBehaviorEvent(item, 'mousein'); }
                    }, {
                        name: 'Mouse Out',
                        clicked: () => { this.addItemBehaviorEvent(item, 'mouseout'); }
                    }]
                });
            }

            if (item.shape === 'path') {
                this.customContextMenu.menuOptions.push({
                    name: 'Edit Path',
                    clicked: () => { this.onEditPathRequested(item); }
                });
            }

            this.customContextMenu.mouseX = mouseX + 5;
            this.customContextMenu.mouseY = mouseY + 5;
            this.customContextMenu.id = shortid.generate();
            this.customContextMenu.show = true;
        },

        onVoidRightClicked(mouseX, mouseY) {
            if (this.mode === 'edit') {
                this.customContextMenu.menuOptions = [{
                    name: 'Paste',
                    clicked: () => {this.pasteItemsFromClipboard();}
                }];
                const svgRect = document.getElementById('svg_plot').getBoundingClientRect();
                this.customContextMenu.mouseX = mouseX + svgRect.left + 5;
                this.customContextMenu.mouseY = mouseY + svgRect.top + 5;
                this.customContextMenu.id = shortid.generate();
                this.customContextMenu.show = true;
            }
        },

        onContextMenuRequested(mouseX, mouseY, menuOptions) {
            this.customContextMenu.menuOptions = menuOptions;

            const svgRect = document.getElementById('svg_plot').getBoundingClientRect();
            this.customContextMenu.mouseX = mouseX + svgRect.left + 5;
            this.customContextMenu.mouseY = mouseY + svgRect.top + 5;
            this.customContextMenu.id = shortid.generate();
            this.customContextMenu.show = true;
        },

        onCustomContextMenuOptionSelected(option) {
            if (!option.subOptions) {
                option.clicked();
            }
            this.customContextMenu.show = false;
        },

        addItemBehaviorEvent(item, eventName) {
            const existingEvent = find(item.behavior.events, e => e.event === eventName);

            if (!existingEvent) {
                item.behavior.events.push({
                    id: shortid.generate(),
                    event: eventName,
                    actions: [ ]
                });
            }
            EventBus.$emit(EventBus.BEHAVIOR_PANEL_REQUESTED);
        },

        mergePaths(allItems) {
            const mainItem = allItems[0];
            allItems.shift();
            mergeAllItemPaths(mainItem, allItems);
            this.schemeContainer.readjustItem(mainItem.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
            this.schemeContainer.deleteItems(allItems);
            this.schemeContainer.selectItem(mainItem);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
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

        exportSelectedItemsAsSVG() {
            this.exportSelectedItemsAsPicture('svg');
        },

        exportSelectedItemsAsPNG() {
            this.exportSelectedItemsAsPicture('png');
        },

        exportSelectedItemsAsPicture(kind) {
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

            this.$emit('export-picture-requested', items, kind)
        },


        deleteSelectedItems() {
            this.schemeContainer.deleteSelectedItems();
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        itemCreationDraggedToSvgEditor(item, pageX, pageY) {
            const coords = this.mouseCoordsFromPageCoords(pageX, pageY);
            const p = this.toLocalPoint(coords.x, coords.y);
            item.area.x = p.x;
            item.area.y = p.y;

            item.area.w = item.area.w / Math.max(0.0000001, this.schemeContainer.screenTransform.scale);
            item.area.h = item.area.h / Math.max(0.0000001, this.schemeContainer.screenTransform.scale);

            const worldWidth = item.area.w;
            const worldHeight = item.area.h;

            this.schemeContainer.addItem(item);

            if (this.$store.state.autoRemount) {
                const proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(item, x => x.id !== item.id);
                if (proposedItemForMounting) {
                    this.schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, proposedItemForMounting.id);
                }
            }

            const sv = worldScalingVectorOnItem(item);

            item.area.w = worldWidth / Math.max(0.0000001, sv.x);
            item.area.h = worldHeight / Math.max(0.0000001, sv.y);

            this.schemeContainer.selectItem(item);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
            };
        },

        onKeyUp(key, keyOptions) {
            if (this.active && key !== Keys.ESCAPE && key != Keys.DELETE) {
                this.states[this.state].keyUp(key, keyOptions);
            }
        },

        mouseWheel(x, y, mx, my, event) {
            if (this.active) {
                this.states[this.state].mouseWheel(x, y, mx, my, event);
            }
        },

        mouseDown(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseDown(worldX, worldY, screenX, screenY, object, event);
            }
        },
        mouseUp(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseUp(worldX, worldY, screenX, screenY, object, event);
            }
        },
        mouseMove(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseMove(worldX, worldY, screenX, screenY, object, event);
            }
        },
        mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseDoubleClick(worldX, worldY, screenX, screenY, object, event);
            }
        },

        mouseCoordsFromPageCoords(pageX, pageY) {
            var rect = document.getElementById('svg_plot').getBoundingClientRect(),
                offsetX = pageX - rect.left,
                offsetY  = pageY - rect.top;

            return {
                x: Math.round(offsetX),
                y: Math.round(offsetY)
            }
        },

        updateFloatingHelperPanel() {
            if (!this.schemeContainer) {
                return;
            }
            if (this.state !== 'dragItem'
                || !this.states.dragItem.shouldAllowFloatingHelperPanel()
                || this.schemeContainer.selectedItems.length !== 1
                || this.inPlaceTextEditor.shown) {
                this.resetFloatingHelperPanel();
                return;
            }

            const item = this.schemeContainer.selectedItems[0];

            const worldPoints = [
                worldPointOnItem(0, 0, item),
                worldPointOnItem(item.area.w, 0, item),
                worldPointOnItem(item.area.w, item.area.h, item),
                worldPointOnItem(0,item.area.h, item),
            ];
            const min = {x: worldPoints[0].x, y: worldPoints[0].y};
            const max = {x: worldPoints[0].x, y: worldPoints[0].y};
            worldPoints.forEach(p => {
                min.x = Math.min(min.x, p.x);
                min.y = Math.min(min.y, p.y);
                max.x = Math.max(max.x, p.x);
                max.y = Math.max(max.y, p.y);
            });

            const topMargin = 115;
            const bottomMargin = 60;
            const panelExpectedHeight = 40;

            const minScreen = {x: this._x(min.x), y: this._y(min.y) - topMargin};
            const maxScreen = {x: this._x(max.x), y: this._y(max.y) + bottomMargin};
            const midX = (minScreen.x + maxScreen.x)/2;

            const svgRect = document.getElementById('svg_plot').getBoundingClientRect();

            if (midX < 0 || midX > svgRect.width) {
                this.resetFloatingHelperPanel();
                return;
            }

            let screenY = minScreen.y;
            if (screenY < 5) {
                screenY = maxScreen.y;
            }
            if (screenY < 5 || screenY > svgRect.height - panelExpectedHeight) {
                this.resetFloatingHelperPanel();
                return;
            }

            this.floatingHelperPanel.x = midX;
            this.floatingHelperPanel.y = screenY;
            this.floatingHelperPanel.item = item;
            this.floatingHelperPanel.shown = true;
        },

        resetFloatingHelperPanel() {
            if (this.floatingHelperPanel.shown) {
                this.floatingHelperPanel.shown = false;
                this.floatingHelperPanel.item = null;
            }
        },

        onBottomPanelMouseDown(originalEvent) {
            dragAndDropBuilder(originalEvent)
            .onDrag(event => {
                this.bottomPanelHeight = myMath.clamp(window.innerHeight - event.pageY, 100, window.innerHeight - 100);
            })
            .build();
        },

        openExportAllShapesModal() {
            this.exportShapeModal.scheme = this.schemeContainer.scheme;
            this.exportShapeModal.shown = true;
        },

        hideSidePanelRight() {
            this.sidePanelRightWidth = 0;
        },

        showSidePanelRight() {
            this.sidePanelRightWidth = this.sidePanelRightWidthLastUsed;
        },

        onRightSidePanelExpanderMouseDown(originalEvent) {
            this.onSidePanelExpanderMouseDown(originalEvent, this.$refs.sidePanelRight, 1, {
                onValue: value => {
                    this.sidePanelRightWidth = value;
                    if (value > 0) {
                        this.sidePanelRightWidthLastUsed = value;
                    }
                },
                onToggle: () => {
                    if (this.sidePanelRightWidth > 0) {
                        this.sidePanelRightWidth = 0;
                    } else {
                        this.sidePanelRightWidth = this.sidePanelRightWidthLastUsed;
                    }
                },
            });
        },

        onLeftSidePanelExpanderMouseDown(originalEvent) {
            this.onSidePanelExpanderMouseDown(originalEvent, this.$refs.sidePanelLeft, -1, {
                onValue: value => {
                    this.sidePanelLeftWidth = value;
                    if (value > 0) {
                        this.sidePanelLeftWidthLastUsed = value;
                    }
                },
                onToggle: () => {
                    if (this.sidePanelLeftWidth > 0) {
                        this.sidePanelLeftWidth = 0;
                    } else {
                        this.sidePanelLeftWidth = this.sidePanelLeftWidthLastUsed;
                    }
                },
            });
        },

        onSidePanelExpanderMouseDown(originalEvent, element, direction, callbacks) {
            const minWidth = 80;
            const originalWidth = element.getBoundingClientRect().width;
            const originalPageX = originalEvent.pageX;

            dragAndDropBuilder(originalEvent)
            .onDrag(event => {
                const dx = event.pageX - originalPageX;

                const newWidth = myMath.clamp(originalWidth - dx * direction, 0, window.innerWidth/2.5);
                if (newWidth < minWidth) {
                    callbacks.onValue(0);
                } else {
                    callbacks.onValue(newWidth);
                }
            })
            .onSimpleClick(() => {
                callbacks.onToggle();
            })
            .build();
        },


        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },

        //calculates from screen to world
        x_(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        y_(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y; },
        z_(v) { return v * this.schemeContainer.screenTransform.scale; },
    },

    filters: {
        capitalize(value) {
            return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
        }
    },

    watch: {
        mode(value) {
            if (value === 'view') {
                this.switchToViewMode();
            } else {
                this.switchToEditMode();
            }
        },

        active(active) {
            if (this.active) {
                this.registerEventBusHandlers();
            } else {
                this.deregisterEventBusHandlers();
            }
        },

        currentTab(newValue) {
            this.saveSchemeSettings();
        },

        state(newState) {
            this.$emit('editor-state-changed', newState);
        },

        schemeReloadKey(newValue) {
            this.reloadSchemeContainer();
        },

        historyUndoable(undoable) {
            this.historyState.undoable = undoable;
        },

        historyRedoable(redoable) {
            this.historyState.redoable = redoable;
        },
    },

    computed: {
        currentSchemeContainer() {
            if (this.mode === 'view') {
                return this.interactiveSchemeContainer;
            } else {
                return this.schemeContainer;
            }
        },

        connectorProposedDestination() {
            return this.$store.getters.connectorProposedDestination;
        },

        statusMessage() {
            return this.$store.getters.statusMessage;
        },

        editorStateName() {
            return this.$store.getters.editorStateName;
        },

        animationEditorCurrentFramePlayer() {
            return this.$store.getters.animationEditorCurrentFramePlayer;
        },

        commentsEntityId() {
            if (!this.scheme) {
                return 'offline-scheme';
            }
            return this.scheme.id;
        },

        apiClient() {
            return this.$store.getters.apiClient;
        },

        curveEditItem() {
            return this.$store.state.curveEditing.item;
        },

        editorSubStateName() {
            return this.$store.getters.editorSubStateName;
        },
    }
}
</script>

<style lang="css">
</style>
