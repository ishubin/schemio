<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-view" :style="{height: svgHeight + 'px'}">
        <div class="scheme-middle-container">
            <header-component 
                :project-id="projectId"
                :project="project"
                :category="currentCategory"
                >
                <div v-if="schemeContainer" slot="middle-section">
                    <menu-dropdown 
                        name="Export" icon-class="fas fa-file-export"
                        :options="[{name: 'Export as SVG', event: 'export-svg-requested'}, {name: 'Export as HTML', event: 'export-html-requested'}]"
                        @export-svg-requested="exportAsSVG"
                        @export-html-requested="exportHTMLModalShown = true"
                        />

                    <span v-for="knownMode in knownModes" class="toggle-button editor-mode"
                        :class="['mode-' + knownMode, mode===knownMode?'toggled':'']"
                        @click="toggleMode(knownMode)"
                        >
                        <i v-if="knownMode === 'edit'" class="fas fa-edit"></i>
                        <i v-if="knownMode === 'view'" class="fas fa-eye"></i>
                        {{knownMode}}
                    </span>

                    <span><i class="fas fa-search-minus" style="color: #fff; cursor: pointer;" @click="onZoomOutClicked"></i></span>
                    <dropdown :options="zoomOptions" :hover-effect="false" :search-enabled="false" @selected="onZoomOptionSelected">
                        <input class="textfield" style="width: 60px;" type="text" :value="zoom" @keydown.enter="onZoomSubmit"/>
                    </dropdown>
                    <span><i class="fas fa-search-plus" style="color: #fff; cursor: pointer;" @click="onZoomInClicked"></i></span>

                    <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>

                    <span v-if="searchKeyword" class="link" @click="searchKeyword = ''">Reset search</span>

                    <span class="btn btn-secondary" v-if="schemeModified && mode === 'edit' && currentUser" @click="saveScheme()">Save</span>
                </div>
            </header-component>

            <div class="scheme-container" oncontextmenu="return false;">
                <div v-if="schemeContainer">
                    <svg-editor
                        :key="schemeContainer.scheme.id"
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight"
                        :mode="currentUser ? mode : 'view'"
                        :viewport-top="viewportTopOffset"
                        :viewport-left="viewportLeftOffset"
                        :zoom="zoom"
                        @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                        @clicked-add-item-link="onClickedAddItemLink"
                        @clicked-start-connecting="onClickedStartConnecting"
                        @clicked-bring-to-front="bringSelectedItemsToFront()"
                        @clicked-bring-to-back="bringSelectedItemsToBack()"
                        @clicked-copy-selected-items="copySelectedItems()"
                        @clicked-items-paste="pasteItemsFromClipboard()"
                        ></svg-editor>
                </div>
            </div>

            <div class="scheme-not-found-block" v-if="schemeLoadErrorMessage">
                <h3>{{schemeLoadErrorMessage}}</h3>
            </div>

            <div class="side-panel side-panel-left" v-if="mode === 'edit' && schemeContainer && currentUser" :class="{expanded: sidePanelLeftExpanded}">
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
                            <scheme-properties :project-id="projectId" v-if="mode === 'edit'" :scheme-container="schemeContainer"></scheme-properties>
                            <scheme-details v-else :project-id="projectId" :scheme-container="schemeContainer"></scheme-details>
                        </div>

                        <div v-if="currentTab === 'Item' && !textSlotEditted.item">
                            <panel name="Items" v-if="mode === 'edit'">
                                <item-selector :scheme-container="schemeContainer" :max-height="200" :min-height="200" :key="schemeContainer.revision"/>
                            </panel>

                            <item-properties v-if="schemeContainer.selectedItems.length > 0 && mode === 'edit'"
                                :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                :item="schemeContainer.selectedItems[0]"
                                :revision="schemeRevision"
                                :project-id="projectId"
                                :scheme-container="schemeContainer" 
                                :viewport-top="viewportTopOffset"
                                :viewport-left="viewportLeftOffset"
                                @shape-prop-changed="onItemShapePropChanged"
                                @item-field-changed="onItemFieldChanged"
                                @item-style-applied="onItemStyleApplied"
                                @shape-changed="onItemShapeChanged"
                            />
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

            <quick-helper-panel v-if="mode === 'edit'"
                :project-id="projectId"
                :scheme-container="schemeContainer"
                @shape-prop-changed="onItemShapePropChanged"
                @clicked-show-item-list="itemListShown = true"
                @clicked-zoom-to-selection="zoomToSelection()"
                @clicked-undo="historyUndo()"
                @clicked-redo="historyRedo()"
                @clicked-bring-to-front="bringSelectedItemsToFront()"
                @clicked-bring-to-back="bringSelectedItemsToBack()"
                />
        </div>

        <export-html-modal v-if="exportHTMLModalShown === true" :scheme="schemeContainer.scheme" @close="exportHTMLModalShown = false"/>

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

        <item-list-popup v-if="itemListShown" :schemeContainer="schemeContainer" @close="itemListShown = false"/>

        <item-tooltip v-if="itemTooltip.shown" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>
    </div>

</template>

<script>
import utils from '../utils.js';
import { Keys } from '../events';

import {enrichItemWithDefaults} from '../scheme/Item';
import HeaderComponent from '../components/Header.vue';
import MenuDropdown from '../components/MenuDropdown.vue';
import Dropdown from '../components/Dropdown.vue';
import SvgEditor from '../components/editor/SvgEditor.vue';
import EventBus from '../components/editor/EventBus.js';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/properties/ItemProperties.vue';
import TextSlotProperties from '../components/editor/properties/TextSlotProperties.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import SchemeDetails from '../components/editor/SchemeDetails.vue';
import CreateItemMenu   from '../components/editor/CreateItemMenu.vue';
import CreateNewSchemeModal from '../components/CreateNewSchemeModal.vue';
import LinkEditPopup from '../components/editor/LinkEditPopup.vue';
import ItemListPopup from '../components/editor/ItemListPopup.vue';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import { snapshotSvg } from '../svgPreview.js';
import hasher from '../url/hasher.js';
import History from '../history/History.js';
import Shape from '../components/editor/items/shapes/Shape.js';
import AnimationsRegistry from '../animations/AnimationRegistry';
import Panel from '../components/editor/Panel.vue';
import ItemSelector from '../components/editor/ItemSelector.vue';
import LimitedSettingsStorage from '../LimitedSettingsStorage';
import ExportHTMLModal from '../components/editor/ExportHTMLModal.vue';
import recentPropsChanges from '../history/recentPropsChanges';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import filter from 'lodash/filter';
import find from 'lodash/find';
import {copyToClipboard, getTextFromClipboard} from '../clipboard';   
import QuickHelperPanel from '../components/editor/QuickHelperPanel.vue';

let history = new History({size: 30});


const schemeSettingsStorage = new LimitedSettingsStorage(window.localStorage, 'scheme-settings', 40);

function escapeHTML(html) {
    return new Option(html).innerHTML;
}

export default {
    components: {
        SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, MenuDropdown, QuickHelperPanel,
        CreateNewSchemeModal, LinkEditPopup, ItemListPopup, HeaderComponent,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        'export-html-modal': ExportHTMLModal,
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
            project: null,
            schemeId: null,

            viewportTopOffset: 40,

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),
            currentCategory: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            isLoading: false,
            schemeLoadErrorMessage: null,

            itemListShown: false,

            zoomOptions: [
                {name: '10%', value: 10},
                {name: '25%', value: 25},
                {name: '35%', value: 35},
                {name: '50%', value: 50},
                {name: '75%', value: 75},
                {name: '100%', value: 100},
                {name: '125%', value: 125},
                {name: '150%', value: 150},
                {name: '200%', value: 200},
            ],

            // a reference to an item that was clicked in view mode
            // this is used when the side panel for item is being requested
            sidePanelItemForViewMode: null,
            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
            searchKeyword: '',
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            zoom: 100,
            mode: 'view',
            knownModes: ['view', 'edit'],
            searchHighlights: [],

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

            exportHTMLModalShown: false
        }
    },
    methods: {
        init() {
            this.isLoading = true;
            this.schemeLoadErrorMessage = null;
            const pageParams = hasher.decodeURLHash(window.location.hash.substr(1));
            if (pageParams.m && pageParams.m === 'edit') {
                this.mode = 'edit';
            } else {
                this.mode = 'view';
            }

            this.schemeId = this.$route.params.schemeId;

            apiClient.getProject(this.projectId).then(project => {
                this.project = project;
            });
            apiClient.loadScheme(this.projectId, this.schemeId).then(scheme => {
                this.currentCategory = scheme.category;
                this.schemeContainer = new SchemeContainer(scheme, EventBus);

                this.schemeContainer.screenSettings.width = this.svgWidth;
                this.schemeContainer.screenSettings.height = this.svgHeight;

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
            }).catch(err => {
                this.isLoading = false;
                if (err.statusCode == 404) {
                    this.schemeLoadErrorMessage = 'Sorry, but this document does not exist';
                } else if (err.statusCode === 401) {
                    this.schemeLoadErrorMessage = 'Sorry, but you are not authorized to read this document';
                } else {
                    this.schemeLoadErrorMessage = 'Sorry, something went wrong when loading this document';
                }
            });

        },

        toggleMode(mode) {
            this.mode = mode;
            if (mode === 'view') {
                this.sidePanelRightExpanded = false;
            } else if (mode === 'edit') {
                this.sidePanelRightExpanded = true;
            }
        },

        saveScheme() {
            this.markSchemeAsUnmodified();

            this.createSchemePreview();

            apiClient.saveScheme(this.projectId, this.schemeId, this.schemeContainer.scheme).catch(err => {
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
            if (!items) {
                return;
            }

            const zoomableItems = filter(items, item => item.area.type !== 'viewport');
            if (zoomableItems.length > 0) {
                let area = this.schemeContainer.getBoundingBoxOfItems(zoomableItems);
                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
            }
        },

        onZoomOutClicked() {
            let selectedZoom = this.zoomOptions[0].value;
            let found = false;
            for (let i = 0; i < this.zoomOptions.length && !found; i++) {
                if (this.zoomOptions[i].value < this.zoom) {
                    selectedZoom = this.zoomOptions[i].value;
                } else {
                    found = true;
                }
            }
            this.zoom = selectedZoom;
            this.schemeContainer.screenTransform.scale = selectedZoom / 100.0;
            this.initOffsetSave();
        },

        onZoomInClicked() {
            let selectedZoom = this.zoomOptions[this.zoomOptions.length - 1].value;
            let found = false;
            let i = this.zoomOptions.length - 1;
            while(!found) {
                if (this.zoomOptions[i].value > this.zoom) {
                    selectedZoom = this.zoomOptions[i].value;
                } else {
                    found = true;
                }
                i = i - 1;
                if (i < 0) {
                    found = true;
                }
            }
            this.zoom = selectedZoom;
            this.schemeContainer.screenTransform.scale = selectedZoom / 100.0;
            this.initOffsetSave();
        },

        onZoomOptionSelected(option) {
            this.zoom = option.value;
            this.schemeContainer.screenTransform.scale = option.value / 100.0;
            this.initOffsetSave();
        },

        onZoomSubmit(event) {
            const zoomText = event.target.value;
            const zoom = parseInt(zoomText);

            if (isNaN(zoom)) {
                return;
            }
            if (zoom > 0) {
                this.schemeContainer.screenTransform.scale = zoom / 100.0;
                this.initOffsetSave();
            }
        },

        toggleSearchedItems() {
            this.zoomToItems(this.searchHighlights);
        },

        onClickedAddItemLink(item) {
            this.addLinkPopup.item = item;
            this.addLinkPopup.shown = true;
        },

        onClickedStartConnecting(item) {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, item);
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

        onUpdateZoom(zoom) {
            var value = Math.floor(zoom * 1000) / 10;
            this.zoom = Math.min(1000, Math.max(2, value));
            this.initOffsetSave();
        },

        onUpdateOffset(x, y) {
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
                        const centerX = (this.svgWidth/2 - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale;
                        const centerY = (this.svgHeight/2 - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale;
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

        searchKeyword(keyword) {
            keyword = keyword.trim().toLowerCase();

            if (keyword.length > 0) {
                const highlightedItemIds = [];
                let filteredItems = [];
                forEach(this.schemeContainer.getItems(), item => {
                    let shouldHighlight = false;
                    var name = item.name || '';
                    if (name.toLowerCase().indexOf(keyword) >= 0) {
                        shouldHighlight = true;
                    } else {
                        //search in tags
                        if (item.tags && item.tags.length > 0) {
                            if (find(item.tags, tag => tag.toLowerCase().indexOf(keyword) >= 0)) {
                                shouldHighlight = true;
                            }
                        }
                    }
                    if (shouldHighlight) {
                        filteredItems.push(item);
                        highlightedItemIds.push(item.id);
                    }
                });
                this.searchHighlights = filteredItems;
                EventBus.emitItemsHighlighted(highlightedItemIds);
            } else {
                forEach(this.schemeContainer.getItems(), item => {
                    item.meta.searchHighlighted = false;
                });
                this.searchHighlights = [];
                EventBus.emitItemsHighlighted([]);
            }
        }
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },

        viewportLeftOffset() {
            return this.sidePanelLeftExpanded && this.mode === 'edit' ? 160: 0;
        },

        schemeModified() {
            return this.$store.getters.schemeModified;
        },
    }
}
</script>

<style lang="css">
</style>
