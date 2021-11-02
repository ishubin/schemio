<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="Position">
        <ul class="button-group">
            <li>
                <span class="toggle-button" @click="toggleItemLock()"
                    :title="editBox.locked ? 'Unlock item' : 'Lock item'"
                    :class="{'toggled': editBox.locked}"
                    >
                    <i class="fas" :class="[editBox.locked ? 'fa-lock' : 'fa-unlock']"></i>
                </span>
            </li>
        </ul>
        <table>
            <tbody>
                <tr>
                    <td>
                        <number-textfield :value="x" name="x" @changed="updateAreaProperty('x', arguments[0])"/>
                    </td>
                    <td>
                        <number-textfield :value="w" name="w" @changed="updateAreaProperty('w', arguments[0])"/>
                    </td>
                </tr>
                <tr>
                    <td>
                        <number-textfield :value="y" name="y" @changed="updateAreaProperty('y', arguments[0])"/>
                    </td>
                    <td>
                        <number-textfield :value="h" name="h" @changed="updateAreaProperty('h', arguments[0])"/>
                    </td>
                </tr>
                <tr>
                    <td>
                        <number-textfield :value="r" icon="fas fa-sync-alt" @changed="updateAreaProperty('r', arguments[0])"/>
                    </td>
                    <td>
                    </td>
                </tr>
            </tbody>
        </table>
        <table v-if="isSingleItem">
            <tbody>
                <tr>
                    <td>
                        <number-textfield :value="sx" name="sx" @changed="updateScaleX(arguments[0])"/>
                    </td>
                    <td>
                        <number-textfield :value="sy" name="sy" @changed="updateScaleY(arguments[0])"/>
                    </td>
                </tr>
            </tbody>
        </table>
    </panel>
</template>

<script>
import Panel from '../Panel.vue';
import EventBus from '../EventBus.js';
import NumberTextfield from '../../NumberTextfield.vue';
import forEach from 'lodash/forEach';

export default {
    props: ['item', 'editBox'],
    components: {Panel, NumberTextfield},

    beforeMount() {
        EventBus.$on(EventBus.MULTI_ITEM_EDIT_BOX_ITEMS_UPDATED, this.onEditBoxChange);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.MULTI_ITEM_EDIT_BOX_ITEMS_UPDATED, this.onEditBoxChange);
    },

    data() {
        return {
            x: this.editBox.area.x,
            y: this.editBox.area.y,
            w: this.editBox.area.w,
            h: this.editBox.area.h,
            r: this.editBox.area.r,
            isSingleItem: this.editBox.items.length === 1,
            sx: this.editBox.items[0].area.sx,
            sy: this.editBox.items[0].area.sy,
        };
    },

    methods: {
        toggleItemLock() {
            this.editBox.locked = !this.editBox.locked;

            forEach(this.editBox.items, item => {
                item.locked = this.editBox.locked;
            });
        },

        onEditBoxChange() {
            this.x = this.editBox.area.x;
            this.y = this.editBox.area.y;
            this.w = this.editBox.area.w;
            this.h = this.editBox.area.h;
            this.r = this.editBox.area.r;
        },

        updateAreaProperty(propertyName, value) {
            this.$emit('area-changed', propertyName, value);
        },

        updateScaleX(value) {
            this.sx = value;
            this.$emit('scale-changed', this.sx, this.sy);
        },

        updateScaleY(value) {
            this.sy = value;
            this.$emit('scale-changed', this.sx, this.sy);
        },
    },
}
</script>

<style lang="css">
</style>
