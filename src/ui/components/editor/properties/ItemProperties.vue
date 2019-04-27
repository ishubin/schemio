<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

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

        <position-panel :item="item"/>

        <component-properties v-if="item.type === 'component'" :item="item"/>
        <image-properties v-if="item.type === 'image'" :item="item"/>
        <overlay-properties v-if="item.type === 'overlay'" :item="item"/>
        <comment-properties v-if="item.type === 'comment'" :item="item"/>
    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import ComponentProperties from './ComponentProperties.vue';
import PositionPanel from './PositionPanel.vue';
import ImageProperties from './ImageProperties.vue';
import OverlayProperties from './OverlayProperties.vue';
import CommentProperties from './CommentProperties.vue';

export default {
    props: ['item'],
    components: {ComponentProperties, PositionPanel, ImageProperties, OverlayProperties, CommentProperties},

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
    },

    watch: {
        //TODO get rid of this watcher and detect changes in other ways. At this moment this component is the one responsible for detecting any changes on the item (even dragging it)
       item: {
           handler: function(newValue) {
               EventBus.$emit(EventBus.ITEM_CHANGED, newValue);
               this.$forceUpdate();
               EventBus.$emit(EventBus.REDRAW);  //TODO move redrawing to SvgEditor
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
