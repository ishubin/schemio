<template lang="html">
    <div class="scheme-editor-view" :style="{height: svgHeight + 'px'}">
        <div class="scheme-middle-container">
            <div class="scheme-editor-top-panel">
                <ul class="button-group">
                    <li v-for="knownMode in knownModes">
                        <span class="toggle-button editor-mode"
                            :class="['mode-' + knownMode, mode===knownMode?'toggled':'']"
                            @click="toggleMode(knownMode)"
                            >
                            {{knownMode}}
                        </span>
                    </li>
                </ul>
                <input class="textfield" style="width: 50px;" type="text" v-model="zoom"/>
                <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>
                <span class="btn btn-secondary" @click="saveScheme()">Save</span>
                <ul class="button-group" v-if="selectedItem && mode === 'edit'">
                    <li>
                        <span class="toggle-button" @click="schemeContainer.bringToFront(selectedItem)">F</span>
                        <span class="toggle-button" @click="schemeContainer.bringToBack(selectedItem)">B</span>
                        <span class="toggle-button" v-if="schemeContainer.selectedItems.length > 1" @click="schemeContainer.groupSelectedItems()">
                            <i class="fas fa-object-group"></i>
                        </span>
                    </li>
                </ul>

                <div class="top-right-panel">
                    <div v-if="user">
                        <a href="/user/logout">Logout</a>
                    </div>
                    <div v-else>
                        <a :href="'/login?redirect=' + originalUrlEncoded">Login</a>
                    </div>
                </div>
            </div>

            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" :zoom="zoom / 100.0"
                        :mode="mode"
                        :itemHighlights="searchHighlights"
                        @update-zoom="onUpdateZoom"
                        @clicked-add-item-to-item="onActiveItemAppendItem"
                        @clicked-create-child-scheme-to-item="startCreatingChildSchemeForItem"
                        @clicked-add-item-link="onClickedAddItemLink"
                        @clicked-start-connecting="onClickedStartConnecting"
                        ></svg-editor>
                </div>
            </div>

            <div class="side-panel" :class="{expanded: sidePanelExpanded}">
                <span class="side-panel-expander" @click="sidePanelExpanded = !sidePanelExpanded">
                    <i v-if="sidePanelExpanded" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelExpanded">
                    <ul class="tabs">
                        <li v-for="tab in tabs">
                            <span class="tab"
                                :class="{active: currentTab === tab.name, disabled: tab.disabled}"
                                @click="currentTab = tab.name"
                                >{{tab.name}}</span>
                        </li>
                    </ul>

                    <div class="wrapper">
                        <div v-if="currentTab === 'Scheme' && schemeContainer">
                            <scheme-properties v-if="mode === 'edit'" :schemeContainer="schemeContainer"></scheme-properties>
                            <scheme-details v-else :schemeContainer="schemeContainer"></scheme-details>
                        </div>
                        <div v-if="currentTab === 'Item'">
                            <item-properties :item="selectedItem" v-if="selectedItem && mode === 'edit'"
                                @ungroup-item="ungroupItem(selectedItem)"
                            />
                            <item-details :item="selectedItem" :itemId="selectedItem.id" v-if="selectedItem && mode !== 'edit'"/>

                            <p v-if="!selectedItem">
                                No item selected
                            </p>
                        </div>
                        <create-item-menu v-if="currentTab === 'Create'"></create-item-menu>
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
            @submit-link="onItemLinkSubmit"
            @close="addLinkPopup.shown = false"/>
    </div>

</template>

<script>
import utils from '../utils.js';
import SvgEditor from '../components/editor/SvgEditor.vue';
import EventBus from '../components/editor/EventBus.js';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/ItemProperties.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import ConnectionProperties from '../components/editor/ConnectionProperties.vue';
import SchemeDetails from '../components/editor/SchemeDetails.vue';
import CreateItemMenu   from '../components/editor/CreateItemMenu.vue';
import CreateNewSchemeModal from '../components/createNewSchemeModal.vue';
import LinkEditPopup from '../components/editor/LinkEditPopup.vue';

export default {
    components: {SvgEditor, ItemProperties, ItemDetails, SchemeProperties, SchemeDetails, CreateItemMenu, ConnectionProperties, CreateNewSchemeModal, LinkEditPopup},

    mounted() {
        this.loadCurrentUser();

        apiClient.loadScheme(this.schemeId).then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
        });

        EventBus.$on(EventBus.ITEM_SELECTED, item => {
            this.selectedItem = item;
            this.currentTab = 'Item';
            this.tabs[2].disabled = false;
            this.tabs[3].disabled = true;
            this.sidePanelExpanded = true;
        });
        EventBus.$on(EventBus.CONNECTOR_SELECTED, connector => {
            this.selectedConnector = connector;
            this.currentTab = 'Connection';
            this.selectedItem = null;
            this.tabs[2].disabled = true;
            this.tabs[3].disabled = false;
            this.schemeContainer.deselectAllItems();
        });
        EventBus.$on(EventBus.ALL_ITEMS_DESELECTED, item => {
            this.selectedItem = null;
            if (this.currentTab === 'Item') {
                this.currentTab = 'Scheme';
            }
            this.tabs[2].disabled = true;
        });
        EventBus.$on(EventBus.ALL_CONNECTORS_DESELECTED, item => {
            this.selectedConnector = null;
            if (this.currentTab === 'Connection') {
                this.currentTab = 'Scheme';
            }
            this.tabs[3].disabled = true;
        });

        EventBus.$on(EventBus.PLACE_ITEM, item => {
            this.schemeContainer.addItem(item);
        });
        EventBus.$on(EventBus.SWITCH_MODE_TO_EDIT, () => {
            this.mode = 'edit';
        });
    },
    data() {
        return {
            user: null,
            originalUrlEncoded: encodeURIComponent(window.location),

            sidePanelExpanded: true,
            schemeId: this.$route.params.schemeId,
            schemeContainer: null,
            searchKeyword: '',
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            selectedItem: null,
            selectedConnector: null,
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
                name: 'Create'
            }, {
                name: 'Item',
                disabled: true
            }, {
                name: 'Connection',
                disabled: true
            }]
        }
    },
    methods: {
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
            apiClient.saveScheme(this.schemeId, this.schemeContainer.scheme);
        },

        toggleSearchedItems() {
            if (this.searchHighlights && this.searchHighlights.length > 0) {
                var area = null;

                _.forEach(this.searchHighlights, a => {
                    if (!area) {
                        area = {x: a.x, y: a.y, w: a.w, h: a.h};
                    } else {
                        if (area.x > a.x) {
                            area.x = a.x;
                        }
                        if (area.y > a.y) {
                            area.y = a.y;
                        }
                        if (area.x + area.w < a.x + a.w) {
                            area.w = a.x + a.w - area.x;
                        }
                        if (area.y + area.h < a.y + a.h) {
                            area.h = a.y + a.h - area.y;
                        }
                    }
                });

                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
            }
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
                name: 'Unnamed',
                description: '',
                links: []
            };
            if (item.type === 'shape') {
                newItem.shape = item.shape;
            }
            var id = this.schemeContainer.addItem(newItem);
            this.schemeContainer.connectItems(item, newItem);

            this.schemeContainer.selectItem(newItem, false);
            EventBus.$emit(EventBus.ITEM_SELECTED, newItem);
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
        }
    },
    filters: {
        capitalize(value) {
            return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
        }
    },
    watch: {
        searchKeyword(keyword) {
            keyword = keyword.trim().toLowerCase();
            if (keyword.length > 0) {
                this.searchHighlights = _.chain(this.schemeContainer.getItems()).filter(item => {
                    var name = item.name || '';
                    if (name.toLowerCase().indexOf(keyword) >= 0) {
                        return true;
                    } else {
                        //search in tags
                        if (item.tags && item.tags.length > 0) {
                            if (_.find(item.tags, tag => tag.toLowerCase().indexOf(keyword) >= 0)) {
                                return true;
                            }
                        }
                    }
                    return false;
                }).map(item => item.area).value();
            } else {
                this.searchHighlights = [];
            }
        }
    }
}
</script>

<style lang="css">
</style>
