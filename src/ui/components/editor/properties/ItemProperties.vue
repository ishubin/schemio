<template lang="html">
    <div class="item-properties">
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
        <component-properties v-if="item.type === 'component'" :item="item"/>
        <image-properties v-if="item.type === 'image'" :item="item"/>
    </div>
</template>

<script>
import ComponentProperties from './ComponentProperties.vue';
import ImageProperties from './ImageProperties.vue';

export default {
    props: ['item'],
    components: {ComponentProperties, ImageProperties},

    data() {
        return {
            itemLocked: this.item.locked || false,
            itemGroup: this.item.group
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
    }
}
</script>

<style lang="css">
</style>
