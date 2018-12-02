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
                    <li> <span class="toggle-button" @click="onCreateComponentClick()">Create</span> </li>
                    <li> <span class="toggle-button" @click="onCreateOverlayClick()">Overlay</span> </li>
                </ul>
                <input type="text" v-model="zoom"/>
            </div>
            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" :zoom="zoom / 100.0"
                        :mode="mode"
                        ></svg-editor>
                </div>
                <h2 class="scheme-name-header" v-if="schemeContainer && schemeContainer.scheme">{{schemeContainer.scheme.name}}</h2>
            </div>
            <div v-if="selectedItem" class="side-panel">
                <div class="wrapper">
                    <item-properties :item="selectedItem" :mode="mode"/>
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
import shortid from 'shortid';

export default {
    components: {SvgEditor, ItemProperties},

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
            svgWidth: window.innerWidth,
            svgHeight: window.innerHeight,
            selectedItem: null,
            zoom: 100,
            mode: 'view',
            knownModes: ['view', 'edit']
        }
    },
    methods: {
        toggleMode(mode) {
            this.mode = mode;
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
    },
    filters: {
        capitalize(value) {
            return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
        }
    }
}
</script>

<style lang="css">
</style>
