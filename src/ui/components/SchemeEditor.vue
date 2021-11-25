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
            :menuOptions="menuOptions"
            @shape-prop-changed="onItemShapePropChanged"
            @text-style-prop-change="onItemGenericTextSlotPropChanged"
            @clicked-zoom-to-selection="zoomToSelection()"
            @clicked-undo="historyUndo()"
            @clicked-redo="historyRedo()"
            @clicked-bring-to-front="bringSelectedItemsToFront()"
            @clicked-bring-to-back="bringSelectedItemsToBack()"
            @convert-curve-points-to-simple="convertCurvePointToSimple()"
            @convert-curve-points-to-beizer="convertCurvePointToBeizer()"
            @import-json-requested="onImportSchemeJSONClicked"
            @export-json-requested="exportAsJSON"
            @export-svg-requested="exportAsSVG"
            @export-html-requested="exportHTMLModalShown = true"
            @zoom-changed="onZoomChanged"
            @zoomed-to-items="zoomToItems"
            @new-scheme-requested="onNewSchemeRequested"
            @mode-changed="toggleMode"
            >
            <ul class="button-group" v-if="mode === 'edit' && (schemeModified || statusMessage.message)">
                <li v-if="schemeModified">
                    <span v-if="isSaving" class="btn btn-secondary" @click="saveScheme()"><i class="fas fa-spinner fa-spin"></i>Saving...</span>
                    <span v-else-if="!offlineMode && editAllowed && apiClient" class="btn btn-primary" @click="saveScheme()">Save</span>
                    <span v-else class="btn btn-primary" @click="saveToLocalStorage()">Save</span>
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
                    :key="`${schemeContainer.scheme.id}-edit-${editorRevision}`"
                    :schemeContainer="schemeContainer"
                    :mode="mode"
                    :offline="offlineMode"
                    :zoom="zoom"
                    @switched-state="onSvgEditorSwitchedState"
                    @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                    @clicked-add-item-link="onClickedAddItemLink"
                    @clicked-start-connecting="onClickedStartConnecting"
                    @clicked-bring-to-front="bringSelectedItemsToFront()"
                    @clicked-bring-to-back="bringSelectedItemsToBack()"
                    @clicked-copy-selected-items="copySelectedItems()"
                    @clicked-items-paste="pasteItemsFromClipboard()"
                    @shape-export-requested="openShapeExporterForItem"
                    @svg-size-updated="onSvgSizeUpdated"
                    />

                <SvgEditor
                    v-if="interactiveSchemeContainer && mode === 'view'"
                    :key="`${schemeContainer.scheme.id}-view-${editorRevision}`"
                    :schemeContainer="interactiveSchemeContainer"
                    :mode="mode"
                    :offline="offlineMode"
                    :zoom="zoom"
                    @switched-state="onSvgEditorSwitchedState"
                    @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                    @clicked-add-item-link="onClickedAddItemLink"
                    @clicked-start-connecting="onClickedStartConnecting"
                    @clicked-bring-to-front="bringSelectedItemsToFront()"
                    @clicked-bring-to-back="bringSelectedItemsToBack()"
                    @clicked-copy-selected-items="copySelectedItems()"
                    @clicked-items-paste="pasteItemsFromClipboard()"
                    @svg-size-updated="onSvgSizeUpdated"
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
                        <create-item-menu :scheme-container="schemeContainer"/>
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" v-if="schemeContainer" :class="{expanded: sidePanelRightExpanded && !itemTooltip.shown}">
                <span class="side-panel-expander" @click="sidePanelRightExpanded = !sidePanelRightExpanded">
                    <i v-if="sidePanelRightExpanded" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightExpanded">
                    <ul v-if="textSlotEditted.item" class="tabs text-nonselectable">
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
                        <div v-if="currentTab === 'Scheme' && schemeContainer && !textSlotEditted.item">
                            <scheme-properties v-if="mode === 'edit'"
                                :scheme-container="schemeContainer"
                                :categories-enabled="categoriesEnabled"
                                @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true" />

                            <scheme-details v-else :scheme-container="schemeContainer"></scheme-details>
                        </div>

                        <div v-if="currentTab === 'Item' && !textSlotEditted.item">
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

                        <div v-if="textSlotEditted.item && mode === 'edit'">
                            <text-slot-properties :item="textSlotEditted.item" :slot-name="textSlotEditted.slotName"
                                @moved-to-slot="onTextSlotMoved(textSlotEditted.item, textSlotEditted.slotName, arguments[0]);"
                                @property-changed="onInPlaceEditTextPropertyChanged(textSlotEditted.item, textSlotEditted.slotName, arguments[0], arguments[1])"
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


        <export-html-modal v-if="exportHTMLModalShown" :scheme="schemeContainer.scheme" @close="exportHTMLModalShown = false"/>
        <export-json-modal v-if="exportJSONModalShown" :scheme="schemeContainer.scheme" @close="exportJSONModalShown = false"/>
        <import-scheme-modal v-if="importSchemeModal.shown" :scheme="importSchemeModal.scheme"
            @close="importSchemeModal.shown = false"
            @import-scheme-submitted="importScheme"/>

        <create-new-scheme-modal v-if="newSchemePopup.show"
            :name="newSchemePopup.name"
            :description="newSchemePopup.description"
            :categories="newSchemePopup.categories"
            :apiClient="apiClient"
            @close="newSchemePopup.show = false"
            @scheme-created="openNewSchemePopupSchemeCreated"
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

        <advanced-behavior-properties v-if="advancedBehaviorProperties.shown" @close="advancedBehaviorProperties.shown = false"
            :scheme-container="schemeContainer"
        />

        <shape-exporter-modal v-if="exportShapeModal.shown" :item="exportShapeModal.item" @close="exportShapeModal.shown = false"/>

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
    </div>

</template>

<script>
import utils from '../utils.js';
import { Keys } from '../events';

import {enrichItemWithDefaults} from '../scheme/Item';
import {enrichSchemeWithDefaults, prepareSchemeForSaving} from '../scheme/Scheme';
import Dropdown from './Dropdown.vue';
import SvgEditor from './editor/SvgEditor.vue';
import EventBus from './editor/EventBus.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
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
import hasher from '../url/hasher.js';
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
import { getCapDefaultFill } from './editor/items/shapes/ConnectorCaps.js';

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

function escapeHTML(html) {
    return new Option(html).innerHTML;
}


let currentState = null;

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
        CreateNewSchemeModal, LinkEditPopup,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        ConnectorDestinationProposal, AdvancedBehaviorProperties,
        Modal, ShapeExporterModal, FrameAnimatorPanel,
        Comments,
        'export-html-modal': ExportHTMLModal,
        'export-json-modal': ExportJSONModal,
        'import-scheme-modal': ImportSchemeModal,
    },

    props: {
        scheme           : {type: Object, default: null},
        editAllowed      : {type: Boolean, default: false},
        categoriesEnabled: {type: Boolean, default: true},
        userStylesEnabled: {type: Boolean, default: false},
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
        EventBus.$on(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$on(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$on(EventBus.SCHEME_CHANGE_COMMITED, this.commitHistory);
        EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
        EventBus.$on(EventBus.COMPONENT_LOAD_REQUESTED, this.onComponentLoadRequested);
    },
    beforeDestroy(){
        window.onbeforeunload = null;
        EventBus.$off(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$off(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$off(EventBus.SCHEME_CHANGE_COMMITED, this.commitHistory);
        EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
        EventBus.$off(EventBus.COMPONENT_LOAD_REQUESTED, this.onComponentLoadRequested);
    },

    mounted() {
        this.init();
    },

    data() {
        return {
            // this is used to trigger full reload of SvgEditor component
            // it is needed only when scheme is imported from file
            editorRevision: 0,

            offlineMode: false,
            schemeId: null,

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),
            currentCategory: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            isLoading: false,
            loadingStep: 'load', // can be "load", "img-preload"
            isSaving: false,
            schemeLoadErrorMessage: null,


            // a reference to an item that was clicked in view mode
            // this is used when the side panel for item is being requested
            sidePanelItemForViewMode: null,
            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
            interactiveSchemeContainer: null,


            zoom: 100,
            mode: 'view',

            addLinkPopup: {
                item: null,
                shown: false
            },

            newSchemePopup: {
                name: '',
                description: '',
                categories: [],
                show: false,
                parentSchemeItem: null
            },

            currentTab: 'Scheme',
            tabs: [ 'Scheme', 'Item'],

            offsetSaveTimerId: null,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            },

            textSlotEditted: {
                item: null,
                slotName: null
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

        }
    },
    methods: {
        init() {
            if (!this.scheme) {
                this.initOfflineMode();
                return;
            }

            const pageParams = hasher.decodeURLHash(window.location.hash.substr(1));
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
            const pageParams = hasher.decodeURLHash(window.location.hash.substr(1));
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
            this.currentCategory = scheme.category;
            this.schemeContainer = new SchemeContainer(scheme, EventBus);

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
            } else if (mode === 'edit') {
                this.sidePanelRightExpanded = true;
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
            if (this.currentCategory && this.currentCategory.id) {
                var categories = map(this.currentCategory.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: this.currentCategory.name,
                    id: this.currentCategory.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }
            this.newSchemePopup.show = true;
        },

        saveScheme() {
            if (this.offlineMode) {
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
                const svgCode = snapshotSvg('#svg_plot [data-type="scene-transform"]', area);
                this.$store.state.apiClient.uploadSchemeSvgPreview(this.schemeId, svgCode);
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

        onClickedStartConnecting(sourceItem, x, y, mouseX, mouseY) {
            const point = { x: 0, y: 0 };
            point.x = x;
            point.y = y;
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, sourceItem, point);
        },

        onItemLinkSubmit(link) {
            this.addLinkPopup.item.links.push({
                title: link.title,
                url: link.url,
                type: link.type
            });
        },

        startCreatingChildSchemeForItem(item) {
            var category = this.schemeContainer.scheme.category;
            if (category && category.id) {
                var categories = map(category.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: category.name,
                    id: category.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }

            this.newSchemePopup.name = item.name;
            // TODO add link to newly created scheme
            this.newSchemePopup.parentSchemeItem = item;
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(scheme) {
            if (scheme.link) {
                var item = this.newSchemePopup.parentSchemeItem;
                if (item) {
                    if (!item.links) {
                        item.links = [];
                    }
                    item.links.push({
                        title: `${scheme.name}`,
                        url: scheme.link,
                        type: 'scheme'
                    });
                    EventBus.emitItemChanged(item.id, 'links');
                }

                this.newSchemePopup.show = false;
                window.open(`${scheme.link}#m:edit`, '_blank');

            }
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
                }
            }
        },

        copySelectedItems() {
            const copyBuffer = this.schemeContainer.copySelectedItems();
            copyToClipboard(copyBuffer);
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
            if (this.$store.state.editorStateName === 'editCurve') {
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
                    if (this.$store.state.editorStateName === 'editCurve') {
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
            this.updateRevision();
            this.commitHistory();
            this.editorRevision++;
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

        exportAsJSON() {
            this.exportJSONModalShown = true;
        },

        exportAsSVG() {
            EventBus.$emit(EventBus.EXPORT_SVG_REQUESTED);
        },

        onItemTextSlotEditTriggered(item, slotName) {
            this.textSlotEditted.item = item;
            this.textSlotEditted.slotName = slotName;
        },

        onItemTextSlotEditCanceled(item, slotName) {
            this.textSlotEditted.item = null;
            this.textSlotEditted.slotName = null;
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
            if (!this.textSlotEditted.item) {
                this.currentTab = `Text: ${anotherSlotName}`;
            }

            EventBus.emitItemTextSlotMoved(item, slotName, anotherSlotName);
        },

        // triggered from ItemProperties or QuickHelperPanel components
        onItemShapePropChanged(name, type, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                const shape = Shape.find(item.shape);
                if (shape) {
                    const propDescriptor = Shape.getShapePropDescriptor(shape, name);
                    if (propDescriptor && propDescriptor.type === type) {
                        item.shapeProps[name] = utils.clone(value);

                        if (type === 'curve-cap' && (item.shape === 'connector' || item.shape === 'curve')) {
                            const fillPropName = name + 'Fill';
                            if (shape.argType(fillPropName) === 'color') {
                                const defaultFill = getCapDefaultFill(value, item.shapeProps.strokeColor);
                                if (defaultFill) {
                                    item.shapeProps[fillPropName] = defaultFill;
                                }
                            }
                        }

                        item.meta.revision += 1;
                        EventBus.emitItemChanged(item.id, `shapeProps.${name}`);
                        itemIds += item.id;
                        recentPropsChanges.registerItemShapeProp(item.shape, name, value);
                    }
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
        },

        onItemFieldChanged(name, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                item[name] = utils.clone(value);
                EventBus.emitItemChanged(item.id);
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
                item.shape = shapeName;
                enrichItemWithDefaults(item);
                EventBus.emitItemChanged(item.id);
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

        onSvgEditorSwitchedState(state) {
            currentState = state;
        },

        convertCurvePointToSimple() {
            if (currentState && currentState.name === 'editCurve') {
                currentState.convertSelectedPointsToSimple();
            }
        },

        convertCurvePointToBeizer() {
            if (currentState && currentState.name === 'editCurve') {
                currentState.convertSelectedPointsToBeizer();
            }
        },

        closeConnectorProposedDestination() {
            StoreUtils.disableProposeConnectorDestinationItems(this.$store);
        },

        /**
         * Invoked when user selects an item from ConnectorDestinationProposal panel during creation of a connector
         */
        onConnectorDestinationItemSelected(item) {
            if (currentState && currentState.name === 'editCurve') {
                currentState.submitConnectorDestinationItem(item);
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
        },
        
        switchToEditMode() {
            this.interactiveSchemeContainer = null;
            AnimationRegistry.stopAllAnimations();
        },

        onDrawColorPicked(color) {
            EventBus.emitDrawColorPicked(color);
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
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.saveScheme) {
                return;
            }
            this.$store.state.apiClient.loadScheme(item.shapeProps.schemeId)
            .then(scheme => {
                const componentSchemeContainer = new SchemeContainer(scheme);
                this.interactiveSchemeContainer.attachSchemeToComponentItem(item, componentSchemeContainer.scheme);
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
        }
    },

    filters: {
        capitalize(value) {
            return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
        }
    },

    watch: {
        mode(value) {
            hasher.changeURLHash(hasher.encodeURLHash({
                m: value
            }));
            if (value === 'view') {
                this.switchToViewMode();
            } else {
                this.switchToEditMode();
            }
        },

        currentTab(newValue) {
            this.saveSchemeSettings();
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
        }
    }
}
</script>

<style lang="css">
</style>
