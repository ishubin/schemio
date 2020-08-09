<!--
    This component shows items in tree structure and allows the following operations:
        - select / deselect
        - lock / unlock item
        - drag and drop (reorder items or move into different parent)
 -->
<template>
    <div ref="itemSelectorContainer" class="item-selector" >
        <div class="item-selector-top-panel">
            <input class="textfield" v-model="searchKeyword" type="text" placeholder="Search"/>
        </div>
        <div class="item-selector-items" :style="{'max-height': `${maxHeight}px`, 'min-height': `${minHeight}px`}">
            <div v-for="item in filteredItems" :key="item.id" :ref="`row_${item.id}`">
                <div class="item-row" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
                    <div class="item"
                        :ref="`item_${item.id}`"
                        v-if="item.meta.collapseBitMask === 0"
                        :class="{'selected': item.meta.selected}"
                        :draggable="item.id !== nameEdit.itemId"
                        @dragstart="onDragStarted(item)"
                        @dragover="onDragOver(item, arguments[0])"
                        @dragend="onDragEnd(arguments[0])"
                        >
                        <span class="item-collapser" @click="toggleItemCollapseState(item)" v-if="item.childItems && item.childItems.length > 0">
                            <i v-if="item.meta.collapsed" class="fas fa-angle-right"></i>
                            <i v-else class="fas fa-angle-down"></i>
                        </span>

                        <div class="item-name" @mousedown="onItemClicked(item, arguments[0])" @dblclick="onItemDoubleClicked(item, arguments[0])">
                            <span v-if="item.id !== nameEdit.itemId"><i class="fas fa-cube"></i> {{item.name}}</span>
                            <input v-if="item.id === nameEdit.itemId"
                                ref="nameEditInput"
                                v-model="nameEdit.name"
                                type="text"
                                data-type="item-name-edit-in-place"
                                @keydown.enter="cancelNameEdit()"
                                @keydown.esc="cancelNameEdit()"/>
                        </div>

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
                <div class="item-row" v-if="dragging.readyToDrop && item.id === dragging.destinationId && dragging.item"  :style="{'padding-left': `${(item.meta.ancestorIds.length + (dragging.dropInside ? 1:0)) * 25 + 15}px`}">
                    <div class="item" v-html="dragging.itemHtml"> </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {forEach, indexOf, filter} from 'lodash';
import EventBus from './EventBus';


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
    props: ['schemeContainer', 'maxHeight', 'minHeight'],

    mounted() {
        document.body.addEventListener('mouseup', this.onMouseUp);
        EventBus.$on(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$on(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
        // EventBus.$on(EventBus.SCHEME_CHANGED, this.onScheme);
        this.scrollToSelection();
    },
    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
        EventBus.$off(EventBus.ANY_ITEM_SELECTED, this.onAnyItemSelected);
        EventBus.$off(EventBus.ANY_ITEM_DESELECTED, this.onAnyItemDeselected);
    },
    data() {
        return {
            searchKeyword: '',
            dragging: {
                // the item that is dragged,
                item: null,
                // the item to which the dragged item is supposed to be dropped
                destinationId: null,
                dropInside: false,
                clearTimeoutId: null,
                readyToDrop: false,
                itemHtml: 'Drop here'
            },
            nameEdit: {
                itemId: null,
                name: ''
            },
            filteredItems: this.schemeContainer.getItems()
        };
    },

    methods: {
        scrollToSelection() {
            if (this.schemeContainer.selectedItems.length === 1) {
                const itemId = this.schemeContainer.selectedItems[0].id;
                const rowDom = this.$refs[`row_${itemId}`];
                const itemSelectorDom = this.$refs.itemSelectorContainer;
                if (rowDom && itemSelectorDom) {
                    const topPos = rowDom.offsetTop - itemSelectorDom.offsetTop;
                    const height = itemSelectorDom.getBoundingClientRect().height;
                    const offsetWithinScroll = topPos - itemSelectorDom.scrollTop;
                    if (offsetWithinScroll < -5 || offsetWithinScroll > height - 5) {
                        itemSelectorDom.scrollTop = Math.max(0, topPos - 20);
                    }
                }
            }
        },

        // This function is needed in order to handle clicking outside of the component
        // this way we are able to cancel item name in-place editing and dragging states
        onMouseUp(event) {
            if (event.target && event.target.getAttribute('data-type') === 'item-name-edit-in-place') {
                return true;
            } else {
                this.nameEdit.itemId = null;
            }

            if (this.dragging.item) {
                this.clearTimeoutId = setTimeout(() => {
                    this.dragging.item = null;
                    this.dragging.destinationId = null;
                }, 1000);
            }
        },

        cancelNameEdit() {
            this.nameEdit.itemId = null;
        },

        onItemClicked(item, event) {
            if (event.target && event.target.getAttribute('data-type') === 'item-name-edit-in-place') {
                return true;
            }

            // canceling in-place name edit
            if (this.nameEdit.itemId &&  this.nameEdit.itemId !== item.id) {
                this.nameEdit.itemId = null;
            }

            this.schemeContainer.selectItem(item, event.metaKey || event.ctrlKey);
        },

        onItemDoubleClicked(item) {
            this.nameEdit.name = item.name;
            this.nameEdit.itemId = item.id;
            this.$nextTick(() => {
                const input = this.$refs.nameEditInput;
                if (input) {
                    if (Array.isArray(input)) {
                        if (input.length > 0) {
                            input[0].focus();
                        }
                    } else {
                        input.focus();
                    }
                }
            });
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
            EventBus.emitItemChanged(item.id, 'visible');
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
            const domItem = this.$refs[`item_${item.id}`];
            if (domItem) {
                this.dragging.itemHtml = domItem.innerHTML;
            }
            this.$forceUpdate();
        },

        onDragOver(item, event) {
            if (!this.dragging.item || this.dragging.item.id === item.id) {
                return;
            }

            //checking whether the dragged item is one of ancestors of destination item
            if (item.meta && item.meta.ancestorIds) {
                if (indexOf(item.meta.ancestorIds, this.dragging.item.id) >= 0) {
                    this.dragging.readyToDrop = false;
                    return;
                }
            }

            this.dragging.destinationId = item.id;
            this.dragging.dropInside = event.offsetX > 50;
            this.dragging.readyToDrop = true;
        },

        onDragEnd(event) {
            if (this.dragging.readyToDrop && this.dragging.item && this.dragging.destinationId && this.dragging.item.id !== this.dragging.destinationId) {
                if (this.dragging.dropInside) {
                    this.schemeContainer.remountItemInsideOtherItem(this.dragging.item.id, this.dragging.destinationId);
                } else {
                    this.schemeContainer.remountItemAfterOtherItem(this.dragging.item.id, this.dragging.destinationId);
                }
            }

            this.dragging.item = null;
            this.dragging.destinationId = null;
        },

        onAnyItemSelected() {
            this.scrollToSelection();
            this.$forceUpdate();
        },

        onAnyItemDeselected() {
            this.$forceUpdate();
        },

        filterItemsByKeyword(keyword) {
            const loweredKeyword = keyword.toLowerCase();
            return filter(this.schemeContainer.getItems(), item => (item.name || '').toLowerCase().indexOf(loweredKeyword) >= 0);
        }
    },

    watch: {
        nameEdit: {
            deep: true,
            handler() {
                if (this.nameEdit.itemId) {
                    const item = this.schemeContainer.findItemById(this.nameEdit.itemId);
                    if (item) {
                        item.name = this.nameEdit.name;
                    }
                }
            }
        },
        searchKeyword(keyword) {
            if (!keyword) {
                this.filteredItems = this.schemeContainer.getItems();
            } else {
                this.filteredItems = this.filterItemsByKeyword(keyword);
            }
        }
    }
}
</script>