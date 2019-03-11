<template lang="html">
    <modal title="Items" @close="$emit('close')">
        <input class="textfield" type="text" v-model="searchKeyword"/>
        <div class="item-list-container">
            <ul>
                <li v-for="item in items" v-if="(shouldFilterItems && item.shown) || !shouldFilterItems">
                    <span class="link"
                        :class="{'unnamed-item': item.name.length === 0}"
                        @click="onItemClick(item)"
                        >{{item.name | formatName}}</span>
                </li>
            </ul>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import EventBus from './EventBus.js';
import _ from 'lodash';


function sortItems(items) {
    items.sort((a, b) => {
        if (a.name.length === 0) {
            return 1;
        }
        if (a.name < b.name){
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    })
}

export default {
    props: ['schemeContainer'],
    components: {Modal},

    data() {
        var items = _.map(this.schemeContainer.scheme.items, item => {
            return {
                id: item.id,
                shown: true,
                name: item.name,
                description: item.description
            };
        });

        sortItems(items);
        return {
            items,
            searchKeyword: '',
            shouldFilterItems: false
        };
    },
    methods: {
        onItemClick(itemData) {
            var item = this.schemeContainer.findItemById(itemData.id);
            if (item) {
                this.schemeContainer.selectItem(item);
                EventBus.$emit(EventBus.ACTIVE_ITEM_SELECTED, item);
                this.$emit('close');
                EventBus.$emit(EventBus.BRING_TO_VIEW, item.area);
            }
        }
    },
    watch: {
        searchKeyword(newValue) {
            var keyword = newValue.trim().toLowerCase();
            if (keyword.length > 0) {
                this.shouldFilterItems = true;
                _.forEach(this.items, item => {
                    item.shown = item.name.toLowerCase().indexOf(keyword) >= 0 || item.description.toLowerCase().indexOf(keyword) >= 0;
                });
            } else {
                this.shouldFilterItems = false;
            }
        }
    },
    filters: {
        formatName(name) {
            if (name.length === 0) {
                return 'Unnamed'
            }
            return name;
        }
    }
}
</script>
<style lang="css">
</style>
