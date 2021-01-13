<template>
    <modal title="Advanced Behavior Editor" @close="$emit('close')" :stretch-width="true" :max-width="900" :use-mask="false">

        <input type="text" class="textfield" v-model="searchKeyword" placeholder="Search...">

        <div class="behavior-advanced-editor">
            <div v-for="item in itemsWithBehavior">
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

        Choose item for behavior editing: 
        
        <element-picker
            :scheme-container="schemeContainer"
            :excluded-item-ids="existingItemIds"
            :use-self="false"
            :allow-groups="false"
            @selected="appendItemForElement(arguments[0])"
            />
    </modal>
</template>

<script>
import Modal from '../../Modal.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import ElementPicker from '../ElementPicker.vue';
import filter from 'lodash/filter';
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
            searchKeyword: '',
            existingItems: [],
            existingItemIds: [],
        };
    },

    methods: {
        appendItemForElement(elementSelector) {
            const item = this.schemeContainer.findFirstElementBySelector(elementSelector);
            if (item) {
                item.behavior.events.push({
                    id: shortid.generate(),
                    event: 'clicked',
                    actions: []
                });
            }

            this.refreshExistingItems();
        },

        refreshExistingItems() {
            this.existingItems = this.filterItems();
            this.existingItemIds = map(this.existingItems, item => item.id);
        },

        filterItems() {
            return filter(this.schemeContainer.getItems(), item => item.behavior && item.behavior.events && item.behavior.events.length > 0);
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