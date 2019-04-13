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
                <color-picker :color="item.style.inactive.stroke.color" @input="item.style.inactive.stroke.color = arguments[0]"></color-picker>
                <span class="property-label">Inactive Stroke</span>
            </div>
            <div class="property-row">
                <span class="property-label">Inactive Stroke Size</span>
                <input type="text" v-model="item.style.inactive.stroke.size">
            </div>

            <div class="property-row">
                <span class="property-label">Inactive Pattern</span>
                <select type="text" v-model="item.style.inactive.stroke.pattern">
                    <option v-for="pattern in knownStrokePatterns">{{pattern}}</option>
                </select>
            </div>


            <div class="property-row">
                <color-picker :color="item.style.active.background.color" @input="onBackgroundPickerInput"></color-picker>
                <span class="property-label">Active Background</span>
            </div>
            <div class="property-row">
                <color-picker :color="item.style.active.stroke.color" @input="item.style.active.stroke.color = arguments[0]"></color-picker>
                <span class="property-label">Active Stroke</span>
            </div>
            <div class="property-row">
                <span class="property-label">Active Stroke Size</span>
                <input type="text" v-model="item.style.active.stroke.size">
            </div>

            <div class="property-row">
                <span class="property-label">Active Pattern</span>
                <select type="text" v-model="item.style.active.stroke.pattern">
                    <option v-for="pattern in knownStrokePatterns">{{pattern}}</option>
                </select>
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
import knownItems from '../../../scheme/knownItems.js';


export default {
    props: ['item'],

    components: {Panel, ColorPicker, GeneralPanel, LinksPanel, ConnectionsPanel},

    data() {
        return {
            knownStrokePatterns: knownItems.overlay.values.strokePatterns
        };
    },

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
