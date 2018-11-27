<template lang="html">
    <div class="scheme-editor-view">
        <div>
            <h1>scheme editor</h1>
        </div>
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
                    <li>
                        <span class="toggle-button" @click="onCreateComponentClick()">Create</span>
                    </li>
                </ul>
            </div>
            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" zoom="1.0"
                        :mode="mode"
                        ></svg-editor>
                </div>
            </div>
            <div v-if="selectedItem" class="side-panel">
                <item-properties :item="selectedItem" />
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
            svgHeight: 600,
            selectedItem: null,
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
                type: 'component',
                area: {
                    x: 0,
                    y: 0,
                    w: 0,
                    h: 0
                },
                name: 'Unnamed',
                description: '',
                invisible: false,
                links: []
            });
        }
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
