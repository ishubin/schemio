<template lang="html">
    <div>
        <h5>Source</h5>
        Style:
        <select v-model="connector.style.source.type">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.source.size"/>

        <h5>Destination</h5>
        Style:
        <select v-model="connector.style.destination.type">
            <option v-for="type in knownEndStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.destination.size"/>

        <h5>Style</h5>
        <div class="property-row">
            <color-picker :color="connector.style.color" @input="connector.style.color = arguments[0]"></color-picker>
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
        var data =  {
            knownEndStyleTypes: ['empty', 'arrow', 'triangle', 'circle']
        };

        return data;
    }
}
</script>

<style lang="css">
</style>
