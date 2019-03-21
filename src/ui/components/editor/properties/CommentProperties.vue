<template lang="html">
    <div>
        <div>
            <textarea v-model="item.description"></textarea>
        </div>

        <panel name="Style">
            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Background</span>
            </div>

            <div class="property-row" v-if="item.style.text && item.style.text.color">
                <color-picker :color="item.style.text.color" @input="item.style.text.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Text color</span>
            </div>
            <div class="property-row" v-if="item.style.stroke && item.style.stroke.color">
                <color-picker :color="item.style.stroke.color" @input="item.style.stroke.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Stroke color</span>
            </div>
        </panel>
    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import ColorPicker from '../ColorPicker.vue';
import Panel from '../Panel.vue';

export default {
    props: ['item'],

    components: {Panel, ColorPicker},

    methods: {
        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    }
}
</script>

<style lang="css">
</style>
