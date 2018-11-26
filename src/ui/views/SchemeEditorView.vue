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
            </div>
            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" zoom="1.0"
                        :mode="mode"
                        @select-item="onSelectItem"
                        @deselect-items="onDeselectAllItems"
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
import SvgEditor from '../components/SvgEditor.vue';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';
import ItemProperties from '../components/editor/ItemProperties.vue';

export default {
    components: {SvgEditor, ItemProperties},

    mounted() {
        apiClient.loadScheme(this.schemeId).then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
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
        onSelectItem(item) {
            this.selectedItem = item;
        },
        onDeselectAllItems() {
            this.selectedItem = null;
        },
        toggleMode(mode) {
            this.mode = mode;
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
