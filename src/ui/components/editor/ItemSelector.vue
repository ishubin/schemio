<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<!--
    This component shows items in tree structure and allows the following operations:
        - select / deselect
        - lock / unlock item
        - drag and drop (reorder items or move into different parent)
 -->
<template>
    <div class="item-selector">
        <div class="item-selector-top-panel">
            <input class="textfield" v-model="searchKeyword" type="text" placeholder="Search"/>
        </div>
        <div ref="itemSelectorContainer" class="item-selector-items" :style="{'max-height': `${maxHeight}px`, 'min-height': `${minHeight}px`}">
            <div v-for="(item, idx) in filteredItems"
                class="item-selector-item-row-container"
                :key="item.id"
                :ref="`row_${item.id}`"
                :data-item-id="item.id"
                :data-index="idx"
                >
                <div class="item-row item-drop-preview" v-if="dragging.readyToDrop && item.id === dragging.destinationId && dragging.item && dragging.dropAbove"  :style="{'padding-left': `${(item.meta.ancestorIds.length) * 25 + 15}px`}">
                    <div class="item">
                        <div class="item-name">
                            <span><i class="fas fa-cube"></i> {{dragging.previewItemName}}</span>
                        </div>
                    </div>
                </div>
                <div class="item-row" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
                    <div class="item"
                        :ref="`item_${item.id}`"
                        v-if="item.meta.collapseBitMask === 0"
                        :class="{'selected': schemeContainer.isItemSelected(item)}"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        @mousedown="onItemMouseDown(item, $event)"
                        @dblclick="onItemDoubleClicked(item, $event)"
                        >
                        <span class="item-collapser" @click="toggleItemCollapseState(item)" v-if="item.childItems && item.childItems.length > 0">
                            <i v-if="item.meta.collapsed" class="fas fa-angle-right"></i>
                            <i v-else class="fas fa-angle-down"></i>
                        </span>

                        <div class="item-name">
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
                <div class="item-row item-drop-preview" v-if="dragging.readyToDrop && item.id === dragging.destinationId && dragging.item && !dragging.dropAbove"  :style="{'padding-left': `${(item.meta.ancestorIds.length + (dragging.dropInside ? 1:0)) * 25 + 15}px`}">
                    <div class="item">
                        <div class="item-name">
                            <span><i class="fas fa-cube"></i> {{dragging.previewItemName}}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div ref="itemDragger" style="position: fixed; white-space:nowrap;" :style="{display: dragging.item && dragging.startedDragging ? 'inline-block' : 'none' }">
            <div v-if="dragging.item">
                <span><i class="fas fa-cube"></i> {{dragging.item.name}}</span>
            </div>
        </div>
    </div>
</template>

<script>
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import filter from 'lodash/filter';
import EventBus from './EventBus';
import utils from '../../utils';


const mouseOffset = 2;

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
                dropAbove: false, // if set to true then dropInside is ignored
                readyToDrop: false,
                previewItemName: 'Drop here',

                startedDragging: false,
                pageX: 0,
                pageY: 0,
            },
            nameEdit: {
                itemId: null,
                name: ''
            },
            filteredItems: this.schemeContainer.getItems(),

            // used for vertical multi-select when user holds shift
            lastClickedItem: null
        };
    },

    methods: {
        scrollToSelection() {
            if (this.schemeContainer.selectedItems.length === 1) {
                const itemId = this.schemeContainer.selectedItems[0].id;
                const rowDoms = this.$refs[`row_${itemId}`];
                if (rowDoms && rowDoms.length >= 1) {
                    const rowDom = rowDoms[0];
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
        },

        cancelNameEdit() {
            this.nameEdit.itemId = null;
        },

        preventEvent(event) {
            event.preventDefault();
            event.stopPropagation();
        },

        onItemMouseDown(item, event) {
            // This function is too large. I know, it sucks. But it was easier to manage all the dragging and dropping inside this function.
            // Drag-and-drop is a complex thing as it involves too many bookkeeping and checking (we even have to keep track of scrolling)
            // So for now it will do, but it would be better to refactor it some day

            if (event.target) {
                if (event.target.getAttribute('data-type') === 'item-name-edit-in-place'
                    || event.target.closest('.item-collapser')) {
                    return true;
                }
            }

            if (event.shiftKey && this.lastClickedItem) {
                //checking if last clicked item was not deleted
                const lastClickedItem = this.schemeContainer.findItemById(this.lastClickedItem.id);
                if (lastClickedItem) {
                    this.selectItemsVertically(lastClickedItem, item);
                    this.lastClickedItem = item;
                    return;
                }
                else {
                    this.lastClickedItem = null;
                }
            }
            this.lastClickedItem = item;

            // canceling in-place name edit
            if (this.nameEdit.itemId &&  this.nameEdit.itemId !== item.id) {
                this.nameEdit.itemId = null;
            }

            if (!this.schemeContainer.isItemSelected(item)) {
                this.schemeContainer.selectItem(item, event.metaKey || event.ctrlKey);
            }

            const originalPageX = event.pageX;
            const originalPageY = event.pageY;
            const itemDragger = this.$refs.itemDragger;
            let pixelsMoved = 0;

            this.dragging.item = null;
            this.dragging.startedDragging = false;
            const that = this;

            function initiateDragging() {
                that.dragging.item = item;
                that.dragging.previewItemName = item.name;
                that.dragging.startedDragging = true;
                that.filteredItems = filter(that.filterItemsByKeyword(that.searchKeyword), item => !that.schemeContainer.isItemSelected(item));
            }

            const itemSelectorDom = this.$refs.itemSelectorContainer;
            const scrollMargin = 20;

            let scrollIntervalId = null;
            let lastScrollingStep = 0;
            function startScrolling(scrollStep) {
                if (!scrollIntervalId || lastScrollingStep !== scrollStep) {
                    stopScrolling();
                    lastScrollingStep = scrollStep;
                    scrollIntervalId = setInterval(() => {
                        itemSelectorDom.scrollTop += scrollStep;
                    }, 10);
                }
            }

            function stopScrolling() {
                if (scrollIntervalId) {
                    clearInterval(scrollIntervalId);
                    scrollIntervalId = null;
                    lastScrollingStep = 0;
                }
            }

            function moveAt(event, pageX, pageY) {
                const rootBbox = itemSelectorDom.getBoundingClientRect();
                if (rootBbox.bottom - pageY < scrollMargin) {
                    startScrolling(2);
                } else if (rootBbox.top - pageY > -scrollMargin) {
                    startScrolling(-2);
                } else {
                    stopScrolling();
                }
                
                pixelsMoved += Math.abs(pageX - originalPageX) + Math.abs(pageY - originalPageY);

                if (!that.dragging.startedDragging && pixelsMoved > 10) {
                    initiateDragging();
                }
                itemDragger.style.left = `${pageX + mouseOffset}px`;
                itemDragger.style.top = `${pageY + mouseOffset}px`;
                that.dragging.pageX = pageX;
                that.dragging.pageY = pageY;


                const itemRowElement = utils.domFindAncestorByClassUntil(event.target, 'item-selector-item-row-container', element => element.classList.contains('item-selector-items'))
                if (itemRowElement) {
                    const itemId = itemRowElement.getAttribute('data-item-id');
                    const overItem = that.schemeContainer.findItemById(itemId);
                    if (overItem) {
                        dragOverItem(event, overItem, itemRowElement);
                    }
                } else {
                    that.dragging.readyToDrop = false;
                    that.dragging.destinationId = null;
                }
            }

            function dragOverItem(event, overItem, domItem) {
                if (!that.dragging.item || that.dragging.item.id === overItem.id) {
                    that.dragging.readyToDrop = false;
                    return;
                }

                //checking whether the dragged item is dragged over other selected items
                if (that.schemeContainer.isItemSelected(overItem)) {
                    return;
                }

                //checking whether the dragged item is one of ancestors of destination item
                if (overItem.meta && overItem.meta.ancestorIds) {
                    if (indexOf(overItem.meta.ancestorIds, that.dragging.item.id) >= 0) {
                        that.dragging.readyToDrop = false;
                        return;
                    }
                }


                //TODO calling this function is slow
                const bbox = domItem.getBoundingClientRect();

                const xDiff = that.dragging.pageX - bbox.left - overItem.meta.ancestorIds.length * 25 - 15;
                that.dragging.destinationId = overItem.id;
                that.dragging.dropInside = xDiff > 50;

                if (Array.isArray(domItem)) {
                    domItem = domItem[0];
                }
                let dropAbove = false;
                const index = parseInt(domItem.getAttribute('data-index'))
                if (index === 0) {
                    dropAbove = event.clientY < bbox.top + bbox.height/2;
                }

                that.dragging.dropAbove = dropAbove;
                that.dragging.readyToDrop = true;
            }

            function onMouseMove(event) {
                if (event.buttons === 0) {
                    reset();
                    return;
                }
                moveAt(event, event.pageX, event.pageY);
            }

            function onMouseUp() {
                if (that.dragging.readyToDrop && that.dragging.item && that.dragging.destinationId && that.dragging.item.id !== that.dragging.destinationId) {
                    if (that.dragging.dropAbove) {
                        forEach(that.schemeContainer.selectedItems, item => {
                            that.schemeContainer.remountItemBeforeOtherItem(item.id, that.dragging.destinationId);
                        });
                    } else if (that.dragging.dropInside) {
                        forEach(that.schemeContainer.selectedItems, item => {
                            that.schemeContainer.remountItemInsideOtherItem(item.id, that.dragging.destinationId);
                        });
                    } else {
                        forEach(that.schemeContainer.selectedItems, item => {
                            that.schemeContainer.remountItemAfterOtherItem(item.id, that.dragging.destinationId);
                        });
                    }
                }
                reset();
            }


            function reset() {
                stopScrolling();

                that.dragging.startedDragging = false;
                that.dragging.item = null;
                that.dragging.destinationId = null;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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

        selectItemsVertically(item1, item2) {
            let idx1 = -1;
            let idx2 = -1;

            for(let i = 0; i < this.filteredItems.length && (idx1 < 0 || idx2 < 0); i += 1) {
                if (this.filteredItems[i].id === item1.id) {
                    idx1 = i;
                }
                if (this.filteredItems[i].id === item2.id) {
                    idx2 = i;
                }
            }
            if (idx1 < 0 || idx2 < 0) {
                return;
            }

            const itemsForSelection = [];
            for (let i = Math.min(idx1, idx2); i <= Math.max(idx1, idx2); i += 1) {
                itemsForSelection.push(this.filteredItems[i])
            }
            this.schemeContainer.selectMultipleItems(itemsForSelection, true);

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
                        EventBus.emitSchemeChangeCommited(`item.${item.id}.name`);
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