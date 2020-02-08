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
            <li v-if="itemGroup">
                <span class="toggle-button" @click="ungroupItem()">
                    <i class="fas fa-object-ungroup"></i>
                </span>
            </li>
        </ul>
        <table class="position-panel-table">
            <tbody>
                <tr>
                    <td class="property-row">
                        <span class="property-label">x:</span> <input class="textfield textfield-small" type="text" v-model="x"/>
                    </td>
                    <td class="property-row">
                        <span class="property-label">y:</span> <input class="textfield textfield-small" type="text" v-model="y"/>
                    </td>
                </tr>
                <tr>
                    <td class="property-row">
                        <span class="property-label">W:</span> <input class="textfield textfield-small" type="text" v-model="w"/>
                    </td>
                    <td class="property-row">
                        <span class="property-label">H:</span> <input class="textfield textfield-small" type="text" v-model="h"/>
                    </td>
                </tr>
            </tbody>
        </table>
        <span class="property-label"><i class="fas fa-sync"></i>: </span> <input class="textfield textfield-small" type="text" v-model="r"/>
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

export default {
    props: ['item'],
    components: {Panel},

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
            itemGroup: this.item.group,

            knownTypes: ['relative', 'viewport']
        };
    },

    methods: {
        toggleItemLock() {
            this.itemLocked = !this.itemLocked;
            this.item.locked = this.itemLocked;
        },

        ungroupItem() {
            this.$emit('ungroup-item');
            this.itemGroup = null;
        },

        onItemChanged() {
            this.x = this.item.area.x;
            this.y = this.item.area.y;
            this.w = this.item.area.w;
            this.h = this.item.area.h;
            this.r = this.item.area.r;
            this.type = this.item.area.type;
        },

        updateAreaProperty(propertyName, textValue) {
            if (textValue.length > 0) {
                this.item.area[propertyName] = parseFloat(textValue);
                EventBus.emitItemChanged(this.item.id);
            }
        }
    },

    watch: {
        x(text) {
            this.updateAreaProperty('x', text);
        },
        y(text) {
            this.updateAreaProperty('y', text);
        },
        w(text) {
            this.updateAreaProperty('w', text);
        },
        h(text) {
            this.updateAreaProperty('h', text);
        },
        r(text) {
            this.updateAreaProperty('r', text);
        },
        type(text) {
            this.item.area.type = text;
            EventBus.emitItemChanged(this.item.id, 'area.type');
        }
    }
}
</script>

<style lang="css">
</style>
