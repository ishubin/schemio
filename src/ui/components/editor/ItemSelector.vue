<!--
    This component shows items in tree structure and allows the following operations:
        - select / deselect
        - lock / unlock item
        - drag and drop (reorder items or move into different parent)
 -->
<template>
    <div class="item-selector">
        <div v-for="item in schemeContainer.getItems()" :key="item.id">
            <div class="item-row" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
                <div class="item"
                    v-if="item.meta.collapseBitMask === 0"
                    :class="{'selected': item.meta.selected}"
                    draggable="true"
                    @dragstart="onDragStarted(item)"
                    @dragover="onDragOver(item, arguments[0])"
                    @dragend="onDragEnd(arguments[0])"
                    >
                    <span class="item-collapser" @click="toggleItemCollapseState(item)" v-if="item.childItems && item.childItems.length > 0">
                        <i v-if="item.meta.collapsed" class="fas fa-angle-right"></i>
                        <i v-else class="fas fa-angle-down"></i>
                    </span>
                    <div class="item-name" @click="onItemClicked(item, arguments[0])">{{item.name}}</div>
                    <div class="item-right-panel">
                        <span class="icon" @click="toggleItemLock(item)">
                            <i v-if="item.locked" class="fas fa-lock icon-locked"></i>
                            <i v-else class="fas fa-unlock icon-unlocked"></i>
                        </span>
                        <span class="icon" @click="toggleItemVisibility(item)">
                            <i v-if="item.visible" class="fas fa-lightbulb icon-visible"></i>
                            <i v-else class="far fa-lightbulb icon-invisible"></i>
                        </span>
                    </div>
                </div>
            </div>
            <div class="item-row item-droppable-highlight" v-if="item.id === dragging.destinationId && dragging.item"  :style="{'padding-left': `${(item.meta.ancestorIds.length + (dragging.dropInside ? 1:0)) * 25 + 15}px`}">
                <div class="item">
                    <div class="item-name">{{dragging.item.name}}</div>
                </div>
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

    mounted() {
        document.body.addEventListener('mouseup', this.onMouseUp);
    },
    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
    },
    data() {
        return {
            dragging: {
                // the item that is dragged,
                item: null,
                // the item to which the dragged item is supposed to be dropped
                destinationId: null,
                dropInside: false,
                clearTimeoutId: null
            }
        };
    },

    methods: {
        onMouseUp(event) {
            if (this.dragging.item) {
                this.clearTimeoutId = setTimeout(() => {
                    this.dragging.item = null;
                    this.dragging.destinationId = null;
                }, 1000);
            }
        },

        onItemClicked(item, event) {
            this.schemeContainer.selectItem(item, event.metaKey || event.ctrlKey);
        },

        toggleItemCollapseState(item) {
            item.meta.collapsed = !item.meta.collapsed;

            visitItems(item.childItems, item, (childItem, parentItem) => {
                childItem.meta.collapseBitMask = (parentItem.meta.collapseBitMask << childItem.meta.ancestorIds.length) | (parentItem.meta.collapsed ? 1: 0)
            });

            this.$forceUpdate();
        },

        toggleItemVisibility(item) {
            item.visible = !item.visible;
            this.$forceUpdate();
        },

        toggleItemLock(item) {
            item.locked = !item.locked;
            this.$forceUpdate();
        },

        onDragStarted(item) {
            if (this.clearTimeoutId) {
                clearTimeout(this.clearTimeoutId);
                this.clearTimeoutId = null;
            }
            this.dragging.item = item;
            this.$forceUpdate();
        },

        onDragOver(item, event) {
            if (!this.dragging.item || this.dragging.item.id === item.id) {
                return;
            }
            this.dragging.destinationId = item.id;
            this.dragging.dropInside = event.offsetX > 50;
        },

        onDragEnd(event) {
            if (this.dragging.item && this.dragging.destinationId && this.dragging.item.id !== this.dragging.destinationId) {
                if (this.dragging.dropInside) {
                    this.schemeContainer.remountItemInsideOtherItem(this.dragging.item.id, this.dragging.destinationId);
                } else {
                    this.schemeContainer.remountItemAfterOtherItem(this.dragging.item.id, this.dragging.destinationId);
                }
            }

            this.dragging.item = null;
            this.dragging.destinationId = null;
        }
    }
}
</script>