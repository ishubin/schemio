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
    </div>
</template>

<script>
import EventBus from './EventBus.js';

export default {
    props: ['connector'],

    data() {
        if (!this.connector.style) {
            this.connector.style = {};
        }
        if (!this.connector.style.destination) {
            this.connector.style.destination = {type: 'empty', size: 5};
        }
        if (!this.connector.style.source) {
            this.connector.style.source = {type: 'empty', size: 5};
        }

        var data =  {
            styleDestinationType: this.connector.style.destination.type,
            styleDestinationSize: this.connector.style.destination.size,
            styleSourceType: this.connector.style.source.type,
            styleSourceSize: this.connector.style.source.size,

            knownEndStyleTypes: ['empty', 'arrow', 'triangle', 'circle']
        };

        return data;
    },
    watch: {
        styleDestinationType(type) {
            this.connector.style.destination.type = type;
            EventBus.$emit(EventBus.REDRAW);
        },

        styleSourceType(type) {
            this.connector.style.source.type = type;
            EventBus.$emit(EventBus.REDRAW);
        }
    }
}
</script>

<style lang="css">
</style>
