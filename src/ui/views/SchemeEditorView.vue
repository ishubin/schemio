<template lang="html">
    <div class="scheme-editor-view" :style="{height: svgHeight + 'px'}">
        <div class="scheme-middle-container">
            <div class="scheme-editor-top-panel">
                <ul class="button-group">
                    <li v-for="knownMode in knownModes">
                        <span class="toggle-button"
                            :class="{toggled: mode === knownMode}"
                            @click="toggleMode(knownMode)"
                            >{{knownMode | capitalize}}</span>
                    </li>
                </ul>
                <ul class="button-group">
                    <li> <span class="toggle-button" @click="onCreateComponentClick()">Component</span> </li>
                    <li> <span class="toggle-button" @click="onCreateOverlayClick()">Overlay</span> </li>
                    <li> <span class="toggle-button" @click="onCreateCommentClick()">Comment</span> </li>
                </ul>
                <input class="textfield" style="width: 50px;" type="text" v-model="zoom"/>
                <input class="textfield" style="width: 150px;" type="text" v-model="searchKeyword" placeholder="Search..."/>
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

            <div class="side-panel" v-if="selectedItem && mode === 'edit'">
                <div class="wrapper">
                    <item-properties :item="selectedItem" :mode="mode"/>
                </div>
            </div>
            <div class="side-panel" v-if="!selectedItem && mode === 'edit'">
                <div class="wrapper">
                    <scheme-properties :schemeContainer="schemeContainer"></scheme-properties>
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
import SchemeProperties from '../components/editor/SchemeProperties.vue';
import shortid from 'shortid';

export default {
    components: {SvgEditor, ItemProperties, SchemeProperties},

    mounted() {
        apiClient.loadScheme(this.schemeId).then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
        });

        EventBus.$on(EventBus.ITEM_SELECTED, item => {
            this.selectedItem = item;
        });
        EventBus.$on(EventBus.ALL_ITEMS_DESELECTED, item => {
            this.selectedItem = null;
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
            searchHighlights: []
        }
    },
    methods: {
        toggleMode(mode) {
            this.mode = mode;
        },

        saveScheme() {
            apiClient.saveScheme(this.schemeId, this.schemeContainer.scheme);
        },

        onCreateComponentClick() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'component',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#b8e0ee' },
                    text: { color: '#0d3847' }
                },
                name: 'Unnamed',
                description: '',
                links: []
            });
        },

        onCreateOverlayClick() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'overlay',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#b8e0ee' },
                },
                name: 'Unnamed',
                description: '',
                links: []
            });
        },

        onCreateCommentClick() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'comment',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#ccc' },
                    text: {color: '#666'}
                },
                name: '',
                description: 'Leave a comment ...',
                links: []
            });
        },
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
