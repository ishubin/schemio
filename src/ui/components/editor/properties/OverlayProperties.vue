<template lang="html">
    <div>
        <general-panel :item="item"/>

        <links-panel :item="item"/>

        <connections-panel :item="item"/>

        <panel name="Style">
            <div class="property-row">
                <color-picker :color="item.style.inactiveBackground.color" :alpha="item.style.inactiveBackground.alpha" @input="onInactiveBackgroundPickerInput"></color-picker>
                <span class="property-label">Inactive Background</span>
            </div>
            <div class="property-row">
                <color-picker :color="item.style.background.color" :alpha="item.style.background.alpha" @input="onBackgroundPickerInput"></color-picker>
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
        onBackgroundPickerInput(color, alpha) {
            this.item.style.background.color = color;
            this.item.style.background.alpha = alpha;
            this.redrawItem();
        },
        onInactiveBackgroundPickerInput(color, alpha) {
            this.item.style.inactiveBackground.color = color;
            this.item.style.inactiveBackground.alpha = alpha;
            this.redrawItem();
        }
    }
}
</script>

<style lang="css">
</style>
