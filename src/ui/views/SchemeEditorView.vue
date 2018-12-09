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
                            <i class="fas fa-eye" v-if="knownMode === 'view'"></i>
                            <i class="fas fa-pen-square" v-if="knownMode === 'edit'"></i>
                        </span>
                    </li>
                </ul>
                <input class="textfield" style="width: 50px;" type="text" v-model="zoom"/>
                <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."  v-on:keydown.enter="toggleSearchedItems"/>
                <span class="btn btn-secondary" @click="saveScheme()">Save</span>
            </div>

            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" :zoom="zoom / 100.0"
                        :mode="mode"
                        :itemHighlights="searchHighlights"
                        ></svg-editor>
                </div>
                <h2 class="scheme-name-header" v-if="schemeContainer && schemeContainer.scheme">{{schemeContainer.scheme.name}}</h2>
            </div>

            <div class="side-panel">
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
                        <item-properties :item="selectedItem" v-if="selectedItem && mode === 'edit'"/>
                        <item-details :item="selectedItem" v-if="selectedItem && mode !== 'edit'"/>

                        <p v-if="!selectedItem">
                            No item selected
                        </p>
                    </div>
                    <create-item-menu v-if="currentTab === 'Create'"></create-item-menu>
                </div>
            </div>
        </div>

    </div>

</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';
import EventBus from '../components/editor/EventBus.js';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/ItemProperties.vue';
import ItemDetails from '../components/editor/ItemDetails.vue';
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import SchemeDetails from '../components/editor/SchemeDetails.vue';
import CreateItemMenu   from '../components/editor/CreateItemMenu.vue';

export default {
    components: {SvgEditor, ItemProperties, ItemDetails, SchemeProperties, SchemeDetails, CreateItemMenu},

    mounted() {
        apiClient.loadScheme(this.schemeId).then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
        });

        EventBus.$on(EventBus.ITEM_SELECTED, item => {
            this.selectedItem = item;
            this.currentTab = 'Item';
            this.tabs[2].disabled = false;
        });
        EventBus.$on(EventBus.ALL_ITEMS_DESELECTED, item => {
            this.selectedItem = null;
            this.currentTab = 'Scheme';
            this.tabs[2].disabled = true;
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
            schemeId: this.$route.params.schemeId,
            schemeContainer: null,
            searchKeyword: '',
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            selectedItem: null,
            zoom: 100,
            mode: 'view',
            knownModes: ['view', 'edit'],
            searchHighlights: [],

            currentTab: 'Scheme',
            tabs: [{
                name: 'Scheme'
            }, {
                name: 'Create'
            }, {
                name: 'Item',
                disabled: true
            }]
        }
    },
    methods: {
        toggleMode(mode) {
            this.mode = mode;
        },

        saveScheme() {
            apiClient.saveScheme(this.schemeId, this.schemeContainer.scheme);
        },

        toggleSearchedItems() {
            if (this.searchHighlights && this.searchHighlights.length > 0) {
                var area = {x: 0, y: 0, w: 0, h: 0};

                _.forEach(this.searchHighlights, a => {
                    area.x += a.x + a.w /2;
                    area.y += a.y + a.h /2;
                });

                area.x = area.x / this.searchHighlights.length;
                area.y = area.y / this.searchHighlights.length;

                EventBus.$emit(EventBus.BRING_TO_VIEW, area);
            }
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
