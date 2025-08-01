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
        <table style="width: 100%;">
            <tbody>
                <tr>
                    <td>
                        <NumberTextfield :value="x" name="x" @changed="updateAreaProperty('x', $event)"/>
                    </td>
                    <td>
                        <NumberTextfield :value="w" name="w" @changed="updateAreaProperty('w', $event)"/>
                    </td>
                </tr>
                <tr>
                    <td>
                        <NumberTextfield :value="y" name="y" @changed="updateAreaProperty('y', $event)"/>
                    </td>
                    <td>
                        <NumberTextfield :value="h" name="h" @changed="updateAreaProperty('h', $event)"/>
                    </td>
                </tr>
                <tr>
                    <td>
                        <NumberTextfield :value="r" icon="fas fa-sync-alt" @changed="updateAreaProperty('r', $event)"/>
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
                        <NumberTextfield :value="sx" :name="scaleNameX" :step="0.1" @changed="updateScaleX"/>
                    </td>
                    <td>
                        <span class="toggle-button" :class="{toggled: scaleLocked}" @click="scaleLocked = !scaleLocked">
                            <i class="fas fa-lock"></i>
                        </span>
                    </td>
                    <td>
                        <NumberTextfield :value="sy" name="Scale Y" :disabled="scaleLocked" :step="0.1"  @changed="updateScaleY"/>
                    </td>
                </tr>
            </tbody>
        </table>
    </panel>
</template>

<script>
import Panel from '../Panel.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import {forEach} from '../../../collections';
import EditorEventBus from '../EditorEventBus';

export default {
    props: ['item', 'editBox', 'editorId'],
    components: {Panel, NumberTextfield},

    beforeMount() {
        EditorEventBus.editBox.updated.$on(this.editorId, this.onEditBoxChange);
    },

    beforeDestroy() {
        EditorEventBus.editBox.updated.$off(this.editorId, this.onEditBoxChange);
    },

    data() {
        const sx = this.editBox.items[0].area.sx;
        const sy = this.editBox.items[0].area.sy;

        return {
            x: this.editBox.area.x,
            y: this.editBox.area.y,
            w: this.editBox.area.w,
            h: this.editBox.area.h,
            r: this.editBox.area.r,
            isSingleItem: this.editBox.items.length === 1,
            sx: sx,
            sy: sy,
            scaleLocked: sx === sy
        };
    },

    methods: {
        toggleItemLock() {
            this.editBox.locked = !this.editBox.locked;

            forEach(this.editBox.items, item => {
                item.locked = this.editBox.locked;
            });

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
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

            if (this.scaleLocked) {
                this.sy = this.sx;
            }

            this.$emit('scale-changed', this.sx, this.sy);
        },

        updateScaleY(value) {
            this.sy = value;
            this.$emit('scale-changed', this.sx, this.sy);
        },
    },

    computed: {
        scaleNameX() {
            if (this.scaleLocked) {
                return 'Scale';
            }
            return 'Scale X';
        }
    }
}
</script>

<style lang="css">
</style>
