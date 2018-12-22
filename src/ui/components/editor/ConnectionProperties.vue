<template lang="html">
    <div>
        <h5>Source</h5>
        Style:
        <select v-model="connector.style.source.type" @change="redrawConnector">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.source.size" @change="redrawConnector"/>

        <h5>Destination</h5>
        Style:
        <select v-model="connector.style.destination.type" @change="redrawConnector">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.destination.size" @change="redrawConnector"/>

        <h5>Style</h5>
        <div class="property-row">
            <color-picker :color="connector.style.color" @input="connector.style.color = arguments[0];"></color-picker>
            <span class="property-label">Color</span>
        </div>

        <div class="property-row">
            <span class="property-label">Stoke size</span>
            <input type="text" v-model="connector.style.width" @change="redrawConnector"/>
        </div>

        <div class="property-row">
            <span class="property-label">Pattern</span>
            <select type="text" v-model="connector.style.pattern" @change="redrawConnector">
                <option v-for="pattern in knownPatterns">{{pattern}}</option>
            </select>
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
        var data =  {
            knownEndStyleTypes: ['empty', 'arrow', 'triangle', 'circle'],

            knownPatterns: ['line', 'dotted', 'dashed']
        };

        return data;
    },
    methods: {
        redrawConnector() {
            EventBus.$emit(EventBus.REDRAW_CONNECTOR, this.connector);
        }
    }
}
</script>

<style lang="css">
</style>
