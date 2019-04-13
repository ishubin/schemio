<template lang="html">
    <div>
        <general-panel :item="item"/>

        <links-panel :item="item"/>

        <connections-panel :item="item"/>

        <panel name="Style">
            <div class="property-row">
                <color-picker :color="item.style.inactive.background.color" @input="onInactiveBackgroundPickerInput"></color-picker>
                <span class="property-label">Inactive Background</span>
            </div>
            <div class="property-row">
                <color-picker :color="item.style.active.background.color" @input="onBackgroundPickerInput"></color-picker>
                <span class="property-label">Active Background</span>
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
        },
        onBackgroundPickerInput(color) {
            this.item.style.active.background.color = color;
            this.redrawItem();
        },
        onInactiveBackgroundPickerInput(color) {
            this.item.style.inactive.background.color = color;
            this.redrawItem();
        }
    }
}
</script>

<style lang="css">
</style>
