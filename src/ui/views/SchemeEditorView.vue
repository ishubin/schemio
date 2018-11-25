<template lang="html">
    <div class="scheme-editor-view">
        <div>
            <h1>scheme editor</h1>
        </div>
        <div class="scheme-middle-container">
            <div class="scheme-container">
                <div v-if="schemeContainer">
                    <svg-editor
                        :schemeContainer="schemeContainer" :width="svgWidth" :height="svgHeight" offsetX="20" offsetY="20" zoom="1.0"
                        @select-item="onSelectItem"
                        @deselect-items="onDeselectAllItems"
                        ></svg-editor>
                </div>
            </div>
            <div v-if="selectedItem" class="side-panel">
                <item-properties :item="selectedItem"/>
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
        apiClient.loadScheme().then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
        });
    },
    data() {
        return {
            schemeContainer: null,
            svgWidth: window.innerWidth,
            svgHeight: 600,
            selectedItem: null
        }
    },
    methods: {
        onSelectItem(item) {
            this.selectedItem = item;
        },
        onDeselectAllItems() {
            this.selectedItem = null;
        }
    }
}
</script>

<style lang="css">
</style>
