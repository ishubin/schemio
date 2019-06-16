<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <div>
            <input type="checkbox" v-model="item.interactive">
            <span class="property-label">Interactive</span>
        </div>

        <rich-text-editor v-model="item.description"
            @changed="item.description = arguments[0];"
            ></rich-text-editor>

        <connections-panel :item="item"/>

        <panel name="Style">
            <span class="property-label">Shape: </span>
            <select v-model="item.style.shape">
                <option v-for="knownShape in knownShapes">{{knownShape}}</option>
            </select>

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
                <div class="property-row">
                    <span class="property-label">Opacity: </span>
                    <input type="text" v-model="item.style.opacity"/>
                </div>
        </panel>
    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import ColorPicker from '../ColorPicker.vue';
import Panel from '../Panel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import knownItems from '../../../scheme/knownItems.js';
import RichTextEditor from '../../RichTextEditor.vue';

export default {
    props: ['item'],

    components: {Panel, ColorPicker, ConnectionsPanel, RichTextEditor},

    data() {
        return {
            knownShapes: knownItems.comment.values.style.shape
        };
    },

    methods: {
        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    }
}
</script>

<style lang="css">
</style>
