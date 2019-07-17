<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

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
            <input type="checkbox" v-model="connector.style.smooth">
            <span class="property-label">Smooth</span>
        </div>


        <div class="property-row">
            <color-picker :color="connector.style.color" @input="connector.style.color = arguments[0];"></color-picker>
            <span class="property-label">Color</span>
        </div>

        <div class="property-row">
            <span class="property-label">Stroke size</span>
            <input type="text" v-model="connector.style.width">
        </div>

        <div class="property-row">
            <span class="property-label">Pattern</span>
            <select type="text" v-model="connector.style.pattern">
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
    }
}
</script>

<style lang="css">
</style>
