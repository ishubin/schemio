<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Items" @close="$emit('close')">
        <input class="textfield" type="text" v-model="searchKeyword"/>
        <div class="item-list-container">
            <ul>
                <li v-for="item in filteredItems">
                    <span class="link"
                        :class="{'unnamed-item': item.name.length === 0}"
                        @click="onItemClick(item)"
                        >{{item.name}}</span>
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
                EventBus.emitItemSelected(item.id);
                this.$emit('close');
                EventBus.$emit(EventBus.BRING_TO_VIEW, item.area);
            }
        }
    },
    computed: {
        filteredItems() {
            var keyword = this.searchKeyword.trim().toLowerCase();
            var items = [];
            _.forEach(this.items, item => {
                if (keyword) {
                    if (item.name.toLowerCase().indexOf(keyword) >= 0 || item.description.toLowerCase().indexOf(keyword) >= 0) {
                        items.push(item);
                    }
                } else {
                    items.push(item);
                }
            });

            return _.sortBy(items, 'name');
        }
    }
}
</script>
<style lang="css">
</style>
