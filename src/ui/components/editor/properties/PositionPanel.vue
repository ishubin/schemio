<template lang="html">
    <panel name="Position">
        <table>
            <tbody>
                <tr>
                    <td>
                        <div class="property-row">
                            x: <input type="text" v-model="x"/>
                        </div>
                    </td>
                    <td>
                        <div class="property-row">
                            y: <input type="text" v-model="y"/>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="property-row">
                            w: <input type="text" v-model="w"/>
                        </div>
                    </td>
                    <td>
                        <div class="property-row">
                            h: <input type="text" v-model="h"/>
                        </div>
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
