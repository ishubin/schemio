<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <h5>Name</h5>
        <input class="textfield" type="text" v-model="connector.name"/>

        <h5>Opacity</h5>
        <input class="textfield" type="text" v-model="connector.opacity"/>

        <h5>Type</h5>
        <select v-model="connector.connectorType">
            <option v-for="type in connectorTypes">{{type}}</option>
        </select>

        <h5>Source</h5>
        Style:
        <select v-model="connector.source.type">
            <option v-for="type in knownCapStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.source.size"/>

        <h5>Destination</h5>
        Style:
        <select v-model="connector.destination.type">
            <option v-for="type in knownCapStyleTypes">{{type}}</option>
        </select>
        <input type="text" v-model="connector.destination.size"/>

        <h5>Style</h5>

        <div class="property-row">
            <color-picker :color="connector.color" @input="connector.color = arguments[0];"></color-picker>
            <span class="property-label">Color</span>
        </div>

        <div class="property-row">
            <span class="property-label">Stroke size</span>
            <input type="text" v-model="connector.width">
        </div>

        <div class="property-row">
            <span class="property-label">Pattern</span>
            <select type="text" v-model="connector.pattern" @change="onConnectorChange">
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
            connectorTypes: Connector.Type.values()
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
