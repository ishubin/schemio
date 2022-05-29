<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-view">
        <quick-helper-panel
            :key="`quick-helper-panel-${mode}`"
            v-if="currentSchemeContainer"
            :scheme-container="currentSchemeContainer"
            :mode="mode"
            :zoom="zoom"
            :edit-allowed="offlineMode || editAllowed"
            :is-static-editor="isStaticEditor"
            :menuOptions="menuOptions"
            @shape-prop-changed="onItemShapePropChanged"
            @text-style-prop-change="onItemGenericTextSlotPropChanged"
            @clicked-zoom-to-selection="zoomToSelection()"
            @clicked-undo="historyUndo()"
            @clicked-redo="historyRedo()"
            @clicked-bring-to-front="bringSelectedItemsToFront()"
            @clicked-bring-to-back="bringSelectedItemsToBack()"
            @convert-path-points-to-simple="convertCurvePointToSimple()"
            @convert-path-points-to-beizer="convertCurvePointToBeizer()"
            @import-json-requested="onImportSchemeJSONClicked"
            @export-json-requested="exportAsJSON"
            @export-svg-requested="exportAsSVG"
            @export-png-requested="exportAsPNG"
            @export-html-requested="exportHTMLModalShown = true"
            @apply-patch-requested="triggerApplyPatchUpload"
            @duplicate-diagram-requested="showDuplicateDiagramModal()"
            @delete-diagram-requested="deleteSchemeWarningShown = true"
            @zoom-changed="onZoomChanged"
            @zoomed-to-items="zoomToItems"
            @new-scheme-requested="onNewSchemeRequested"
            @mode-changed="toggleMode"
            >
            <ul class="button-group" v-if="mode === 'edit' && (schemeModified || statusMessage.message)">
                <li v-if="schemeModified">
                    <span v-if="isSaving" class="btn btn-secondary" @click="onSaveSchemeClick()"><i class="fas fa-spinner fa-spin"></i>Saving...</span>
                    <span v-else class="btn btn-primary" @click="onSaveSchemeClick()">Save</span>
                </li>
                <li v-if="statusMessage.message">
                    <div class="msg" :class="{'msg-error': statusMessage.isError, 'msg-info': !statusMessage.isError}">
                        {{statusMessage.message}}
                        <span class="msg-close" @click="clearStatusMessage"><i class="fas fa-times"/></span>
                    </div>
                </li>
            </ul>
            </quick-helper-panel>

        <div class="scheme-editor-middle-section" ref="middleSection">
            <div class="scheme-error-message" v-if="!schemeContainer && schemeLoadErrorMessage">
                <h3>{{schemeLoadErrorMessage}}</h3>
            </div>

            <div class="scheme-container" oncontextmenu="return false;" v-if="schemeContainer">
                <SvgEditor
                    v-if="schemeContainer && mode === 'edit'"
                    :class="['state-' + state, 'sub-state-' + editorSubStateName]"
                    :key="`${schemeContainer.scheme.id}-edit-${editorRevision}`"
                    :schemeContainer="schemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :offline="offlineMode"
                    :zoom="zoom"
                    :stateLayerShown="state === 'draw' || state === 'createItem'"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @shape-export-requested="openShapeExporterForItem"
                    @svg-size-updated="onSvgSizeUpdated"
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
                                :item="curveEditItem"
                                :zoom="schemeContainer.screenTransform.scale"
                                :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                                :control-points-color="schemeContainer.scheme.style.controlPointsColor"/>
                        </g>
                    </g>

                    <div slot="overlay">
                        <div v-if="state === 'pickElement'" class="editor-top-hint-label">Click any element to pick it</div>
                    </div>
                </SvgEditor>

                <SvgEditor
                    v-if="interactiveSchemeContainer && mode === 'view'"
                    :key="`${schemeContainer.scheme.id}-view-${editorRevision}`"
                    :schemeContainer="interactiveSchemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :offline="offlineMode"
                    :zoom="zoom"
                    :userEventBus="userEventBus"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @svg-size-updated="onSvgSizeUpdated"
                    />

                <!-- Item Text Editor -->
                <InPlaceTextEditBox v-if="inPlaceTextEditor.shown"
                    :key="`in-place-text-edit-${inPlaceTextEditor.item.id}-${inPlaceTextEditor.slotName}`"
                    :item="inPlaceTextEditor.item"
                    :area="inPlaceTextEditor.area"
                    :css-style="inPlaceTextEditor.style"
                    :text="inPlaceTextEditor.text"
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

            
            <div v-if="mode === 'edit' && (animatorPanel.framePlayer || animationEditorCurrentFramePlayer)" class="bottom-panel">
                <div class="side-panel-filler-left"></div>
                <div class="bottom-panel-content">
                    <FrameAnimatorPanel
                        v-if="animationEditorCurrentFramePlayer"
                        :key="animationEditorCurrentFramePlayer.id"
                        :schemeContainer="schemeContainer"
                        :framePlayer="animationEditorCurrentFramePlayer"
                        :light="false"
                        @close="closeAnimatorEditor"
                        />

                    <FrameAnimatorPanel
                        v-else-if="animatorPanel.framePlayer"
                        :key="animatorPanel.framePlayer.id"
                        :schemeContainer="schemeContainer"
                        :framePlayer="animatorPanel.framePlayer"
                        :light="true"
                        @animation-editor-opened="onAnimatiorEditorOpened"
                        />
                </div>
                <div class="side-panel-filler-right"></div>
            </div>

            <div class="side-panel side-panel-left" v-if="mode === 'edit' && schemeContainer" :class="{expanded: sidePanelLeftExpanded}">
                <span class="side-panel-expander" @click="sidePanelLeftExpanded = !sidePanelLeftExpanded">
                    <i v-if="sidePanelLeftExpanded" class="fas fa-angle-left"></i>
                    <i v-else class="fas fa-angle-right"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelLeftExpanded">
                    <div class="wrapper">
                        <create-item-menu :scheme-container="schemeContainer" :projectArtEnabled="projectArtEnabled"/>
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" v-if="schemeContainer" :class="{expanded: sidePanelRightExpanded && !itemTooltip.shown}">
                <span class="side-panel-expander" @click="sidePanelRightExpanded = !sidePanelRightExpanded">
                    <i v-if="sidePanelRightExpanded" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightExpanded">
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
                            <scheme-properties v-if="mode === 'edit'"
                                :scheme-container="schemeContainer"
                                @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                @delete-diagram-requested="deleteSchemeWarningShown = true"/>

                            <scheme-details v-else :scheme="schemeContainer.scheme"></scheme-details>
                        </div>

                        <div v-if="currentTab === 'Item' && !inPlaceTextEditor.item">
                            <div v-if="mode === 'edit'">
                                <panel name="Items">
                                    <item-selector :scheme-container="schemeContainer" :max-height="200" :min-height="200" :key="`${schemeRevision}-${schemeContainer.revision}`"/>
                                </panel>

                                <item-properties v-if="schemeContainer.selectedItems.length > 0"
                                    :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
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
                            <text-slot-properties :item="inPlaceTextEditor.item" :slot-name="inPlaceTextEditor.slotName"
                                @moved-to-slot="onTextSlotMoved(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0]);"
                                @property-changed="onInPlaceEditTextPropertyChanged(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0], arguments[1])"
                                />
                        </div>
                        <div v-else-if="mode === 'edit'">
                            <text-slot-properties v-for="itemTextSlot in itemTextSlotsAvailable" v-if="currentTab === itemTextSlot.tabName"
                                :key="`text-slot-${itemTextSlot.item.id}-${itemTextSlot.slotName}`"
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


        <export-html-modal v-if="exportHTMLModalShown" :scheme="schemeContainer.scheme" @close="exportHTMLModalShown = false"/>
        <export-json-modal v-if="exportJSONModalShown" :scheme="schemeContainer.scheme" @close="exportJSONModalShown = false"/>
        <import-scheme-modal v-if="importSchemeModal.shown" :scheme="importSchemeModal.scheme"
            @close="importSchemeModal.shown = false"
            @import-scheme-submitted="importScheme"/>

        <create-new-scheme-modal v-if="newSchemePopup.show"
            :name="newSchemePopup.name"
            :description="newSchemePopup.description"
            :apiClient="apiClient"
            @close="newSchemePopup.show = false"
            @scheme-submitted="submitNewSchemeForCreation"
            ></create-new-scheme-modal>


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

        <div v-if="importSchemeFileShown" style="display: none">
            <input ref="importSchemeFileInput" type="file" @change="onImportSchemeFileInputChanged" accept="application/json"/>
        </div>

        <div v-if="loadPatchFileShown" style="display: none">
            <input ref="loadPatchFileInput" type="file" @change="onLoadPatchFileInputChanged" accept="application/json"/>
        </div>

        <advanced-behavior-properties v-if="advancedBehaviorProperties.shown" @close="advancedBehaviorProperties.shown = false"
            :scheme-container="schemeContainer"
        />

        <shape-exporter-modal v-if="exportShapeModal.shown" :item="exportShapeModal.item" @close="exportShapeModal.shown = false"/>

        <modal v-if="duplicateDiagramModal.shown" title="Duplicate diagram" @close="duplicateDiagramModal.shown = false" @primary-submit="duplicateDiagram()" primaryButton="Create copy">
            <p>
                Duplicate current diagram in a new file
            </p>
            <input type="text" class="textfield" placeholder="Name" v-model="duplicateDiagramModal.name"/>
            <div v-if="duplicateDiagramModal.errorMessage" class="msg msg-danger">
                {{duplicateDiagramModal.errorMessage}}
            </div>
        </modal>

        <modal v-if="deleteSchemeWarningShown" title="Delete diagram" primaryButton="Delete" @close="deleteSchemeWarningShown = false" @primary-submit="deleteScheme()">
            Are you sure you want to delete <b>{{schemeContainer.scheme.name}}</b> scheme?
        </modal>

        <modal v-if="isLoading" :width="380" :show-header="false" :show-footer="false" :use-mask="false">
            <div class="scheme-loading-icon">
                <div v-if="loadingStep === 'load'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Loading scheme...</span>
                </div>
                <div v-if="loadingStep === 'img-preload'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Preloading all images...  </span>
                    <span class="btn btn-secondary" @click="isLoading = false">Skip</span>
                </div>
            </div>
        </modal>

        <export-picture-modal v-if="exportPictureModal.shown"
            :exported-items="exportPictureModal.exportedItems"
            :kind="exportPictureModal.kind"
            :width="exportPictureModal.width"
            :height="exportPictureModal.height"
            :background-color="exportPictureModal.backgroundColor"
            @close="exportPictureModal.shown = false"/>

    </div>

</template>

<script>
import shortid from 'shortid';
import utils from '../utils.js';
import myMath from '../myMath';
import { Keys } from '../events';

import {enrichItemWithDefaults, applyStyleFromAnotherItem, defaultItem, traverseItems } from '../scheme/Item';
import {enrichSchemeWithDefaults, prepareSchemeForSaving} from '../scheme/Scheme';
import { generateTextStyle } from './editor/text/ItemText';
import Dropdown from './Dropdown.vue';
import SvgEditor from './editor/SvgEditor.vue';
import MultiItemEditBox from './editor/MultiItemEditBox.vue';
import PathEditBox from './editor/PathEditBox.vue';
import InPlaceTextEditBox from './editor/InPlaceTextEditBox.vue';
import EventBus from './editor/EventBus.js';
import SchemeContainer, { worldAngleOfItem, worldPointOnItem, worldScalingVectorOnItem, localPointOnItemToLocalPointOnOtherItem } from '../scheme/SchemeContainer.js';
import ItemProperties from './editor/properties/ItemProperties.vue';
import AdvancedBehaviorProperties from './editor/properties/AdvancedBehaviorProperties.vue';
import TextSlotProperties from './editor/properties/TextSlotProperties.vue';
import ItemDetails from './editor/ItemDetails.vue';
import SchemeProperties from './editor/SchemeProperties.vue';
import SchemeDetails from './editor/SchemeDetails.vue';
import CreateItemMenu   from './editor/CreateItemMenu.vue';
import CreateNewSchemeModal from './CreateNewSchemeModal.vue';
import LinkEditPopup from './editor/LinkEditPopup.vue';
import ItemTooltip from './editor/ItemTooltip.vue';
import ConnectorDestinationProposal from './editor/ConnectorDestinationProposal.vue';
import Comments from './Comments.vue';
import { snapshotSvg } from '../svgPreview.js';
import { createHasher } from '../url/hasher.js';
import History from '../history/History.js';
import Shape from './editor/items/shapes/Shape.js';
import AnimationRegistry from '../animations/AnimationRegistry';
import Panel from './editor/Panel.vue';
import ItemSelector from './editor/ItemSelector.vue';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import ExportHTMLModal from './editor/ExportHTMLModal.vue';
import ExportJSONModal from './editor/ExportJSONModal.vue';
import ShapeExporterModal from './editor/ShapeExporterModal.vue';
import ImportSchemeModal from './editor/ImportSchemeModal.vue';
import Modal from './Modal.vue';
import FrameAnimatorPanel from './editor/animator/FrameAnimatorPanel.vue';
import recentPropsChanges from '../history/recentPropsChanges';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import {copyToClipboard, getTextFromClipboard} from '../clipboard';   
import QuickHelperPanel from './editor/QuickHelperPanel.vue';
import StoreUtils from '../store/StoreUtils.js';
import ContextMenu from './editor/ContextMenu.vue';
import StrokePattern from './editor/items/StrokePattern';
import { filterOutPreviewSvgElements } from '../svgPreview';
import ExportPictureModal from './editor/ExportPictureModal.vue';
import StateCreateItem from './editor/states/StateCreateItem.js';
import StateInteract from './editor/states/StateInteract.js';
import StateDragItem from './editor/states/StateDragItem.js';
import StateDraw from './editor/states/StateDraw.js';
import StateEditPath from './editor/states/StateEditPath.js';
import StateConnecting from './editor/states/StateConnecting.js';
import StatePickElement from './editor/states/StatePickElement.js';
import StateCropImage from './editor/states/StateCropImage.js';
import store from '../store/Store';
import UserEventBus from '../userevents/UserEventBus.js';

const IS_NOT_SOFT = false;
const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

const userEventBus = new UserEventBus();

const states = {
    interact: new StateInteract(EventBus, store, userEventBus),
    createItem: new StateCreateItem(EventBus, store),
    editPath: new StateEditPath(EventBus, store),
    connecting: new StateConnecting(EventBus, store),
    dragItem: new StateDragItem(EventBus, store),
    pickElement: new StatePickElement(EventBus, store),
    cropImage: new StateCropImage(EventBus, store),
    draw: new StateDraw(EventBus, store),
};



const defaultHistorySize = 30;
let history = new History({size: defaultHistorySize});


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
        SchemeDetails, CreateItemMenu, QuickHelperPanel,
        CreateNewSchemeModal, LinkEditPopup, InPlaceTextEditBox,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        ConnectorDestinationProposal, AdvancedBehaviorProperties,
        Modal, ShapeExporterModal, FrameAnimatorPanel, PathEditBox,
        Comments, ContextMenu, ExportPictureModal, MultiItemEditBox,
        'export-html-modal': ExportHTMLModal,
        'export-json-modal': ExportJSONModal,
        'import-scheme-modal': ImportSchemeModal,
    },

    props: {
        scheme           : {type: Object, default: null},
        patchIndex       : {type: Object, default: null},
        editAllowed      : {type: Boolean, default: false},
        isStaticEditor : { type: Boolean, default: false},
        userStylesEnabled: {type: Boolean, default: false},
        projectArtEnabled: {type: Boolean, default: true},
        menuOptions      : {type: Array, default: []},
        comments         : {type: Object, default: {
            enabled: false,
            isAdmin: false,
            allowed: false,
            counter: 0,
            provider: null
        }},
    },

    beforeMount() {
        window.onbeforeunload = this.onBrowseClose;
        this.markSchemeAsUnmodified();
        EventBus.$on(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$on(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$on(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$on(EventBus.SCHEME_CHANGE_COMMITED, this.commitHistory);
        EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
        EventBus.$on(EventBus.COMPONENT_LOAD_REQUESTED, this.onComponentLoadRequested);
        EventBus.$on(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$on(EventBus.VOID_RIGHT_CLICKED, this.onRightClickedVoid);
        EventBus.$on(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$on(EventBus.ELEMENT_PICK_REQUESTED, this.switchStatePickElement);
        EventBus.$on(EventBus.START_CREATING_ITEM, this.switchStateCreateItem);
        EventBus.$on(EventBus.START_CURVE_EDITING, this.onStartCurveEditing);
        EventBus.$on(EventBus.START_DRAWING, this.switchStateDrawing);
        EventBus.$on(EventBus.START_CONNECTING_ITEM, this.onStartConnecting);
        EventBus.$on(EventBus.STOP_DRAWING, this.onStopDrawing);
        EventBus.$on(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$on(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$on(EventBus.IMAGE_CROP_TRIGGERED, this.startCroppingImage);
        EventBus.$on(EventBus.ELEMENT_PICK_CANCELED, this.onElementPickCanceled);
        EventBus.$on(EventBus.ANY_ITEM_CHANGED, this.onAnyItemChanged);
        EventBus.$on(EventBus.ITEM_CREATION_DRAGGED_TO_SVG_EDITOR, this.itemCreationDraggedToSvgEditor);
    },
    beforeDestroy(){
        window.onbeforeunload = null;
        EventBus.$off(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.KEY_UP, this.onKeyUp);
        EventBus.$off(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$off(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$off(EventBus.SCHEME_CHANGE_COMMITED, this.commitHistory);
        EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
        EventBus.$off(EventBus.COMPONENT_LOAD_REQUESTED, this.onComponentLoadRequested);
        EventBus.$off(EventBus.RIGHT_CLICKED_ITEM, this.onRightClickedItem);
        EventBus.$off(EventBus.VOID_RIGHT_CLICKED, this.onRightClickedVoid);
        EventBus.$off(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, this.onCustomContextMenuRequested);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCancelCurrentState);
        EventBus.$off(EventBus.ELEMENT_PICK_REQUESTED, this.switchStatePickElement);
        EventBus.$off(EventBus.START_CREATING_ITEM, this.switchStateCreateItem);
        EventBus.$off(EventBus.START_CURVE_EDITING, this.onStartCurveEditing);
        EventBus.$off(EventBus.START_DRAWING, this.switchStateDrawing);
        EventBus.$off(EventBus.START_CONNECTING_ITEM, this.onStartConnecting);
        EventBus.$off(EventBus.STOP_DRAWING, this.onStopDrawing);
        EventBus.$off(EventBus.CURVE_EDITED, this.onCurveEditRequested);
        EventBus.$off(EventBus.CURVE_EDIT_STOPPED, this.onCurveEditStopped);
        EventBus.$off(EventBus.IMAGE_CROP_TRIGGERED, this.startCroppingImage);
        EventBus.$off(EventBus.ELEMENT_PICK_CANCELED, this.onElementPickCanceled);
        EventBus.$off(EventBus.ANY_ITEM_CHANGED, this.onAnyItemChanged);
        EventBus.$off(EventBus.ITEM_CREATION_DRAGGED_TO_SVG_EDITOR, this.itemCreationDraggedToSvgEditor);
    },

    mounted() {
        this.init();
    },

    data() {
        return {
            // this is used to trigger full reload of SvgEditor component
            // it is needed only when scheme is imported from file
            editorRevision: 0,

            state: 'interact',
            userEventBus,

            hasher: createHasher(this.$router ? this.$router.mode : 'history'),

            offlineMode: false,
            schemeId: null,

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),
            originalUrlEncoded: encodeURIComponent(window.location),

            isLoading: false,
            loadingStep: 'load', // can be "load", "img-preload"
            isSaving: false,
            schemeLoadErrorMessage: null,

            cropImage: {
                editBox: null,
                item: null
            },

            inPlaceTextEditor: {
                item: null,
                slotName: '',
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
            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
            interactiveSchemeContainer: null,

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

            zoom: 100,
            mode: 'view',

            addLinkPopup: {
                item: null,
                shown: false
            },

            newSchemePopup: {
                name: '',
                description: '',
                show: false,
                parentSchemeItem: null
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

            exportHTMLModalShown: false,
            exportJSONModalShown: false,
            exportShapeModal: {
                shown: false,
                item: null
            },
            importSchemeFileShown: false,
            importSchemeModal: {
                sheme: null,
                shown: false
            },

            loadPatchFileShown: false,

            advancedBehaviorProperties: {
                shown: false
            },

            schemeTitleEdit: {
                shown: false,
            },

            drawColorPallete,

            animatorPanel: {
                framePlayer: null,
            },

            exportPictureModal: {
                kind: 'svg',
                width: 100,
                height: 100,
                shown: false,
                exportedItems: [],
                backgroundColor: 'rgba(255,255,255,1.0)'
            },

            duplicateDiagramModal: {
                shown: false,
                name: '',
                errorMessage: null
            },

            deleteSchemeWarningShown: false,
        }
    },
    methods: {
        init() {
            if (!this.scheme) {
                this.initOfflineMode();
                return;
            }

            const pageParams = this.hasher.decodeURLHash(window.location.hash);
            if (this.editAllowed && pageParams.m && pageParams.m === 'edit') {
                this.mode = 'edit';
            } else {
                this.mode = 'view';
            }

            this.loadingStep = 'load';
            this.isLoading = true;
            this.schemeLoadErrorMessage = null;

            this.schemeId = this.scheme.id;


            this.initScheme(this.scheme);
            Promise.resolve(null).then(() => {
                this.loadingStep = 'img-preload';
                const images = findAllImages(this.schemeContainer.getItems());
                return Promise.race([
                    Promise.all(map(images, imgPreload)),
                    timeoutPromise(10000)
                ]);
            })
            .then(() => {
                this.isLoading = false;
            });
        },

        initOfflineMode() {
            // here the edit mode is default since user chose to edit offline
            const pageParams = this.hasher.decodeURLHash(window.location.hash);
            if (pageParams.m && pageParams.m === 'view') {
                this.mode = 'view';
            } else {
                this.mode = 'edit';
            }

            let scheme = {};

            const offlineSchemeEncoded = window.localStorage.getItem('offlineScheme');
            if (offlineSchemeEncoded) {
                try {
                    scheme = JSON.parse(offlineSchemeEncoded);
                } catch (err) {
                    scheme = {}
                }
            }


            enrichSchemeWithDefaults(scheme);
            this.offlineMode = true;
            this.initScheme(scheme);
        },

        initScheme(scheme) {
            this.schemeContainer = new SchemeContainer(scheme, EventBus);

            forEach(states, state => {
                state.setSchemeContainer(this.schemeContainer);
            });


            history = new History({size: defaultHistorySize});
            history.commit(scheme);
            document._history = history;

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
                        EventBus.emitBringToViewInstantly(area);
                    }
                }
            }
        },

        toggleMode(mode) {
            if (mode === 'edit' && !this.editAllowed) {
                return;
            }

            this.mode = mode;
            if (mode === 'view') {
                this.sidePanelRightExpanded = false;
                this.switchStateInteract();
            } else if (mode === 'edit') {
                this.sidePanelRightExpanded = true;
                this.switchStateDragItem();
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

        switchStateDragItem() {
            EventBus.emitItemsHighlighted([]);
            states.dragItem.schemeContainer = this.schemeContainer;
            states[this.state].cancel();
            this.state = 'dragItem';
            states.dragItem.reset();
        },


        switchStateInteract() {
            EventBus.emitItemsHighlighted([]);
            states.interact.schemeContainer = this.interactiveSchemeContainer;
            states[this.state].cancel();
            this.state = 'interact';
            states[this.state].reset();
        },

        switchStatePickElement(elementPickCallback) {
            EventBus.emitItemsHighlighted([]);
            states.pickElement.reset();
            states.pickElement.schemeContainer = this.schemeContainer;
            states.pickElement.setElementPickCallback(elementPickCallback);
            this.state = 'pickElement';
        },


        switchStateCreateItem(item) {
            EventBus.emitItemsHighlighted([]);
            states[this.state].cancel();
            if (item.shape === 'path') {
                item.shapeProps.points = [];
                this.setCurveEditItem(item);
                this.state = 'editPath';
                EventBus.emitCurveEdited(item);
            } else if (item.shape === 'connector') {
                item.shapeProps.points = [];
                this.state = 'connecting';
                states['connecting'].setItem(item);
            } else {
                this.state = 'createItem';
            }
            states[this.state].schemeContainer = this.schemeContainer;
            states[this.state].reset();
            states[this.state].setItem(item);
        },

        setCurveEditItem(item) {
            this.$store.dispatch('setCurveEditItem', item);
        },
        
        onStartCurveEditing(item) {
            EventBus.emitItemsHighlighted([]);
            states[this.state].cancel();

            item.shapeProps.points = [];
            this.setCurveEditItem(item);
            // making sure every new curve starts non-closed
            if (item.shape === 'path') {
                item.shapeProps.closed = false;
            }
            this.state = 'editPath';
            EventBus.emitCurveEdited(item);

            states[this.state].schemeContainer = this.schemeContainer;
            states[this.state].reset();
            states[this.state].setItem(item);
        },

        switchStateDrawing() {
            EventBus.emitItemsHighlighted([]);

            states[this.state].cancel();
            this.state = 'draw';
            states.draw.schemeContainer = this.schemeContainer;
            states.draw.reset();
        },

        onStopDrawing() {
            if (this.state === 'draw') {
                states.draw.cancel();
            }
        },

        onStartConnecting(sourceItem, worldPoint) {
            EventBus.emitItemsHighlighted([]);
            states[this.state].cancel();
            let localPoint = null;
            if (worldPoint) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, sourceItem);
            }
            states.connecting.schemeContainer = this.schemeContainer;
            states.connecting.reset();
            const connector = states.connecting.initConnectingFromSourceItem(sourceItem, localPoint);
            connector.shapeProps.smoothing = this.$store.state.defaultConnectorSmoothing;
            this.state = 'connecting';
        },

        onDrawColorPicked(color) {
            if (this.state === 'draw') {
                states.draw.pickColor(color);
            }
        },

        onCurveEditRequested(item) {
            EventBus.emitItemsHighlighted([]);
            states[this.state].cancel();
            this.state = 'editPath';
            states.editPath.reset();
            states.editPath.setItem(item);
            this.setCurveEditItem(item);
        },

        onCurveEditStopped() {
            if (this.state === 'editPath') {
                states.editPath.cancel();
            }
        },

        startCroppingImage(item) {
            EventBus.emitItemsHighlighted([]);
            states[this.state].cancel();
            this.state = 'cropImage';
            
            states[this.state].schemeContainer = this.schemeContainer;
            states.cropImage.reset();
            this.cropImage.editBox = this.schemeContainer.generateMultiItemEditBox([item]);
            this.cropImage.item = item;
            states.cropImage.setImageEditBox(this.cropImage.editBox);
            states.cropImage.setImageItem(item);
        },

        onElementPickCanceled() {
            if (this.state === 'pickElement') {
                states.pickElement.cancel();
            }
        },

        onItemTextSlotEditTriggered(item, slotName, area, creatingNewItem) {
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
            this.inPlaceTextEditor.item = null;
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

        onNewSchemeRequested() {
            if (this.offlineMode) {
                if (confirm('Area you sure you want to reset all your changes?')) {
                    this.initOfflineMode();
                }
            } else if (this.schemeId) {
                this.openNewSchemePopup();
            }
        },

        openNewSchemePopup() {
            this.newSchemePopup.show = true;
        },

        onSaveSchemeClick() {
            if (!this.offlineMode && this.$store.state.apiClient) {
                this.saveScheme();
            } else {
                this.saveToLocalStorage();
            }
        },

        saveScheme() {
            if (this.offlineMode) {
                return;
            }

            if (this.isStaticEditor) {
                EventBus.emitSchemePatchRequested(this.schemeContainer.scheme);
                return;
            }

            if (!this.$store.state.apiClient || !this.$store.state.apiClient.saveScheme) {
                return;
            }

            this.createSchemePreview();

            this.isSaving = true;
            this.$store.dispatch('clearStatusMessage');
            this.$store.state.apiClient.saveScheme(prepareSchemeForSaving(this.schemeContainer.scheme))
            .then(() => {
                this.markSchemeAsUnmodified();
                this.isSaving = false;
            })
            .catch(err => {
                this.isSaving = false;
                this.$store.dispatch('setErrorStatusMessage', 'Failed to save scheme, please try again');
                this.markSchemeAsModified();
            });
        },

        saveToLocalStorage() {
            window.localStorage.setItem('offlineScheme', JSON.stringify(this.schemeContainer.scheme));
            StoreUtils.addInfoSystemMessage(this.$store, 'Saved scheme to local storage', 'offline-save');
            this.markSchemeAsUnmodified();
        },

        createSchemePreview() {
            if (this.$store.state.apiClient && this.$store.state.apiClient.uploadSchemeSvgPreview) {
                var area = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());
                snapshotSvg('#svg_plot [data-type="scene-transform"]', area).then(svgCode => {
                    return this.$store.state.apiClient.uploadSchemeSvgPreview(this.schemeId, svgCode);
                });
            }
        },

        // Zooms to selected items in edit mode
        // - if no items were selected it zooms into all items
        // - if in view mode - then it will always zoom into all items
        zoomToSelection() {
            if (this.mode === 'edit') {
                if (this.schemeContainer.selectedItems.length > 0) {
                    this.zoomToItems(this.schemeContainer.selectedItems);
                    return;
                }
            }

            this.zoomToItems(this.schemeContainer.getItems());
        },

        zoomToItems(items) {
            let area = null;
            if (items.length > 0) {
                area = this.calculateZoomingAreaForItems(items);
            } else {
                area = this.calculateZoomingAreaForItems(this.schemeContainer.getItems());
            }
            if (area) {
                EventBus.emitBringToViewAnimated(area);
            }
        },

        calculateZoomingAreaForItems(items) {
            if (this.mode === 'view') {
                //filtering HUD items out as they are always shown in the viewport  in view mode
                items = this.schemeContainer.filterNonHUDItems(items);
            }

            if (!items || items.length === 0) {
                return;
            }

            return this.schemeContainer.getBoundingBoxOfItems(items);
        },

        onClickedAddItemLink(item) {
            this.addLinkPopup.item = item;
            this.addLinkPopup.shown = true;
        },

        onClickedStartConnecting(sourceItem, x, y) {
            const point = { x: 0, y: 0 };
            point.x = x;
            point.y = y;
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, sourceItem, point);
        },

        onItemLinkSubmit(link) {
            this.addLinkPopup.item.links.push({
                id: shortid.generate(),
                title: link.title,
                url: link.url,
                type: link.type,
            });
            EventBus.emitSchemeChangeCommited();
        },

        startCreatingChildSchemeForItem(item) {
            this.newSchemePopup.name = item.name;
            this.newSchemePopup.parentSchemeItem = item;
            this.newSchemePopup.show = true;
        },

        submitNewSchemeForCreation(scheme) {
            //TODO in case item is a component - it should set scheme id in the shape props instead
            const that = this;
            return new Promise((resolve, reject) => {
                that.$emit('new-scheme-submitted', scheme, (createdScheme, publicLink) => {
                    if (publicLink) {
                        const item = this.newSchemePopup.parentSchemeItem;
                        if (item) {
                            if (!item.links) {
                                item.links = [];
                            }
                            item.links.push({
                                title: `${createdScheme.name}`,
                                url: publicLink,
                                type: 'scheme'
                            });
                            EventBus.emitItemChanged(item.id, 'links');
                        }

                        window.open(publicLink, '_blank');
                    }

                    resolve();
                    this.newSchemePopup.show = false;
                }, reject);
            });
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

        onPlaceItem(item) {
            this.schemeContainer.addItem(item);
        },

        onAnyItemClicked(item) {
            this.sidePanelItemForViewMode = null;
            this.sidePanelRightExpanded = false;
        },

        onVoidClicked() {
            if (this.mode === 'view') {
                this.sidePanelRightExpanded = false;
                this.sidePanelItemForViewMode = null;
            }
        },

        onKeyPress(key, keyOptions) {
            if (this.mode === 'edit') {
                if (key === Keys.CTRL_C) {
                    this.copySelectedItems();
                } else if (key === Keys.CTRL_V) {
                    this.pasteItemsFromClipboard();
                } else if (Keys.CTRL_S === key) {
                    if (this.offlineMode || !this.editAllowed) {
                        this.exportAsJSON();
                    } else {
                        this.saveScheme();
                    }
                } else if (Keys.CTRL_Z === key) {
                    this.historyUndo();
                } else if (Keys.CTRL_SHIFT_Z === key) {
                    this.historyRedo();
                } else if (Keys.CTRL_A === key) {
                    this.schemeContainer.selectAllItems();
                    EventBus.$emit(EventBus.ANY_ITEM_SELECTED);
                } else if (Keys.DELETE === key) {
                    if (this.state === 'editPath') {
                        states.editPath.deleteSelectedPoints();
                    } else if (this.state === 'dragItem') {
                        this.deleteSelectedItems();
                    }
                }
            }
            if (key === Keys.ESCAPE) {
                states[this.state].cancel();
            } else {
                states[this.state].keyPressed(key, keyOptions);
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
                    EventBus.emitItemChanged(item.id);
                });
                EventBus.emitSchemeChangeCommited();
            }
        },

        pasteItemsFromClipboard() {
            getTextFromClipboard().then(text => {
                if (text) {
                    const items = this.schemeContainer.decodeItemsFromText(text);
                    if (items) {
                        const centerX = (this.schemeContainer.screenSettings.width/2 - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale;
                        const centerY = (this.schemeContainer.screenSettings.height/2 - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale;
                        this.schemeContainer.pasteItems(items, centerX, centerY);
                        EventBus.emitSchemeChangeCommited();
                    }
                }
            })
        },

        openShapeExporterForItem(item) {
            this.exportShapeModal.item = item;
            this.exportShapeModal.shown = true;
        },

        onBrowseClose() {
            if (this.$store.getters.schemeModified) {
                return 'The changes were not saved';
            }
            return null;
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
            this.sidePanelRightExpanded = true;
            this.currentTab = 'Item';
        },

        commitHistory(affinityId) {
            history.commit(this.schemeContainer.scheme, affinityId);
            this.markSchemeAsModified();
            this.updateHistoryState();
        },

        historyUndo() {
            if (history.undoable()) {
                const scheme = history.undo();
                if (scheme) {
                    this.schemeContainer.scheme = scheme;
                    this.schemeContainer.reindexItems();
                    this.updateRevision();
                    this.restoreItemSelection();
                    this.restoreCurveEditing();
                    EventBus.$emit(EventBus.HISTORY_UNDONE);
                }
                this.updateHistoryState();
            }
        },

        historyRedo() {
            if (history.redoable()) {
                const scheme = history.redo();
                if (scheme) {
                    this.schemeContainer.scheme = scheme;
                    this.schemeContainer.reindexItems();
                    this.updateRevision();
                    this.restoreItemSelection();
                    this.restoreCurveEditing();
                    EventBus.$emit(EventBus.HISTORY_UNDONE);
                }
                this.updateHistoryState();
            }
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
                    EventBus.$emit(EventBus.CURVE_EDITED, existingItem);
                } else {
                    this.$store.dispatch('setCurveEditItem', null);
                    if (this.$store.state.editorStateName === 'editPath') {
                        EventBus.$emit(EventBus.CURVE_EDIT_STOPPED);
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

        updateHistoryState() {
            this.$store.dispatch('setHistoryUndoable', history.undoable());
            this.$store.dispatch('setHistoryRedoable', history.redoable());
        },

        updateRevision() {
            this.schemeRevision = new Date().getTime();
        },

        bringSelectedItemsToFront() {
            this.schemeContainer.bringSelectedItemsToFront();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.markSchemeAsModified();
            this.updateRevision();
        },

        bringSelectedItemsToBack() {
            this.schemeContainer.bringSelectedItemsToBack();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.markSchemeAsModified();
            this.updateRevision();
        },

        markSchemeAsModified() {
            this.$store.dispatch('markSchemeAsModified');
        },

        markSchemeAsUnmodified() {
            this.$store.dispatch('markSchemeAsUnmodified');
        },

        onScreenTransformUpdated(screenTransform) {
            if (screenTransform) {
                this.zoom = Math.round(screenTransform.scale * 10000) / 100;
            }
            this.initOffsetSave();
        },

        importScheme(scheme) {
            const newScheme = utils.clone(scheme);
            newScheme.id = this.schemeContainer.scheme.id;
            const newSchemeContainer = new SchemeContainer(newScheme, EventBus);
            newSchemeContainer.revision = this.schemeContainer.revision + 1;
            this.schemeContainer = newSchemeContainer;
            this.schemeContainer.reindexItems();
            states[this.state].schemeContainer = this.schemeContainer;
            states[this.state].reset();
            this.updateRevision();
            this.commitHistory();
            this.editorRevision++;

            if (this.mode === 'view') {
                this.switchToViewMode();
            }
        },

        onImportSchemeJSONClicked() {
            this.importSchemeFileShown = true;
            this.$nextTick(() => {
                this.$refs.importSchemeFileInput.click();
            });
        },

        onImportSchemeFileInputChanged(event) {
            this.loadSchemeFile(event.target.files[0]);
        },

        loadSchemeFile(file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                this.importSchemeFileShown = false;
                try {
                    const scheme = JSON.parse(event.target.result);
                    //TODO verify if it is correct scheme file
                    this.importSchemeModal.scheme = scheme;
                    this.importSchemeModal.shown = true;
                } catch(err) {
                    alert('Not able to import scheme. Malformed json');
                }
            };

            reader.readAsText(file);
        },


        triggerApplyPatchUpload() {
            this.loadPatchFileShown = true;
            this.$nextTick(() => {
                this.$refs.loadPatchFileInput.click();
            });
        },

        onLoadPatchFileInputChanged(fileEvent) {
            const file = fileEvent.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                this.loadPatchFileShown = false;
                try {
                    const patch = JSON.parse(event.target.result);
                    //TODO verify that it is correct patch file
                    this.$emit('preview-patch-requested', patch);
                } catch(err) {
                    alert('Not able to load patch. Malformed json');
                }
            };

            reader.readAsText(file);
        },

        exportAsJSON() {
            this.exportJSONModalShown = true;
        },

        exportAsSVG() {
            this.openExportPictureModal(this.schemeContainer, this.schemeContainer.scheme.items, 'svg');
        },

        exportAsPNG() {
            this.openExportPictureModal(this.schemeContainer, this.schemeContainer.scheme.items, 'png');
        },

        /**
         * Triggered when any item got selected or deselected
         */
        onItemSelectionUpdated() {
            if (this.schemeContainer.selectedItems.length > 0) {
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

        },

        onTextSlotMoved(item, slotName, anotherSlotName) {
            if (anotherSlotName === slotName) {
                return;
            }
            item.textSlots[anotherSlotName] = utils.clone(item.textSlots[slotName]);
            item.textSlots[slotName].text = '';
            EventBus.emitItemChanged(item.id, `textSlots.${anotherSlotName}`);
            if (!this.inPlaceTextEditor.item) {
                this.currentTab = `Text: ${anotherSlotName}`;
            }

            EventBus.emitItemTextSlotMoved(item, slotName, anotherSlotName);
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
                            EventBus.emitItemChanged(item.id, `shapeProps.${name}`);
                        });

                        item.meta.revision += 1;
                        itemIds += item.id;
                        recentPropsChanges.registerItemShapeProp(item.shape, name, value);
                    }

                    if (item.shape === 'component' && name === 'referenceItem') {
                        this.schemeContainer.reindexSpecifiedItems([item]);
                        reindexingNeeded = true;
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
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.shapeProps.${name}`);
            if (reindexingNeeded) {
                this.schemeContainer.reindexItems();
            }
        },

        onItemFieldChanged(name, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item[name] = utils.clone(value);
                    EventBus.emitItemChanged(item.id, name);
                });
                itemIds += item.id;
            });

            if (name === 'groups') {
                this.schemeContainer.reindexGroups();
            }
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.${name}`);
        },

        onItemShapeChanged(shapeName) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item.shape = shapeName;
                    enrichItemWithDefaults(item);
                    EventBus.emitItemChanged(item.id, 'shape');
                });
                itemIds += item.id;
            });
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.shape`);
        },

        onItemStyleApplied(style) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                const shape = Shape.find(item.shape);
                if (shape && (shape.shapeType === 'standard' || (shape.args.fill && shape.args.fill.type === 'advanced-color' 
                    && shape.args.strokeColor && shape.args.strokeColor.type === 'color')) 
                    ) {
                    item.shapeProps.fill = utils.clone(style.fill);
                    item.shapeProps.strokeColor = utils.clone(style.strokeColor);
                    if (style.textColor) {
                        const textSlots = shape.getTextSlots(item);
                        if (textSlots) {
                            forEach(textSlots, textSlot => {
                                if (item.textSlots[textSlot.name]) {
                                    item.textSlots[textSlot.name].color = utils.clone(style.textColor);
                                }
                            });
                        }
                    }

                    EventBus.emitItemChanged(item.id);
                    itemIds += item.id;
                }
            });
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.${name}`);
        },

        onInPlaceEditTextPropertyChanged(item, textSlotName, propertyName, value) {
            if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                item.textSlots[textSlotName][propertyName] = utils.clone(value);
                recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
            }
            EventBus.emitItemChanged(item.id);
            EventBus.emitSchemeChangeCommited(`item.${item.id}.textSlots.${textSlotName}.${propertyName}`);
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
                EventBus.emitItemChanged(item.id, `textSlots.*.${propertyName}`);
                itemIds += item.id;
            });
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.textSlots.*.${propertyName}`);

        },

        // this is triggerd from specific text slot in side panel
        onTextPropertyChanged(textSlotName, propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                    item.textSlots[textSlotName][propertyName] = utils.clone(value);
                    recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                }
                EventBus.emitItemChanged(item.id, `textSlots.${textSlotName}.${propertyName}`);
                itemIds += item.id;
            });
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.textSlots.${textSlotName}.${propertyName}`);
        },

        convertCurvePointToSimple() {
            if (this.state === 'editPath') {
                states[this.state].convertSelectedPointsToSimple();
            }
        },

        convertCurvePointToBeizer() {
            if (this.state === 'editPath') {
                states[this.state].convertSelectedPointsToBeizer();
            }
        },

        closeConnectorProposedDestination() {
            StoreUtils.disableProposeConnectorDestinationItems(this.$store);
        },

        /**
         * Invoked when user selects an item from ConnectorDestinationProposal panel during creation of a connector
         */
        onConnectorDestinationItemSelected(item) {
            if (this.state === 'editPath') {
                states[this.state].submitConnectorDestinationItem(item);
            }
        },

        triggerSchemeTitleEdit() {
            this.schemeTitleEdit.shown = true;
            this.$nextTick(() => {
                if (this.$refs.schemeTitle) {
                    this.$refs.schemeTitle.focus();
                }
            });
        },

        submitTitleEdit() {
            if (this.$refs.schemeTitle) {
                this.schemeContainer.scheme.name = this.$refs.schemeTitle.innerHTML;
                this.updateRevision();
                this.commitHistory();
            }
            this.schemeTitleEdit.shown = false;
        },

        clearStatusMessage() {
            this.$store.dispatch('clearStatusMessage');
        },

        switchToViewMode() {
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), EventBus);
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
                states.draw.pickColor(color);
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
            this.$store.state.apiClient.getScheme(item.shapeProps.schemeId)
            .then(schemeDetails => {
                const scheme = schemeDetails.scheme;
                const componentSchemeContainer = new SchemeContainer(scheme);
                this.interactiveSchemeContainer.attachItemsToComponentItem(item, componentSchemeContainer.scheme.items);
                this.interactiveSchemeContainer.prepareFrameAnimationsForItems(item.childItems);
                EventBus.emitItemChanged(item.id);

                if (item.shape === 'component' && item.shapeProps.autoZoom) {
                    this.zoomToItems([item]);
                }

                this.$nextTick(() => {
                    EventBus.emitComponentSchemeMounted(item);
                });
            })
            .catch(err => {
                if (item.shape === 'component') {
                    item.textSlots.button.text = 'Loading failed';
                    EventBus.emitItemChanged(item.id);
                }
                console.error(err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load scheme', 'scheme-component-load');
                EventBus.emitComponentLoadFailed(item);
            });
        },

        onRightClickedItem(item, mouseX, mouseY) {
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
                this.customContextMenu.menuOptions.push({
                    name: 'Create diagram for this element...',
                    iconClass: 'far fa-file',
                    clicked: () => {this.startCreatingChildSchemeForItem(item); }
                });
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
                        clicked: () => this.mergeCurves(this.schemeContainer.multiItemEditBox.items)
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

            if (item.shape === 'dummy' && item.childItems && item.childItems.length > 0) {
                this.customContextMenu.menuOptions.push({
                    name: 'Export as a shape...',
                    clicked: () => { this.exportAsShape(); }
                });
            }

            if (item.shape === 'path') {
                this.customContextMenu.menuOptions.push({
                    name: 'Edit Path',
                    clicked: () => { EventBus.emitCurveEdited(item); }
                });
            }

            this.customContextMenu.mouseX = mouseX + 5;
            this.customContextMenu.mouseY = mouseY + 5;
            this.customContextMenu.id = shortid.generate();
            this.customContextMenu.show = true;
        },

        onRightClickedVoid(x, y, mouseX, mouseY) {
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

        onCustomContextMenuRequested(mouseX, mouseY, menuOptions) {
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

        mergeCurves(allItems) {
            allItems.sort((a, b) => {
                return a.meta.ancestorIds.length - b.meta.ancestorIds.length;
            });

            const mainItem = allItems.shift();

            for (let i = 0; i < allItems.length; i++) {
                allItems[i].shapeProps.paths.forEach(path => {
                    const newPath = {
                        closed: path.closed,
                        points: []
                    };
                    path.points.forEach(point => {
                        const p = localPointOnItemToLocalPointOnOtherItem(point.x, point.y, allItems[i], mainItem);
                        p.t = point.t;
                        if (point.hasOwnProperty('x1')) {
                            const p1 = localPointOnItemToLocalPointOnOtherItem(point.x + point.x1, point.y + point.y1, allItems[i], mainItem);
                            p.x1 = p1.x - p.x;
                            p.y1 = p1.y - p.y;
                        }
                        if (point.hasOwnProperty('x2')) {
                            const p2 = localPointOnItemToLocalPointOnOtherItem(point.x + point.x2, point.y + point.y2, allItems[i], mainItem);
                            p.x2 = p2.x - p.x;
                            p.y2 = p2.y - p.y;
                        }
                        newPath.points.push(p);
                    });
                    mainItem.shapeProps.paths.push(newPath);
                });
            }
            this.schemeContainer.readjustItem(mainItem.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
            this.schemeContainer.deleteItems(allItems);
            this.schemeContainer.selectItem(mainItem);
            EventBus.emitSchemeChangeCommited();
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

            this.openExportPictureModal(this.schemeContainer, items, kind);
        },

        openExportPictureModal(schemeContainer, items, kind) {
            if (!items || items.length === 0) {
                StoreUtils.addErrorSystemMessage(this.$store, 'You have no items in your document');
                return;
            }
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
                const angle = worldAngleOfItem(item);
                const x = worldPoint.x - minP.x;
                const y = worldPoint.y - minP.y;

                itemDom.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
                const html = itemDom.outerHTML;
                exportedItems.push({item, html})
            });

            this.exportPictureModal.exportedItems = exportedItems;
            this.exportPictureModal.width = maxP.x - minP.x;
            this.exportPictureModal.height = maxP.y - minP.y;
            if (this.exportPictureModal.width > 5) {
                this.exportPictureModal.width = Math.round(this.exportPictureModal.width);
            }
            if (this.exportPictureModal.height > 5) {
                this.exportPictureModal.height = Math.round(this.exportPictureModal.height);
            }

            // this check is needed when export straight vertical or horizontal curve lines
            // in such case area is defined with zero width or height and it makes SVG export confused
            if (this.exportPictureModal.width < 0.001) {
                this.exportPictureModal.width = 20;
            }
            if (this.exportPictureModal.height < 0.001) {
                this.exportPictureModal.height = 20;
            }
            this.exportPictureModal.backgroundColor = schemeContainer.scheme.style.backgroundColor;
            this.exportPictureModal.kind = kind;
            this.exportPictureModal.shown = true;
        },

        /**
         * Calculates bounding box taking all sub items into account and excluding the ones that are not visible
         */
        calculateBoundingBoxOfAllSubItems(schemeContainer, parentItem) {
            const items = [];
            traverseItems(parentItem, item => {
                if (item.visible && item.opacity > 0.0001) {
                    // we don't want dummy shapes to effect the view area as these shapes are not supposed to be visible
                    if (item.shape !== 'dummy' && item.selfOpacity > 0.0001) {
                        items.push(item);
                    }
                }
            });
            return schemeContainer.getBoundingBoxOfItems(items)
        },

        deleteSelectedItems() {
            this.schemeContainer.deleteSelectedItems();
            EventBus.emitSchemeChangeCommited();
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
                const proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(item.area, x => x.id !== item.id);
                if (proposedItemForMounting) {
                    this.schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, proposedItemForMounting.id);
                }
            }

            const sv = worldScalingVectorOnItem(item);

            item.area.w = worldWidth / Math.max(0.0000001, sv.x);
            item.area.h = worldHeight / Math.max(0.0000001, sv.y);

            this.schemeContainer.selectItem(item);
            EventBus.emitSchemeChangeCommited();
        },

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
            };
        },

        onKeyUp(key, keyOptions) {
            if (key !== Keys.ESCAPE && key != Keys.DELETE) {
                states[this.state].keyUp(key, keyOptions);
            }
        },

        mouseWheel(x, y, mx, my, event) {
            states[this.state].mouseWheel(x, y, mx, my, event);
        },

        mouseDown(worldX, worldY, screenX, screenY, object, event) {
            states[this.state].mouseDown(worldX, worldY, screenX, screenY, object, event);
        },
        mouseUp(worldX, worldY, screenX, screenY, object, event) {
            states[this.state].mouseUp(worldX, worldY, screenX, screenY, object, event);
        },
        mouseMove(worldX, worldY, screenX, screenY, object, event) {
            states[this.state].mouseMove(worldX, worldY, screenX, screenY, object, event);
        },
        mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {
            states[this.state].mouseDoubleClick(worldX, worldY, screenX, screenY, object, event);
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

        deleteScheme() {
            const projectLink = this.schemeContainer.scheme.projectLink;
            this.$store.state.apiClient.deleteScheme(this.schemeContainer.scheme.id).then(() => {
                if (projectLink) {
                    window.location = projectLink;
                } else {
                    window.location = '/';
                }
            });
        },

        showDuplicateDiagramModal() {
            this.duplicateDiagramModal.name = this.schemeContainer.scheme.name + ' Copy';
            this.duplicateDiagramModal.errorMessage = null;
            this.duplicateDiagramModal.shown = true;
        },

        duplicateDiagram() {
            const name = this.duplicateDiagramModal.name.trim();
            if (!name) {
                this.duplicateDiagramModal.errorMessage = 'Name should not be empty';
                return;
            }

            const scheme = utils.clone(this.schemeContainer.scheme);
            scheme.id = null;
            scheme.name = name;
            this.submitNewSchemeForCreation(scheme).then(() => {
                this.duplicateDiagramModal.shown = false;
            })
            .catch(err => {
                this.duplicateDiagramModal.errorMessage = 'Oops, something went wrong.';
            });
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
            this.hasher.changeURLHash({
                m: value
            });
            if (value === 'view') {
                this.switchToViewMode();
            } else {
                this.switchToEditMode();
            }
        },

        currentTab(newValue) {
            this.saveSchemeSettings();
        },

        state(newState) {
            this.$store.dispatch('setEditorStateName', newState);
            EventBus.emitEditorStateChanged(this.state);
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

        schemeModified() {
            return this.$store.getters.schemeModified;
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
        }
    }
}
</script>

<style lang="css">
</style>
