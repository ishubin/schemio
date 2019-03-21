<template lang="html">
    <panel name="Style" v-if="item.type !== 'image'">
        <div class="property-row" v-if="item.style.background && item.style.background.color">
            <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
            <span class="property-label">Background</span>
        </div>
    </panel>
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
