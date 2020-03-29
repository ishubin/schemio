<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="Position">
        <ul class="button-group">
            <li>
                <span class="toggle-button" @click="toggleItemLock()"
                    :class="{'toggled': itemLocked}"
                    >
                    <i class="fas" :class="[itemLocked ? 'fa-lock' : 'fa-unlock']"></i>
                </span>
            </li>
        </ul>
        <table class="position-panel-table">
            <tbody>
                <tr>
                    <td class="property-row">
                        <number-textfield :value="x" name="x" @changed="updateAreaProperty('x', arguments[0])"/>
                    </td>
                    <td class="property-row">
                        <number-textfield :value="y" name="y" @changed="updateAreaProperty('y', arguments[0])"/>
                    </td>
                </tr>
                <tr>
                    <td class="property-row">
                        <number-textfield :value="w" name="w" @changed="updateAreaProperty('w', arguments[0])"/>
                    </td>
                    <td class="property-row">
                        <number-textfield :value="h" name="h" @changed="updateAreaProperty('h', arguments[0])"/>
                    </td>
                </tr>
                <tr>
                    <td class="property-row">
                        <number-textfield :value="r" icon="fas fa-sync-alt" @changed="updateAreaProperty('r', arguments[0])"/>
                    </td>
                    <td class="property-row">
                    </td>
                </tr>
            </tbody>
        </table>


        <br/>
        <span class="property-label">Type:</span>
        <select v-model="type">
            <option v-for="knownType in knownTypes">{{knownType}}</option>

        </select>

    </panel>
</template>

<script>
import Panel from '../Panel.vue';
import EventBus from '../EventBus.js';
import NumberTextfield from '../../NumberTextfield.vue';

export default {
    props: ['item'],
    components: {Panel, NumberTextfield},

    beforeMount() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    data() {
        return {
            x: this.item.area.x,
            y: this.item.area.y,
            w: this.item.area.w,
            h: this.item.area.h,
            r: this.item.area.r,
            type: this.item.area.type,

            itemLocked: this.item.locked || false,

            knownTypes: ['relative', 'viewport']
        };
    },

    methods: {
        toggleItemLock() {
            this.itemLocked = !this.itemLocked;
            this.item.locked = this.itemLocked;
        },

        onItemChanged() {
            this.x = this.item.area.x;
            this.y = this.item.area.y;
            this.w = this.item.area.w;
            this.h = this.item.area.h;
            this.r = this.item.area.r;
            this.type = this.item.area.type;
        },

        updateAreaProperty(propertyName, value) {
            this.item.area[propertyName] = value;
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.area.${propertyName}`);
        }
    },

    watch: {
        type(text) {
            this.item.area.type = text;
            EventBus.emitItemChanged(this.item.id, 'area.type');
        }
    }
}
</script>

<style lang="css">
</style>
