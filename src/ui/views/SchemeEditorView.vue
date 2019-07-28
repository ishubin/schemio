<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-view" :style="{height: svgHeight + 'px'}">
        <div class="scheme-middle-container">
            <header-component :project-id="projectId" :category="currentCategory">
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
                    <span class="btn btn-secondary" v-if="schemeChanged" @click="saveScheme()">Save</span>
                    <ul class="button-group">
                        <li>
                            <span title="Show Item List" class="toggle-button" @click="itemListShown = true"><i class="fas fa-list"></i></span>
                        </li>
                        <li>
                            <span title="Zoom to Selection" class="toggle-button" @click="zoomToSelection()"><i class="fas fa-bullseye"></i></span>
                        </li>
                    </ul>
                    <ul class="button-group">
                        <li>
                            <span title="Snap to Grid" class="toggle-button" :class="{toggled: shouldSnapToGrid}" @click="shouldSnapToGrid = !shouldSnapToGrid">
                                <i class="fas fa-magnet"></i>
                                <i class="small-letter">G</i>
                            </span>
                        </li>
                    </ul>
                    <ul class="button-group" v-if="selectedItem && mode === 'edit'">
                        <li>
                            <span title="Bring to Front" class="toggle-button" @click="schemeContainer.bringSelectedItemsToFront(); schemeChanged = true;">F</span>
                            <span title="Bring to Back" class="toggle-button" @click="schemeContainer.bringSelectedItemsToBack(); schemeChanged = true;">B</span>
                            <span title="Group Items" class="toggle-button" v-if="schemeContainer.selectedItems.length > 1" @click="schemeContainer.groupSelectedItems(); schemeChanged = true;">
                                <i class="fas fa-object-group"></i>
                            </span>
                        </li>
                    </ul>
                </div>
            </header-component>

            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" :offsetX="offsetX" :offsetY="offsetY" :zoom="zoom / 100.0"
                        :mode="mode"
                        :should-snap-to-grid="shouldSnapToGrid"
                        @zoom-updated="onUpdateZoom"
                        @offset-updated="onUpdateOffset"
                        @clicked-add-item-to-item="onActiveItemAppendItem"
                        @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                        @clicked-add-item-link="onClickedAddItemLink"
                        @clicked-start-connecting="onClickedStartConnecting"
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
                        <h5>Create</h5>
                        <create-item-menu :project-id="projectId"/>
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" :class="{expanded: sidePanelRightExpanded}">
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
                            <scheme-properties :project-id="projectId" v-if="mode === 'edit'" :schemeContainer="schemeContainer"></scheme-properties>
                            <scheme-details v-else :schemeContainer="schemeContainer"></scheme-details>
                        </div>
                        <div v-if="currentTab === 'Item'">
                            <item-properties :project-id="projectId" :item="selectedItem" :scheme-container="schemeContainer"  v-if="selectedItem && mode === 'edit'"
                                @ungroup-item="ungroupItem(selectedItem)"
                            />
                            <item-details :item="selectedItem" :itemId="selectedItem.id" v-if="selectedItem && mode !== 'edit'"/>

                            <p v-if="!selectedItem">
                                No item selected
                            </p>
                        </div>
                        <connection-properties v-if="currentTab === 'Connection' && selectedConnector" :connector="selectedConnector"></connection-properties>
                    </div>
                </div>
            </div>
        </div>

        <create-new-scheme-modal v-if="newSchemePopup.show"
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
import settingsStorage from '../settingsStorage.js';
import snapshotSvg from '../svgPreview.js';



export default {
    components: {SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, ConnectionProperties,
        CreateNewSchemeModal, LinkEditPopup, ItemListPopup, HeaderComponent},

    mounted() {
        window.onbeforeunload = this.onBrowseClose;
        this.init();
        EventBus.$on(EventBus.SCHEME_CHANGED, this.onSchemeChange);
        EventBus.$on(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$on(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$on(EventBus.ANY_CONNECTOR_DESELECTED, this.onAnyConnectorDeselected);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
        EventBus.$on(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
    },
    beforeDestroy(){
        EventBus.$off(EventBus.SCHEME_CHANGED, this.onSchemeChange);
        EventBus.$off(EventBus.KEY_PRESS, this.onKeyPress);
        EventBus.$off(EventBus.ANY_CONNECTOR_SELECTED, this.onAnyConnectorSelected);
        EventBus.$off(EventBus.ANY_CONNECTOR_DESELECTED, this.onAnyConnectorDeselected);
        EventBus.$off(EventBus.PLACE_ITEM, this.onPlaceItem);
        EventBus.$off(EventBus.SWITCH_MODE_TO_EDIT, this.onSwitchModeToEdit);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
    },
    data() {
        return {
            projectId: this.$route.params.projectId,
            user: null,
            schemeId: null,
            currentCategory: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            itemListShown: false,
            schemeChanged: false, //used in order to render Save button

            shouldSnapToGrid: false,

            sidePanelRightExpanded: true,
            sidePanelLeftExpanded: true,
            schemeContainer: null,
            searchKeyword: '',
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            selectedItem: null,
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
                name: 'Item',
                disabled: true
            }, {
                name: 'Connection',
                disabled: true
            }],

            offsetSaveTimerId: null
        }
    },
    methods: {
        init() {
            this.loadCurrentUser();
            this.schemeId = this.$route.params.schemeId;
            apiClient.loadScheme(this.projectId, this.schemeId).then(scheme => {
                this.currentCategory = scheme.category;
                this.schemeContainer = new SchemeContainer(scheme);

                var schemeSettings = settingsStorage.getSchemeSettings(this.schemeId);
                if (schemeSettings && schemeSettings.screenPosition) {
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
            apiClient.getCurrentUser().then(user => {
                this.user = user;
                if (this.user) {
                    this.knownModes = ['view', 'edit'];
                }
            });
        },

        toggleMode(mode) {
            this.mode = mode;
        },

        ungroupItem(item) {
            this.schemeContainer.ungroupItem(item);
        },

        saveScheme() {
            this.schemeChanged = false;

            this.createSchemePreview();

            apiClient.saveScheme(this.projectId, this.schemeId, this.schemeContainer.scheme).catch(err => {
                this.schemeChanged = true;
            });
        },

        createSchemePreview() {
            var area = this.getBoundingBoxOfItems(this.schemeContainer.scheme.items);

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

            this.zoomToItems(this.schemeContainer.scheme.items);
        },

        zoomToItems(items) {
            if (items && items.length > 0) {
                let area = this.getBoundingBoxOfItems(items);
                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
            }
        },

        getBoundingBoxOfItems(items) {
            var area = null;

            _.forEach(items, item => {
                if (!area) {
                    area = {x: item.area.x, y: item.area.y, w: item.area.w, h: item.area.h};
                } else {
                    if (area.x > item.area.x) {
                        area.x = item.area.x;
                    }
                    if (area.y > item.area.y) {
                        area.y = item.area.y;
                    }
                    if (area.x + area.w < item.area.x + item.area.w) {
                        area.w = item.area.x + item.area.w - area.x;
                    }
                    if (area.y + area.h < item.area.y + item.area.h) {
                        area.h = item.area.y + item.area.h - area.y;
                    }
                }
            });
            return area;
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
                area: { x: area.x + direction.x, y: area.y + direction.y, w: area.w, h: area.h },
                style: utils.clone(item.style),
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
            window.open(urlPrefix + url, '_blank');
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
                this.saveOffset();
            }, 200);
        },

        saveOffset() {
            settingsStorage.saveSchemeSettings(this.schemeContainer.scheme.id, {
                screenPosition: {
                    offsetX: this.offsetX,
                    offsetY: this.offsetY,
                    zoom: this.zoom
                }
            });
        },

        onAnyItemSelected(itemId) {
            this.selectedItem = this.schemeContainer.findItemById(itemId);
            this.currentTab = 'Item';
            this.tabs[1].disabled = false;
            this.tabs[2].disabled = true;
            this.sidePanelRightExpanded = true;
        },

        onAnyItemDeselected(itemId) {
            if (this.selectedItem !== null && this.selectedItem.id === itemId) {
                this.selectedItem = null;
                if (this.currentTab === 'Item') {
                    this.currentTab = 'Scheme';
                }
                this.tabs[1].disabled = true;
            }
        },

        onAnyConnectorSelected(connectorId, connector) {
            this.selectedConnector = connector;
            this.currentTab = 'Connection';
            this.selectedItem = null;
            this.tabs[1].disabled = true;
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

        onSchemeChange(item) {
            this.schemeChanged = true;
        },

        onKeyPress(key, keyOptions) {
            if (this.mode === 'edit') {
                if (key === EventBus.KEY.CTRL_C) {
                    this.schemeContainer.copySelectedItems();
                } else if (key === EventBus.KEY.CTRL_V) {
                    var items = this.schemeContainer.pasteSelectedItems();
                    if (items.length > 0) {
                        this.onActiveItemSelected(items[0]);
                    }
                } else if (EventBus.KEY.CTRL_S === key) {
                    this.saveScheme();
                }
            }
        },

        onBrowseClose() {
            if (this.schemeChanged) {
                return 'The changes were not saved';
            }
            return null;
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
