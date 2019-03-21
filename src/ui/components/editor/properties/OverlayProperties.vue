<template lang="html">
    <div>
        <general-panel :item="item"/>

        <links-panel :item="item"/>

        <connections-panel :item="item"/>

        <panel name="Style">
            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Background</span>
            </div>
        </panel>
    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import ColorPicker from '../ColorPicker.vue';
import Panel from '../Panel.vue';
import LinksPanel from './LinksPanel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import GeneralPanel from './GeneralPanel.vue';


export default {
    props: ['item'],

    components: {Panel, ColorPicker, GeneralPanel, LinksPanel, ConnectionsPanel},

    methods: {
        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    }
}
</script>

<style lang="css">
</style>
