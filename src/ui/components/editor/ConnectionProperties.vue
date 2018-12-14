<template lang="html">
    <div>
        <h5>Source</h5>
        Style:
        <select v-model="styleSourceType">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>

        <h5>Destination</h5>
        Style:
        <select v-model="styleDestinationType">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>

        <h5>Style</h5>
        <div class="property-row">
            <color-picker :color="styleColor" @input="styleColor = arguments[0]"></color-picker>
            <span class="property-label">Color</span>
        </div>
    </div>
</template>

<script>
import ColorPicker from './ColorPicker.vue';
import EventBus from './EventBus.js';

export default {
    props: ['connector'],

    components: {ColorPicker},
    data() {
        if (!this.connector.style) {
            this.connector.style = {};
        }
        if (!this.connector.style.color) {
            this.connector.style.color = '#333';
        }
        if (!this.connector.style.destination) {
            this.connector.style.destination = {type: 'empty', size: 5};
        }
        if (!this.connector.style.source) {
            this.connector.style.source = {type: 'empty', size: 5};
        }

        var data =  {
            styleColor: this.connector.style.color,
            styleDestinationType: this.connector.style.destination.type,
            styleDestinationSize: this.connector.style.destination.size,
            styleSourceType: this.connector.style.source.type,
            styleSourceSize: this.connector.style.source.size,

            knownEndStyleTypes: ['empty', 'arrow', 'triangle', 'circle']
        };

        return data;
    },
    watch: {
        styleColor(color) {
            this.connector.style.color = color;
            EventBus.$emit(EventBus.REDRAW_CONNECTOR, this.connector);
        },

        styleDestinationType(type) {
            this.connector.style.destination.type = type;
            EventBus.$emit(EventBus.REDRAW_CONNECTOR, this.connector);
        },

        styleSourceType(type) {
            this.connector.style.source.type = type;
            EventBus.$emit(EventBus.REDRAW_CONNECTOR, this.connector);
        }
    }
}
</script>

<style lang="css">
</style>
