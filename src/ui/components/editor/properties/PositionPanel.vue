<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="Position">
        <table class="position-panel-table">
            <tbody>
                <tr>
                    <td class="property-row">
                        <span class="property-label">x:</span> <input class="textfield textfield-small" type="text" v-model="x"/>
                    </td>
                    <td class="property-row">
                        <span class="property-label">W:</span> <input class="textfield textfield-small" type="text" v-model="w"/>
                    </td>
                </tr>
                <tr>
                    <td class="property-row">
                        <span class="property-label">y:</span> <input class="textfield textfield-small" type="text" v-model="y"/>
                    </td>
                    <td class="property-row">
                        <span class="property-label">H:</span> <input class="textfield textfield-small" type="text" v-model="h"/>
                    </td>
                </tr>
            </tbody>
        </table>

    </panel>
</template>

<script>
import Panel from '../Panel.vue';

export default {
    props: ['item'],
    components: {Panel},

    data() {
        return {
            x: this.item.area.x,
            y: this.item.area.y,
            w: this.item.area.w,
            h: this.item.area.h,
        }
    },

    watch: {
        item: {
            deep: true,
            handler(newItem) {
                this.x = newItem.area.x;
                this.y = newItem.area.y;
                this.w = newItem.area.w;
                this.h = newItem.area.h;
            }
        },
        x(text) {
            if (text.length > 0) {
                this.item.area.x = parseFloat(text);
            }
        },
        y(text) {
            if (text.length > 0) {
                this.item.area.y = parseFloat(text);
            }
        },
        w(text) {
            if (text.length > 0) {
                this.item.area.w = parseFloat(text);
            }
        },
        h(text) {
            if (text.length > 0) {
                this.item.area.h = parseFloat(text);
            }
        },
    }
}
</script>

<style lang="css">
</style>
