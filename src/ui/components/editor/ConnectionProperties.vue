<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <h5>Name</h5>
        <input class="textfield" type="text" v-model="connector.name"/>

        <h5>Source</h5>
        Style:
        <select v-model="connector.style.source.type">
            <option v-for="type in knownCapStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.source.size"/>

        <h5>Destination</h5>
        Style:
        <select v-model="connector.style.destination.type">
            <option v-for="type in knownCapStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.style.destination.size"/>

        <h5>Style</h5>

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
            <select type="text" v-model="connector.style.pattern" @change="onConnectorChange">
                <option v-for="pattern in knownPatterns">{{pattern}}</option>
            </select>
        </div>
    </div>
</template>

<script>
import ColorPicker from './ColorPicker.vue';
import EventBus from './EventBus.js';
import Connector from '././../../scheme/Connector.js';
export default {
    props: ['connector'],

    components: {ColorPicker},
    data() {
        return {
            knownCapStyleTypes: Connector.CapType.values(),
            knownPatterns: Connector.Pattern.values(),
        };
    },
    methods: {
        onConnectorChange() {
            EventBus.emitConnectorChanged(this.connector.id);
        }
    }
}
</script>

<style lang="css">
</style>
