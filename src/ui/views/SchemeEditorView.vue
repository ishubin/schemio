<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-view" :style="{height: svgHeight + 'px'}">
        <div class="scheme-middle-container">
            <header-component :project-id="projectId" :project="project" :category="currentCategory">
                <div slot="middle-section">
                    <ul class="button-group">
                        <li v-for="knownMode in knownModes">
                            <span class="toggle-button editor-mode"
                                :class="['mode-' + knownMode, mode===knownMode?'toggled':'']"
                                @click="toggleMode(knownMode)"
                                >
                                <i v-if="knownMode === 'edit'" class="fas fa-edit"></i>
                                <i v-if="knownMode === 'view'" class="fas fa-eye"></i>
                                {{knownMode}}
                            </span>
                        </li>
                    </ul>
                    <div class="input-group">
                        <span class="input-group-item-inside"><i class="fas fa-search-plus" style="color: #999;"></i></span>
                        <input class="textfield input-group-field" style="width: 65px; padding-left: 25px" type="text" v-model="zoom"/>
                    </div>

                    <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>
                    <ul class="button-group" v-if="mode === 'edit'">
                        <li>
                            <span title="Undo" class="toggle-button" :class="{'disabled': !historyState.undoable}" @click="historyUndo"><i class="fas fa-undo"></i></span>
                        </li>
                        <li>
                            <span title="Redo" class="toggle-button" :class="{'disabled': !historyState.redoable}" @click="historyRedo"><i class="fas fa-redo"></i></span>
                        </li>
                        <li>
                            <span title="Show Item List" class="toggle-button" @click="itemListShown = true"><i class="fas fa-list"></i></span>
                        </li>
                        <li>
                            <span title="Zoom to Selection" class="toggle-button" @click="zoomToSelection()"><i class="fas fa-bullseye"></i></span>
                        </li>
                    </ul>
                    <ul class="button-group" v-if="mode === 'edit'">
                        <li>
                            <span title="Snap to Grid" class="toggle-button" :class="{toggled: shouldSnapToGrid}" @click="shouldSnapToGrid = !shouldSnapToGrid">
                                <i class="fas fa-magnet"></i>
                                <i class="small-letter">G</i>
                            </span>
                        </li>
                    </ul>
                    <span class="btn btn-secondary" v-if="schemeChanged && mode === 'edit'" @click="saveScheme()">Save</span>
                </div>
            </header-component>

            <div class="scheme-container" oncontextmenu="return false;">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" :offsetX="offsetX" :offsetY="offsetY" :zoom="zoom / 100.0"
                        :mode="mode"
                        :should-snap-to-grid="shouldSnapToGrid"
                        :viewport-top="40"
                        :viewport-left="sidePanelLeftExpanded && mode === 'edit' ? 160: 0"
                        @zoom-updated="onUpdateZoom"
                        @offset-updated="onUpdateOffset"
                        @clicked-add-item-to-item="onActiveItemAppendItem"
                        @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                        @clicked-add-item-link="onClickedAddItemLink"
                        @clicked-start-connecting="onClickedStartConnecting"
                        @clicked-bring-to-front="bringSelectedItemsToFront()"
                        @clicked-bring-to-back="bringSelectedItemsToBack()"
                        @deleted-items="onSelectedItemsAndConnectorsDelete()"
                        ></svg-editor>
                </div>
            </div>

            <div class="side-panel side-panel-left" v-if="mode === 'edit'" :class="{expanded: sidePanelLeftExpanded}">
                <span class="side-panel-expander" @click="sidePanelLeftExpanded = !sidePanelLeftExpanded">
                    <i v-if="sidePanelLeftExpanded" class="fas fa-angle-left"></i>
                    <i v-else class="fas fa-angle-right"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelLeftExpanded">
                    <div class="wrapper">
                        <create-item-menu :project-id="projectId"/>
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" :class="{expanded: sidePanelRightExpanded && !itemTooltip.shown}">
                <span class="side-panel-expander" @click="sidePanelRightExpanded = !sidePanelRightExpanded">
                    <i v-if="sidePanelRightExpanded" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightExpanded">
                    <ul class="tabs">
                        <li v-for="tab in tabs">
                            <span class="tab"
                                :class="{active: currentTab === tab.name, disabled: tab.disabled}"
                                @click="currentTab = tab.name"
                                >{{tab.name}}</span>
                        </li>
                    </ul>
                    <div class="tabs-body">
                        <div v-if="currentTab === 'Scheme' && schemeContainer">
                            <scheme-properties :project-id="projectId" v-if="mode === 'edit'" :scheme-container="schemeContainer"></scheme-properties>
                            <scheme-details v-else :project-id="projectId" :scheme-container="schemeContainer"></scheme-details>
                        </div>
                        <div v-if="currentTab === 'Items'">
                            <panel name="Items" v-if="mode === 'edit'">
                                <item-selector :scheme-container="schemeContainer" :max-height="200" :key="schemeContainer.revision"/>
                            </panel>

                            <item-properties v-if="schemeContainer.selectedItems.length > 0 && mode === 'edit'"
                                :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}`"
                                :item="schemeContainer.selectedItems[0]"
                                :revision="schemeRevision"
                                :project-id="projectId"
                                :scheme-container="schemeContainer" 
                            />
                            <item-details v-if="schemeContainer.selectedItems.length > 0 && mode !== 'edit'"
                                :item="schemeContainer.selectedItems[0]"
                                />
                        </div>
                        <connection-properties v-if="currentTab === 'Connection' && selectedConnector" :connector="selectedConnector"></connection-properties>
                    </div>
                </div>
            </div>
        </div>

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
import HeaderComponent from '../components/Header.vue';
import SvgEditor from '../components/editor/SvgEditor.vue';
import EventBus from '../components/editor/EventBus.js';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/properties/ItemProperties.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import ConnectionProperties from '../components/editor/ConnectionProperties.vue';
import SchemeDetails from '../components/editor/SchemeDetails.vue';
import CreateItemMenu   from '../components/editor/CreateItemMenu.vue';
import CreateNewSchemeModal from '../components/CreateNewSchemeModal.vue';
import LinkEditPopup from '../components/editor/LinkEditPopup.vue';
import ItemListPopup from '../components/editor/ItemListPopup.vue';
import ItemTooltip from '../components/editor/ItemTooltip.vue';
import snapshotSvg from '../svgPreview.js';
import hasher from '../url/hasher.js';
import History from '../history/History.js';
import Shape from '../components/editor/items/shapes/Shape.js';
import AnimationsRegistry from '../animations/AnimationRegistry';
import Panel from '../components/editor/Panel.vue';
import ItemSelector from '../components/editor/ItemSelector.vue';
import LimitedSettingsStorage from '../LimitedSettingsStorage';
import recentPropsChanges from '../history/recentPropsChanges';


let history = new History({size: 30});


const schemeSettingsStorage = new LimitedSettingsStorage(window.localStorage, 'scheme-settings', 40);

export default {
    components: {
        SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, ConnectionProperties,
        CreateNewSchemeModal, LinkEditPopup, ItemListPopup, HeaderComponent,
        ItemTooltip, Panel, ItemSelector
    },

    beforeMount() {
        window.onbeforeunload = this.onBrowseClose;
        this.init();
        EventBus.$on(EventBus.SCHEME_CHANGED, this.onSchemeChange);
        EventBus.$on(EventBus.ANY_ITEM_CHANGED, this.onItemChange);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$on(EventBus.ANY_CONNECTOR_DESELECTED, this.onAnyConnectorDeselected);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$on(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
        EventBus.$on(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$on(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$on(EventBus.SCHEME_CHANGE_COMITTED, this.commitHistory);
    },
    beforeDestroy(){
        EventBus.$off(EventBus.SCHEME_CHANGED, this.onSchemeChange);
        EventBus.$off(EventBus.ANY_ITEM_CHANGED, this.onItemChange);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$off(EventBus.ANY_CONNECTOR_DESELECTED, this.onAnyConnectorDeselected);
        EventBus.$off(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$off(EventBus.VOID_CLICKED, this.onVoidClicked);
        EventBus.$off(EventBus.ITEM_TOOLTIP_TRIGGERED, this.onItemTooltipTriggered);
        EventBus.$off(EventBus.SCHEME_CHANGE_COMITTED, this.commitHistory);
    },
    data() {
        return {
            projectId: this.$route.params.projectId,
            project: null,
            user: null,
            schemeId: null,

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),
            currentCategory: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            historyState: {
                undoable: false,
                redoable: false
            },

            itemListShown: false,
            schemeChanged: false, //used in order to render Save button

            shouldSnapToGrid: true,

            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
            searchKeyword: '',
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            selectedConnector: null,
            offsetX: 0,
            offsetY: 0,
            zoom: 100,
            mode: 'view',
            knownModes: ['view'],
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
            tabs: [{
                name: 'Scheme'
            }, {
                name: 'Items',
            }, {
                name: 'Connection',
                disabled: true
            }],

            offsetSaveTimerId: null,

            itemTooltip: {
                item: null,
                shown: false,
                x: 0,
                y: 0
            }
        }
    },
    methods: {
        init() {
            const pageParams = hasher.decodeURLHash(window.location.hash.substr(1));
            this.loadCurrentUser().then(user => {
                if (user) {
                    this.knownModes = ['view', 'edit'];
                    if (pageParams.m && pageParams.m === 'edit') {
                        this.mode = 'edit';
                    } else {
                        this.mode = 'view';
                    }
                }
            });
            this.schemeId = this.$route.params.schemeId;

            apiClient.getProject(this.projectId).then(project => {
                this.project = project;
            });
            apiClient.loadScheme(this.projectId, this.schemeId).then(scheme => {
                this.currentCategory = scheme.category;
                this.schemeContainer = new SchemeContainer(scheme, EventBus);

                history = new History({size: 30});
                history.commit(scheme);
                document._history = history;

                const schemeSettings = schemeSettingsStorage.get(this.schemeId);
                if (schemeSettings && schemeSettings.screenPosition) {
                    this.currentTab = schemeSettings.currentTab;
                    this.offsetX = schemeSettings.screenPosition.offsetX;
                    this.offsetY = schemeSettings.screenPosition.offsetY;
                    this.zoom = schemeSettings.screenPosition.zoom;
                } else {
                    // Should automatically bring to view the entire scheme
                    setTimeout(() => {
                        this.zoomToSelection();
                    }, 100);
                }
            });

        },

        loadCurrentUser() {
            return apiClient.getCurrentUser().then(user => {
                this.user = user;
                return user;
            });
        },

        toggleMode(mode) {
            this.mode = mode;
        },

        saveScheme() {
            this.schemeChanged = false;

            this.createSchemePreview();

            apiClient.saveScheme(this.projectId, this.schemeId, this.schemeContainer.scheme).catch(err => {
                this.schemeChanged = true;
            });
        },

        createSchemePreview() {
            var area = this.schemeContainer.getBoundingBoxOfItems(this.schemeContainer.getItems());

            snapshotSvg(500, 400, '#svg_plot', area).then(svgCode => {
                apiClient.uploadSchemeSvgPreview(this.projectId, this.schemeId, svgCode);
            });
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

            const zoomableItems = _.filter(items, item => item.area.type !== 'viewport');
            if (zoomableItems.length > 0) {
                let area = this.schemeContainer.getBoundingBoxOfItems(zoomableItems);
                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
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

        onActiveItemAppendItem(item) {
            var area = item.area;
            var direction = this.calculateNextDirection(item);

            var newItem = {
                type: item.type,
                area: { x: area.x + direction.x, y: area.y + direction.y, w: area.w, h: area.h, type: 'relative' },
                shape: item.shape,
                shapeProps: utils.clone(item.shapeProps),
                properties: '',
                name: '',
                description: '',
                links: []
            };
            if (item.type === 'shape') {
                newItem.shape = item.shape;
            }
            var id = this.schemeContainer.addItem(newItem);
            this.schemeContainer.connectItems(item, newItem);

            _.forEach(this.schemeContainer.selectedItems, selectedItem => EventBus.emitItemDeselected(selectedItem.id));
            this.schemeContainer.selectItem(newItem, false);
        },

        startCreatingChildSchemeForItem(item) {
            var category = this.schemeContainer.scheme.category;
            if (category && category.id) {
                var categories = _.map(category.ancestors, ancestor => {
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
            this.newSchemePopup.description = `Go back to [${this.schemeContainer.scheme.name}](/schemes/${this.schemeContainer.scheme.id})`;
            this.newSchemePopup.parentSchemeItem = item;
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(scheme) {
            var url = `/schemes/${scheme.id}`;
            var item = this.newSchemePopup.parentSchemeItem;
            if (item) {
                if (!item.links) {
                    item.links = [];
                }
                item.links.push({
                    title: `${item.name} details`,
                    url: url,
                    type: 'scheme'
                });
            }

            var href = window.location.href;
            var urlPrefix = href.substring(0, href.indexOf('/', href.indexOf('//') + 2));
            this.newSchemePopup.show = false;
            window.open(`${urlPrefix}${url}#m:edit`, '_blank');
        },

        onSelectedItemsAndConnectorsDelete() {
            this.selectedConnector = null;
        },

        //calculates average next direction based on all connectors pointing to item
        calculateNextDirection(item) {
            var sourceIds = this.schemeContainer.getConnectingSourceItemIds(item.id);
            var direction = {x: 0, y: 0};

            if (sourceIds) {
                _.forEach(sourceIds, sourceId => {
                    var sourceItem = this.schemeContainer.findItemById(sourceId);
                    if (sourceItem) {
                        var vx = item.area.x + item.area.w/2 - sourceItem.area.x - sourceItem.area.w / 2;
                        var vy = item.area.y + item.area.h/2 - sourceItem.area.y - sourceItem.area.h / 2;
                        var v = vx*vx + vy*vy;
                        if (v > 0.0001) {
                            var sv = Math.sqrt(v);
                            vx = vx / sv;
                            vy = vy / sv;
                            direction.x += vx;
                            direction.y += vy;
                        }
                    };
                });
            }

            var d = direction.x*direction.x + direction.y*direction.y;
            if (d > 0.0001) {
                var sd = Math.sqrt(d);
                direction.x = (Math.max(item.area.w, item.area.h) + 40) * direction.x / sd;
                direction.y = (Math.max(item.area.w, item.area.h) + 40) * direction.y / sd;
            } else {
                direction.x = item.area.w + 40;
                direction.y = 0;
            }

            return direction;
        },

        onUpdateZoom(zoom) {
            var value = Math.floor(zoom * 1000) / 10;
            this.zoom = Math.min(1000, Math.max(2, value));
            this.initOffsetSave();
        },

        onUpdateOffset(x, y) {
            this.offsetX = x;
            this.offsetY = y;
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
                    offsetX: this.offsetX,
                    offsetY: this.offsetY,
                    zoom: this.zoom
                }
            });
        },

        onAnyItemSelected(itemId) {
            // Checking whether an item has any information in it.
            if (this.mode === 'view') {
                if (this.schemeContainer.selectedItems.length > 0 && this.schemeContainer.selectedItems[0].description) {
                    /*
                    This is very dirty but it is the simplest way to check if the item has a proper description
                    If would only check for non-empty strings, then it would still show side panel 
                    even when description is an empty parahraph like "<p></p>"
                    This happens when you use rich text editor and delete the entire description.
                    Obviously it would be better to check for actual text elements inside the strings but it is also an overkill.
                    */
                    if (this.schemeContainer.selectedItems[0].description.trim().length > 8) {
                        this.sidePanelRightExpanded = true;
                        this.currentTab = 'Item';
                        this.tabs[2].disabled = true;
                    }
                }
            }
        },

        onAnyConnectorSelected(connectorId, connector) {
            this.selectedConnector = connector;
            this.currentTab = 'Connection';
            this.tabs[2].disabled = false;
            this.schemeContainer.deselectAllItems();
        },

        onAnyConnectorDeselected(connectorId, connector) {
            if (this.selectedConnector && this.selectedConnector.id === connectorId) {
                this.selectedConnector = null;
                if (this.currentTab === 'Connection') {
                    this.currentTab = 'Scheme';
                }
                this.tabs[2].disabled = true;
            }
        },

        onPlaceItem(item) {
            this.schemeContainer.addItem(item);
        },

        onSwitchModeToEdit() {
            this.mode = 'edit';
        },

        onSchemeChange() {
            this.schemeChanged = true;
        },

        onItemChange(itemId, propertyPath) {
            this.schemeChanged = true;

            const item = this.schemeContainer.findItemById(itemId);
            if (item && propertyPath) {
                const value = utils.getObjectProperty(item, propertyPath);

                if (propertyPath && propertyPath.indexOf('shapeProps.') === 0) {
                    recentPropsChanges.registerItemProp(item.shape, propertyPath, value);
                }
            }

            if (propertyPath === 'area.type') {
                // need to preform a full reindex since item was moved in/out viewport/world coords
                this.schemeContainer.reindexItems();
            }

            if (item && this.schemeContainer.selectedItems.length > 1 && propertyPath) {
                // Iterating through all other selected items and trying to apply the same change
                // this is needed so that user is able to perform bulk changes to multiple items at once
                _.forEach(this.schemeContainer.selectedItems, selectedItem => {
                    if (selectedItem.id !== itemId) {
                        this.applySameChangeToItem(item, selectedItem, propertyPath);
                    }
                });
            }
        },

        applySameChangeToItem(srcItem, dstItem, propertyPath) {
            if (propertyPath.indexOf('shapeProps.') === 0) {
                const shapePropName = propertyPath.substr('shapeProps.'.length);
                const srcShape = Shape.make(srcItem.shape);
                const dstShape = Shape.make(srcItem.shape);
                if (srcShape && dstShape) {
                    if (srcShape.args[shapePropName] && dstShape.args[shapePropName]) {
                        dstItem.shapeProps[shapePropName] = srcItem.shapeProps[shapePropName];
                    }
                }
            } else if (propertyPath === 'shape') {
                dstItem.shape = srcItem.shape;
                this.schemeContainer.enrichItemWithDefaults(dstItem);
            } else {
                if (srcItem.hasOwnProperty(propertyPath) && dstItem.hasOwnProperty(propertyPath)) {
                    dstItem[propertyPath] = srcItem[propertyPath];
                }
            }
        },

        onVoidClicked() {
            this.sidePanelRightExpanded = false;
        },

        onKeyPress(key, keyOptions) {
            if (this.mode === 'edit') {
                if (key === EventBus.KEY.CTRL_C) {
                    this.schemeContainer.copySelectedItems();
                } else if (key === EventBus.KEY.CTRL_V) {
                    this.schemeContainer.pasteSelectedItems();
                } else if (EventBus.KEY.CTRL_S === key) {
                    this.saveScheme();
                } else if (EventBus.KEY.CTRL_Z === key) {
                    this.historyUndo();
                } else if (EventBus.KEY.CTRL_SHIFT_Z === key) {
                    this.historyRedo();
                }
            }
        },

        onBrowseClose() {
            if (this.schemeChanged) {
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

        commitHistory(affinityId) {
            history.commit(this.schemeContainer.scheme, affinityId);
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
                }
                this.updateHistoryState();
            }
        },

        restoreItemSelection() {
            const selectedItemIds = _.map(this.schemeContainer.selectedItems, item => item.id);
            this.schemeContainer.deselectAllItems();
            this.schemeContainer.deselectAllConnectors();

            _.forEach(selectedItemIds, itemId => {
                const item = this.schemeContainer.findItemById(itemId);
                if (item) {
                    this.schemeContainer.selectItem(item, true);
                }
            });
        },

        updateHistoryState() {
            this.historyState.undoable = history.undoable();
            this.historyState.redoable = history.redoable();
        },

        updateRevision() {
            this.schemeRevision = new Date().getTime();
        },

        bringSelectedItemsToFront() {
            this.schemeContainer.bringSelectedItemsToFront();
            this.commitHistory();
            this.schemeChanged = true;
        },

        bringSelectedItemsToBack() {
            this.schemeContainer.bringSelectedItemsToBack();
            this.commitHistory();
            this.schemeChanged = true;
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

        searchKeyword(keyword) {
            keyword = keyword.trim().toLowerCase();
            if (keyword.length > 0) {
                let filteredItems = [];
                _.forEach(this.schemeContainer.getItems(), item => {
                    let shouldHighlight = false;
                    var name = item.name || '';
                    if (name.toLowerCase().indexOf(keyword) >= 0) {
                        shouldHighlight = true;
                    } else {
                        //search in tags
                        if (item.tags && item.tags.length > 0) {
                            if (_.find(item.tags, tag => tag.toLowerCase().indexOf(keyword) >= 0)) {
                                shouldHighlight = true;
                            }
                        }
                    }
                    if (shouldHighlight) {
                        filteredItems.push(item);
                    }
                    item.meta.searchHighlighted = shouldHighlight;
                });
                this.searchHighlights = filteredItems;
            } else {
                _.forEach(this.schemeContainer.getItems(), item => {
                    item.meta.searchHighlighted = false;
                });
                this.searchHighlights = [];
            }
        }
    }
}
</script>

<style lang="css">
</style>
