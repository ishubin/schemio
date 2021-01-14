<template>
    <modal title="Advanced Behavior Editor" @close="$emit('close')" :stretch-width="true" :max-width="900" :use-mask="false">
        <div ref="advancedBehaviorContainer" class="advanced-behavior-editor">
            <input type="text" class="textfield" v-model="searchKeyword" placeholder="Search...">

            <element-picker
                :key="`advanced-behavior-pick-item-1-${revision}`"
                :scheme-container="schemeContainer"
                :excluded-item-ids="existingItemIds"
                :use-self="false"
                :allow-groups="false"
                none-label="Choose item..."
                @selected="prependItemForElement(arguments[0])"
                />

            <div class="behavior-advanced-editor">
                <div :id="`advanced-behavior-item-${item.id}`" v-for="item in itemsWithBehavior">
                    <h3>{{item.name}}</h3>

                    <behavior-properties
                        :key="`behavior-panel-${item.id}`"
                        :project-id="projectId"
                        :item="item"
                        :extended="true"
                        :scheme-container="schemeContainer"
                        />
                </div>
            </div>

            <element-picker
                :key="`advanced-behavior-pick-item-2-${revision}`"
                :scheme-container="schemeContainer"
                :excluded-item-ids="existingItemIds"
                :use-self="false"
                :allow-groups="false"
                none-label="Choose item..."
                @selected="appendItemForElement(arguments[0])"
                />
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
import shortid from 'shortid';

export default {
    components: { Modal, BehaviorProperties, ElementPicker },

    props: {
        schemeContainer: Object,
        projectId: String
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
            this.addItemForElement(elementSelector, false);
        },

        appendItemForElement(elementSelector) {
            this.addItemForElement(elementSelector, true);
        },

        addItemForElement(elementSelector, atTheEnd) {
            const item = this.schemeContainer.findFirstElementBySelector(elementSelector);
            if (!item) {
                return;
            }
            if (find(this.existingItems, existingItem => existingItem.id === item.id)) {
                this.scrollToItem(item.id);
                return;
            }

            item.behavior.events.push({
                id: shortid.generate(),
                event: 'clicked',
                actions: []
            });

            let idx = 0;
            if (atTheEnd) {
                idx = this.this.existingItems.length;
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

        scrollToItem(itemId) {
            const itemDiv = document.getElementById(`advanced-behavior-item-${itemId}`);
            if (!itemDiv) {
                return;
            }

            this.$refs.advancedBehaviorContainer.parentElement.scrollTop = itemDiv.offsetTop;
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