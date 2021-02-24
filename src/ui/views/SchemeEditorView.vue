<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-view">
        <header-component 
            :project-id="projectId"
            :project="project"
            :category="currentCategory"
            :allow-new-scheme="false"
            >
            <div slot="middle-section">
                <div class="scheme-title" v-if="schemeContainer" @dblclick="triggerSchemeTitleEdit">
                    <img class="icon" src="/assets/images/schemio-logo-white.small.png" height="20"/> 
                    <span ref="schemeTitle"
                        :contenteditable="schemeTitleEdit.shown"
                        @keydown.enter="submitTitleEdit"
                        @keydown.esc="submitTitleEdit"
                        @blur="submitTitleEdit"
                        >{{schemeContainer.scheme.name}}</span>
                </div>
            </div>
        </header-component>

        <quick-helper-panel
            v-if="schemeContainer"
            :project-id="projectId"
            :project="project"
            :scheme-container="schemeContainer"
            :mode="mode"
            :zoom="zoom"
            @shape-prop-changed="onItemShapePropChanged"
            @clicked-zoom-to-selection="zoomToSelection()"
            @clicked-undo="historyUndo()"
            @clicked-redo="historyRedo()"
            @clicked-bring-to-front="bringSelectedItemsToFront()"
            @clicked-bring-to-back="bringSelectedItemsToBack()"
            @convert-curve-points-to-simple="convertCurvePointToSimple()"
            @convert-curve-points-to-beizer="convertCurvePointToBeizer()"
            @import-json-requested="onImportSchemeJSONClicked"
            @export-json-requested="exportAsJSON"
            @export-embedded-requested="exportEmbedded"
            @export-svg-requested="exportAsSVG"
            @export-html-requested="exportHTMLModalShown = true"
            @zoom-offset-changed="initOffsetSave"
            @zoom-changed="onZoomChanged"
            @zoomed-to-items="zoomToItems"
            @new-scheme-requested="onNewSchemeRequested"
            @mode-changed="toggleMode"
            >
            <ul class="button-group" v-if="mode === 'edit' && currentUser && (schemeModified || statusMessage.message)">
                <li v-if="schemeModified">
                    <span v-if="isSaving" class="btn btn-secondary" @click="saveScheme()"><i class="fas fa-spinner fa-spin"></i>Saving...</span>
                    <span v-else class="btn btn-secondary" @click="saveScheme()">Save</span>
                </li>
                <li v-if="statusMessage.message">
                    <div class="msg" :class="{'msg-error': statusMessage.isError, 'msg-info': !statusMessage.isError}">
                        {{statusMessage.message}}
                        <span class="msg-close" @click="clearStatusMessage"><i class="fas fa-times"/></span>
                    </div>
                </li>
            </ul>
            </quick-helper-panel>

        <div class="scheme-editor-middle-section">
            <div class="scheme-container" oncontextmenu="return false;">
                <svg-editor
                    v-if="schemeContainer"
                    :key="`${schemeContainer.scheme.id}-${schemeRevision}`"
                    :project-id="projectId"
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
                    ></svg-editor>
            </div>

            <div class="scheme-not-found-block" v-if="schemeLoadErrorMessage">
                <h3>{{schemeLoadErrorMessage}}</h3>
            </div>

            <div class="side-panel side-panel-left" v-if="mode === 'edit' && schemeContainer" :class="{expanded: sidePanelLeftExpanded}">
                <span class="side-panel-expander" @click="sidePanelLeftExpanded = !sidePanelLeftExpanded">
                    <i v-if="sidePanelLeftExpanded" class="fas fa-angle-left"></i>
                    <i v-else class="fas fa-angle-right"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelLeftExpanded">
                    <div class="wrapper">
                        <create-item-menu :project-id="projectId" :scheme-container="schemeContainer"/>
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" v-if="schemeContainer" :class="{expanded: sidePanelRightExpanded && !itemTooltip.shown}">
                <span class="side-panel-expander" @click="sidePanelRightExpanded = !sidePanelRightExpanded">
                    <i v-if="sidePanelRightExpanded" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightExpanded">
                    <ul v-if="!textSlotEditted.item" class="tabs">
                        <li v-for="tab in tabs">
                            <span class="tab"
                                :class="{active: currentTab === tab}"
                                @click="currentTab = tab"
                                >{{tab}}</span>
                        </li>
                        <li v-for="itemTextSlotTab in itemTextSlotsAvailable">
                            <span class="tab"
                                :class="{active: currentTab === itemTextSlotTab.tabName}"
                                @click="currentTab = itemTextSlotTab.tabName"
                                >&#167; {{itemTextSlotTab.slotName}}</span>
                        </li>
                    </ul>
                    <ul v-else class="tabs">
                        <li><span class="tab active">Text</span></li>
                    </ul>

                    <div class="tabs-body">
                        <div v-if="currentTab === 'Scheme' && schemeContainer && !textSlotEditted.item">
                            <scheme-properties v-if="mode === 'edit'"
                                :project-id="projectId"
                                :scheme-container="schemeContainer"
                                @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true" />

                            <scheme-details v-else :project-id="projectId" :scheme-container="schemeContainer"></scheme-details>
                        </div>

                        <div v-if="currentTab === 'Item' && !textSlotEditted.item">
                            <div v-if="mode === 'edit'">
                                <panel name="Items">
                                    <item-selector :scheme-container="schemeContainer" :max-height="200" :min-height="200" :key="schemeContainer.revision"/>
                                </panel>

                                <item-properties v-if="schemeContainer.selectedItems.length > 0"
                                    :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                    :item="schemeContainer.selectedItems[0]"
                                    :revision="schemeRevision"
                                    :project-id="projectId"
                                    :scheme-container="schemeContainer" 
                                    @shape-prop-changed="onItemShapePropChanged"
                                    @item-field-changed="onItemFieldChanged"
                                    @item-style-applied="onItemStyleApplied"
                                    @shape-changed="onItemShapeChanged"
                                    @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                />
                            </div>

                            <item-details v-if="sidePanelItemForViewMode && mode === 'view'" :item="sidePanelItemForViewMode"/>

                        </div>

                        <div v-if="textSlotEditted.item">
                            <text-slot-properties :item="textSlotEditted.item" :slot-name="textSlotEditted.slotName"
                                @moved-to-slot="onTextSlotMoved(textSlotEditted.item, textSlotEditted.slotName, arguments[0]);"
                                @property-changed="onInPlaceEditTextPropertyChanged(textSlotEditted.item, textSlotEditted.slotName, arguments[0], arguments[1])"
                                />
                        </div>
                        <div v-else>
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

        <export-embedded-modal v-if="exportEmbeddedModalShown" :project-id="projectId" :scheme="schemeContainer.scheme" @close="exportEmbeddedModalShown = false"/>

        <create-new-scheme-modal v-if="newSchemePopup.show"
            :project-id="projectId"
            :name="newSchemePopup.name"
            :description="newSchemePopup.description"
            :categories="newSchemePopup.categories"
            @close="newSchemePopup.show = false"
            @scheme-created="openNewSchemePopupSchemeCreated"
            ></create-new-scheme-modal>


        <link-edit-popup v-if="addLinkPopup.shown"
            :edit="false" title="" url="" type=""
            :projectId="projectId"
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
            :project-id="projectId"
            :scheme-container="schemeContainer"
        />

        <modal v-if="isLoading" :width="140" :show-header="false" :show-footer="false" :use-mask="false">
            <div class="scheme-loading-icon">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
            </div>
        </modal>
    </div>

</template>

<script>
import utils from '../utils.js';
import { Keys } from '../events';

import {enrichItemWithDefaults} from '../scheme/Item';
import {enrichSchemeWithDefaults} from '../scheme/Scheme';
import HeaderComponent from '../components/Header.vue';
import Dropdown from '../components/Dropdown.vue';
import SvgEditor from '../components/editor/SvgEditor.vue';
import EventBus from '../components/editor/EventBus.js';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/properties/ItemProperties.vue';
import AdvancedBehaviorProperties from '../components/editor/properties/AdvancedBehaviorProperties.vue';
import TextSlotProperties from '../components/editor/properties/TextSlotProperties.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import SchemeDetails from '../components/editor/SchemeDetails.vue';
import CreateItemMenu   from '../components/editor/CreateItemMenu.vue';
import CreateNewSchemeModal from '../components/CreateNewSchemeModal.vue';
import LinkEditPopup from '../components/editor/LinkEditPopup.vue';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import ConnectorDestinationProposal from '../components/editor/ConnectorDestinationProposal.vue';
import { snapshotSvg } from '../svgPreview.js';
import hasher from '../url/hasher.js';
import History from '../history/History.js';
import Shape from '../components/editor/items/shapes/Shape.js';
import AnimationsRegistry from '../animations/AnimationRegistry';
import Panel from '../components/editor/Panel.vue';
import ItemSelector from '../components/editor/ItemSelector.vue';
import LimitedSettingsStorage from '../LimitedSettingsStorage';
import ExportHTMLModal from '../components/editor/ExportHTMLModal.vue';
import ExportEmbeddedModal from '../components/editor/ExportEmbeddedModal.vue';
import ExportJSONModal from '../components/editor/ExportJSONModal.vue';
import ImportSchemeModal from '../components/editor/ImportSchemeModal.vue';
import Modal from '../components/Modal.vue';
import recentPropsChanges from '../history/recentPropsChanges';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import {copyToClipboard, getTextFromClipboard} from '../clipboard';   
import QuickHelperPanel from '../components/editor/QuickHelperPanel.vue';
import StoreUtils from '../store/StoreUtils.js';

let history = new History({size: 30});


const schemeSettingsStorage = new LimitedSettingsStorage(window.localStorage, 'scheme-settings', 40);

function escapeHTML(html) {
    return new Option(html).innerHTML;
}


let currentState = null;

export default {
    components: {
        SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, QuickHelperPanel,
        CreateNewSchemeModal, LinkEditPopup, HeaderComponent,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        ConnectorDestinationProposal, AdvancedBehaviorProperties,
        Modal,
        'export-embedded-modal': ExportEmbeddedModal,
        'export-html-modal': ExportHTMLModal,
        'export-json-modal': ExportJSONModal,
        'import-scheme-modal': ImportSchemeModal,
    },

    beforeMount() {
        window.onbeforeunload = this.onBrowseClose;
        this.markSchemeAsUnmodified();
        this.init();
        EventBus.$on(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$on(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$on(EventBus.SCHEME_CHANGE_COMITTED, this.commitHistory);
        EventBus.$on(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
    },
    beforeDestroy(){
        window.onbeforeunload = null;
        EventBus.$off(EventBus.ANY_ITEM_CLICKED, this.onAnyItemClicked);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$off(EventBus.ITEM_SIDE_PANEL_TRIGGERED, this.onItemSidePanelTriggered);
        EventBus.$off(EventBus.SCHEME_CHANGE_COMITTED, this.commitHistory);
        EventBus.$off(EventBus.SCREEN_TRANSFORM_UPDATED, this.onScreenTransformUpdated);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onItemSelectionUpdated);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onItemSelectionUpdated);
    },

    data() {
        return {
            projectId: this.$route.params.projectId,
            offlineMode: false,
            project: null,
            schemeId: null,

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),
            currentCategory: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            isLoading: false,
            isSaving: false,
            schemeLoadErrorMessage: null,


            // a reference to an item that was clicked in view mode
            // this is used when the side panel for item is being requested
            sidePanelItemForViewMode: null,
            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
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

            exportEmbeddedModalShown: false,
            exportHTMLModalShown: false,
            exportJSONModalShown: false,
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
            }
        }
    },
    methods: {
        init() {

            if (!this.projectId) {
                this.initOfflineMode();
                return;
            }

            this.offlineMode = false;
            const pageParams = hasher.decodeURLHash(window.location.hash.substr(1));
            if (pageParams.m && pageParams.m === 'edit') {
                this.mode = 'edit';
            } else {
                this.mode = 'view';
            }

            this.isLoading = true;
            this.schemeLoadErrorMessage = null;

            this.schemeId = this.$route.params.schemeId;

            apiClient.getProject(this.projectId).then(project => {
                this.project = project;
            });
            apiClient.loadScheme(this.projectId, this.schemeId).then(scheme => {
                this.initScheme(scheme);
            }).catch(err => {
                this.isLoading = false;
                if (err.statusCode == 404) {
                    this.schemeLoadErrorMessage = 'Sorry, but this document does not exist';
                } else if (err.statusCode === 401) {
                    this.schemeLoadErrorMessage = 'Sorry, but you are not authorized to read this document';
                } else {
                    this.schemeLoadErrorMessage = 'Sorry, something went wrong when loading this document. Please try again later';
                    console.error(err);
                }
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

            const scheme = {};
            enrichSchemeWithDefaults(scheme);
            this.offlineMode = true;
            this.initScheme(scheme);
        },

        initScheme(scheme) {
            this.currentCategory = scheme.category;
            this.schemeContainer = new SchemeContainer(scheme, EventBus);

            this.isLoading = false;

            history = new History({size: 30});
            history.commit(scheme);
            document._history = history;

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
                // Should automatically bring to view the entire scheme
                setTimeout(() => {
                    this.zoomToSelection();
                }, 100);
            }
        },

        toggleMode(mode) {
            this.mode = mode;
            if (mode === 'view') {
                this.sidePanelRightExpanded = false;
            } else if (mode === 'edit') {
                this.sidePanelRightExpanded = true;
            }
        },

        onNewSchemeRequested() {
            if (this.schemeId && this.project) {
                this.openNewSchemePopup();
            } else if (this.offlineMode) {
                if (confirm('Area you sure you want to reset all your changes?')) {
                    this.initOfflineMode();
                }
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

        openNewSchemePopupSchemeCreated(projectId, scheme) {
            this.newSchemePopup.show = false;
            window.location.href = `/projects/${projectId}/schemes/${scheme.id}#m:edit`;
        },

        saveScheme() {

            this.createSchemePreview();

            this.isSaving = true;
            this.$store.dispatch('clearStatusMessage');
            apiClient.saveScheme(this.projectId, this.schemeId, this.schemeContainer.scheme)
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

        createSchemePreview() {
            var area = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());
            const svgCode = snapshotSvg('#svg_plot [data-type="scene-transform"]', area);
            apiClient.uploadSchemeSvgPreview(this.projectId, this.schemeId, svgCode);
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
            if (this.mode === 'view') {
                //filtering HUD items out as they are always shown in the viewport  in view mode
                items = this.schemeContainer.filterNonHUDItems(items);
            }

            if (!items || items.length === 0) {
                return;
            }

            let area = this.schemeContainer.getBoundingBoxOfItems(items);
            if (area) {
                EventBus.$emit(EventBus.BRING_TO_VIEW, area);
            }
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
            this.newSchemePopup.description = `Go back to <a href="/schemes/${this.schemeContainer.scheme.id}">${escapeHTML(this.schemeContainer.scheme.name)}</a>`;
            this.newSchemePopup.parentSchemeItem = item;
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(projectId, scheme) {
            var url = `/projects/${projectId}/schemes/${scheme.id}`;
            var item = this.newSchemePopup.parentSchemeItem;
            if (item) {
                if (!item.links) {
                    item.links = [];
                }
                item.links.push({
                    title: `${scheme.name}`,
                    url: url,
                    type: 'scheme'
                });
            }

            EventBus.emitItemChanged(item.id, 'links');

            var href = window.location.href;
            var urlPrefix = href.substring(0, href.indexOf('/', href.indexOf('//') + 2));
            this.newSchemePopup.show = false;
            window.open(`${urlPrefix}${url}#m:edit`, '_blank');
        },

        onUpdateOffset(x, y) {
            this.initOffsetSave();
        },

        onZoomChanged(newZoom) {
            this.zoom = newZoom;
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

        onSwitchModeToEdit() {
            this.mode = 'edit';
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
                    this.saveScheme();
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
                    }
                }
            })
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
            this.itemTooltip.y = mouseY;
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

        exportEmbedded() {
            this.exportEmbeddedModalShown= true;
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
                this.currentTab = 'Item';
                const item = this.schemeContainer.selectedItems[0];
                const shape = Shape.find(item.shape);
                if (!shape) {
                    return;
                }
                const textSlots = shape.getTextSlots(item);

                if (textSlots && textSlots.length > 0) {
                    this.itemTextSlotsAvailable = map(textSlots, textSlot => {
                        return {
                            tabName: `Text: ${textSlot.name}`,
                            slotName: textSlot.name,
                            item
                        };
                    });
                    return;
                }
            }
            // in case nothing was selected - it should not display any tabs
            if (this.currentTab !== 'Item' && this.currentTab !== 'Scheme') {
                this.currentTab = 'Item';
            }
            this.itemTextSlotsAvailable.length = 0;
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

        // triggered from ItemProperties component
        onItemShapePropChanged(name, type, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                const shape = Shape.find(item.shape);
                if (shape) {
                    const propDescriptor = Shape.getShapePropDescriptor(shape, name);
                    if (propDescriptor && propDescriptor.type === type) {
                        item.shapeProps[name] = utils.clone(value);
                        EventBus.emitItemChanged(item.id);
                        itemIds += item.id;
                        recentPropsChanges.registerItemShapeProp(item.shape, name, value);
                    }
                }
            });
            EventBus.emitSchemeChangeCommited(`item.${itemIds}.shapeProps.${name}`);
        },

        onItemFieldChanged(name, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                item[name] = utils.clone(value);
                EventBus.emitItemChanged(item.id);
                itemIds += item.id;
            });
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
                    && shape.args.strokeColor && shape.args.strokeColor === 'color')) ) {
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

        onTextPropertyChanged(textSlotName, propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                    item.textSlots[textSlotName][propertyName] = utils.clone(value);
                    recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                }
                EventBus.emitItemChanged(item.id);
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
        }
    },

    filters: {
        capitalize(value) {
            return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
        }
    },

    watch: {
        $route(to, from) {
            this.init();
        },

        mode(value) {
            hasher.changeURLHash(hasher.encodeURLHash({
                m: value
            }));
            if (value === 'view') {
                AnimationsRegistry.enableAnimations();
            } else {
                AnimationsRegistry.stopAllAnimations();
            }
        },

        currentTab(newValue) {
            this.saveSchemeSettings();
        },
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },

        schemeModified() {
            return this.$store.getters.schemeModified;
        },

        connectorProposedDestination() {
            return this.$store.getters.connectorProposedDestination;
        },

        statusMessage() {
            return this.$store.getters.statusMessage;
        }
    }
}
</script>

<style lang="css">
</style>
