<!--
    This component shows items in tree structure and allows the following operations:
        - select / deselect
        - lock / unlock item
        - drag and drop (reorder items or move into different parent)
 -->
<template>
    <div class="item-selector">
        <div class="item-row" v-for="item in schemeContainer.getItems()" :key="item.id" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
            <div class="item" v-if="item.meta.collapseBitMask === 0" :class="{'selected': item.meta.selected}">
                <span class="item-collapser" @click="toggleItemCollapseState(item)" v-if="item.childItems && item.childItems.length > 0">
                    <i v-if="item.meta.collapsed" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-down"></i>
                </span>
                <div class="item-name" @click="onItemClicked(item, arguments[0])">{{item.name}}</div>
            </div>
        </div>
    </div>
</template>

<script>
import {forEach} from 'lodash';


function visitItems(items, parentItem, callback) {
    if (items) {
        forEach(items, item => {
            callback(item, parentItem);
            if (item.childItems) {
                visitItems(item.childItems, item, callback);
            }
        })
    }
}

export default {
    props: ['schemeContainer'],

    data() {
        return {};
    },

    methods: {
        onItemClicked(item, event) {
            this.schemeContainer.selectItem(item, event.metaKey || event.ctrlKey);
        },

        toggleItemCollapseState(item) {
            item.meta.collapsed = !item.meta.collapsed;

            visitItems(item.childItems, item, (childItem, parentItem) => {
                childItem.meta.collapseBitMask = (parentItem.meta.collapseBitMask << childItem.meta.ancestorIds.length) | (parentItem.meta.collapsed ? 1: 0)
            });

            this.$forceUpdate();
        }
    }
}
</script>