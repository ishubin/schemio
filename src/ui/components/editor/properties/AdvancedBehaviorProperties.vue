<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Advanced Behavior Editor" @close="$emit('close')" :stretch-width="true" :max-width="900" :use-mask="false">
        <div ref="advancedBehaviorContainer" class="advanced-behavior-editor">
            <input type="text" class="textfield" v-model="searchKeyword" placeholder="Search...">

            <div class="advanced-behavior-menu">
                <element-picker
                    :key="`advanced-behavior-pick-item-1-${revision}`"
                    :scheme-container="schemeContainer"
                    :excluded-item-ids="existingItemIds"
                    :use-self="false"
                    :allow-tags="false"
                    none-label="Choose item..."
                    @selected="prependItemForElement(arguments[0])"
                    />
            </div>

            <div class="behavior-advanced-editor">
                <div :id="`advanced-behavior-item-${item.id}`" v-for="item in itemsWithBehavior">
                    <span class="item-title">{{item.name}}</span>

                    <BehaviorProperties
                        :key="`behavior-panel-${item.id}`"
                        :editorId="editorId"
                        :item="item"
                        :extended="true"
                        :scheme-container="schemeContainer"
                        @jumped-to-item="jumpToItem"
                        />
                </div>
            </div>

            <div class="advanced-behavior-menu">
                <element-picker
                    :key="`advanced-behavior-pick-item-2-${revision}`"
                    :scheme-container="schemeContainer"
                    :excluded-item-ids="existingItemIds"
                    :use-self="false"
                    :allow-tags="false"
                    none-label="Choose item..."
                    @selected="appendItemForElement(arguments[0])"
                    />
                </div>
            </div>

    </modal>
</template>

<script>
import Modal from '../../Modal.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import ElementPicker from '../ElementPicker.vue';
import filter from 'lodash/filter';
import find from 'lodash/find';
import map from 'lodash/map';

export default {
    components: { Modal, BehaviorProperties, ElementPicker },

    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object},
    },

    beforeMount() {
        this.refreshExistingItems();
    },

    data() {
        return {
            revision: 0,
            searchKeyword: '',
            existingItems: [],
            existingItemIds: [],
        };
    },

    methods: {
        prependItemForElement(elementSelector) {
            const item = this.schemeContainer.findFirstElementBySelector(elementSelector);
            if (!item) {
                return;
            }
            this.addItem(item, false);
        },

        appendItemForElement(elementSelector) {
            const item = this.schemeContainer.findFirstElementBySelector(elementSelector);
            if (!item) {
                return;
            }
            this.addItem(item, true);
        },

        addItem(item, atTheEnd) {
            this.searchKeyword = '';

            let idx = 0;
            if (atTheEnd) {
                idx = this.existingItems.length;
            }
            this.existingItems.splice(idx, 0, item);
            this.existingItemIds.splice(idx, 0, item.id);
            this.revision += 1;
        },

        refreshExistingItems() {
            this.existingItems = this.filterItems();
            this.existingItemIds = map(this.existingItems, item => item.id);
        },

        filterItems() {
            return filter(this.schemeContainer.getItems(), item => item.behavior && item.behavior.events && item.behavior.events.length > 0);
        },

        scrollToItem(item) {
            if (!item) {
                return;
            }

            const itemDiv = document.getElementById(`advanced-behavior-item-${item.id}`);
            if (!itemDiv) {
                return;
            }

            this.$refs.advancedBehaviorContainer.parentElement.scrollTop = itemDiv.offsetTop;
        },


        jumpToItem(item) {
            if (!find(this.existingItemIds, id => id === item.id)) {
                this.addItem(item, true);
                this.$nextTick(() => {
                    this.scrollToItem(item);
                });
            } else {
            }
        }
    },



    computed: {
        itemsWithBehavior() {
            const keyword = this.searchKeyword.toLowerCase();
            if (keyword) {
                return filter(this.schemeContainer.getItems(), item => item.name.toLowerCase().indexOf(keyword) >= 0);
            }
            return this.existingItems;
        }
    }
    
}
</script>