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
        <div ref="itemSelectorContainer" class="item-selector-items" :style="{'height': `${height}px`, 'min-height': `${minHeight}px`}" oncontextmenu="return false;">
            <div v-for="(item, idx) in filteredItems"
                class="item-selector-item-row-container item-droppable-area"
                :key="`itsel-${item.id}`"
                :ref="`row_${item.id}`"
                :data-item-id="item.id"
                :data-index="idx"
                >
                <div class="item-row item-drop-preview" v-if="dragging.readyToDrop && idx === dragging.previewIdx && dragging.dropAbove"  :style="{'padding-left': `${(item.meta.ancestorIds.length) * 25 + 15}px`}">
                    <div class="item">
                        <div class="item-name">
                            <img v-if="dragging.previewIconUrl" :src="dragging.previewIconUrl" class="item-icon"/>
                            <i v-else class="fas fa-cube"></i>
                            <span> {{dragging.previewItemName}} </span>
                        </div>
                    </div>
                </div>
                <div class="item-row" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
                    <div class="item"
                        :ref="`item_${item.id}`"
                        v-if="item.meta.collapseBitMask === 0"
                        :class="{'selected': schemeContainer.isItemSelected(item), 'templated-item': item.args && item.args.templated, 'templated-item-root': item.args && item.args.templateRef}"
                        :title="item.args && item.args.templated ? 'This item is templated': ''"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        @mousedown="onItemMouseDown(item, $event)"
                        @dblclick="onItemDoubleClicked(item )"
                        >
                        <span class="item-collapser" @click="toggleItemCollapseState(item)" v-if="item.childItems && item.childItems.length > 0">
                            <i v-if="item.meta.collapsed" class="fas fa-angle-right"></i>
                            <i v-else class="fas fa-angle-down"></i>
                        </span>

                        <div class="item-name">
                            <img v-if="item.meta.iconUrl" :src="item.meta.iconUrl" class="item-icon"/>
                            <i v-else class="fas fa-cube"></i>
                            <span v-if="item.id !== nameEdit.itemId">
                                {{item.name}}
                            </span>
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
                <div class="item-row item-drop-preview" v-if="dragging.readyToDrop && idx === dragging.previewIdx && !dragging.dropAbove"  :style="{'padding-left': `${dragging.padding}px`}">
                    <div class="item">
                        <div class="item-name">
                            <img v-if="dragging.previewIconUrl" :src="dragging.previewIconUrl" class="item-icon"/>
                            <i v-else class="fas fa-cube"></i>
                            <span>
                                {{dragging.previewItemName}}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div ref="itemDragger" class="item-selector-drag-preview" style="position: fixed; white-space:nowrap;" :style="{display: dragging.startedDragging ? 'inline-block' : 'none' }">
            <div class="item-name" :class="`preview-${itemIdx}`" v-for="(item, itemIdx) in dragging.items" v-if="itemIdx < 3">
                <img v-if="item.meta.iconUrl" :src="item.meta.iconUrl" class="item-icon"/>
                <i v-else class="fas fa-cube"></i>
                <span>
                    {{item.name}}
                </span>
            </div>
        </div>

        <div class="item-selector-resize-dragger" @mousedown="onItemSelectorResizeDraggerMouseDown"> </div>
    </div>
</template>

<script>
import {forEach, filter} from '../../collections';
import myMath from '../../myMath';
import { dragAndDropBuilder } from '../../dragndrop';
import { traverseItems } from '../../scheme/Item';
import { createSettingStorageFromLocalStorage } from '../../LimitedSettingsStorage';
import EditorEventBus from './EditorEventBus';
import Shape from './items/shapes/Shape';

const settingsStorage = createSettingStorageFromLocalStorage('item-selector', 5);


/**
 * Enriches item with additional fields that are used in item selector for rendering
 * @param {Item} item
 * @param {Store} $store
 * @returns {Item}
 */
function enrichedItem(item, $store) {
    const shape = Shape.find(item.shape);
    if (!shape) {
        return item;
    }

    if (item.shape === 'path') {
        item.meta.iconUrl = `${$store.state.routePrefix}/assets/images/items/path.svg`;
    } else if (shape.menuItems && shape.menuItems.length > 0) {
        item.meta.iconUrl = shape.menuItems[0].iconUrl;
    }

    return item;
}

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
    props: {
        editorId: {type: String, required: true},
        schemeContainer: {type: Object},
        minHeight: {type: Number},
        revision: {type: String},
    },

    mounted() {
        document.body.addEventListener('mouseup', this.onMouseUp);
        EditorEventBus.item.selected.any.$on(this.editorId, this.onAnyItemSelected);
        EditorEventBus.item.deselected.any.$on(this.editorId, this.onAnyItemDeselected);
        this.scrollToSelection();
    },

    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
        EditorEventBus.item.selected.any.$off(this.editorId, this.onAnyItemSelected);
        EditorEventBus.item.deselected.any.$off(this.editorId, this.onAnyItemDeselected);
    },

    data() {
        const height = parseInt(settingsStorage.get('height', 0));
        return {
            searchKeyword: '',
            height: myMath.clamp(height, this.minHeight, 1000),
            dragging: {
                // the items that are dragged,
                items: [],

                // the item to which the dragged item is supposed to be dropped
                destinationId: null,
                dropInside: false,
                dropAbove: false, // if set to true then dropInside is ignored
                readyToDrop: false,
                previewItemName: 'Drop here',
                previewIconUrl: null,

                startedDragging: false,
                pageX: 0,
                pageY: 0,
                padding: 0,
                previewIdx: -1, // used to allocate a slot for previewing the item
            },
            nameEdit: {
                itemId: null,
                name: ''
            },
            filteredItems: this.schemeContainer.getItems().map(item => enrichedItem(item, this.$store)),

            // used for vertical multi-select when user holds shift
            lastClickedItem: null
        };
    },

    methods: {
        scrollToSelection() {
            //TODO optimize this code. apparently when adding an item to a large doc this function takes up to 72 ms
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
            if (event.target) {
                if (event.target.getAttribute('data-type') === 'item-name-edit-in-place'
                    || event.target.closest('.item-collapser')) {
                    return true;
                }
            }
            const originalEvent = event;

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

            if (!event.shiftKey) {
                const multiSelect = event.metaKey || event.ctrlKey;
                if (!this.schemeContainer.isItemSelected(item)) {
                    this.schemeContainer.selectItem(item, multiSelect);
                } else if (multiSelect) {
                    this.schemeContainer.deselectItem(item, multiSelect);
                    return;
                }
            }

            if (event.button === 2) {
                this.$emit('item-right-clicked', item, event.pageX, event.pageY);
                return;
            }

            dragAndDropBuilder(event)
            .withDraggedElement(this.$refs.itemDragger)
            .withDroppableClass('item-droppable-area')
            .withScrollableElement(this.$refs.itemSelectorContainer)

            .onDragStart(event => {
                this.dragging.items = [].concat(this.schemeContainer.selectedItems);
                const draggedItemIds = new Set();

                let found = false
                for (let i = 0; i < this.dragging.items.length && !found; i++) {
                    if (this.dragging.items[i].id === item.id) {
                        found = true;
                    }
                }
                if (!found) {
                    this.dragging.items.unshift(item);
                }

                this.dragging.items.forEach(draggedItem => {
                    traverseItems([draggedItem], item => {
                        draggedItemIds.add(item.id);
                    });
                });


                // checking whether ancestor items are already dragged, then we don't need to reattach it's child on drop
                const finalDraggedItems = [];
                this.dragging.items.forEach(item => {
                    let ancestorMatch = false;
                    for (let i = 0; i < item.meta.ancestorIds.length && !ancestorMatch; i++) {
                        if (draggedItemIds.has(item.meta.ancestorIds[i])) {
                            ancestorMatch = true;
                        }
                    }
                    if (!ancestorMatch) {
                        finalDraggedItems.push(item);
                    }
                });

                this.dragging.items = finalDraggedItems;

                this.dragging.previewItemName = item.name;
                this.dragging.previewIconUrl = enrichedItem(item, this.$store).meta.iconUrl;
                this.dragging.startedDragging = true;
                this.filteredItems = filter(this.filterItemsByKeyword(this.searchKeyword), itemForFilter => {
                    return !draggedItemIds.has(itemForFilter.id);
                });

                this.$forceUpdate();
            })

            .onDrag(event => {
                this.dragging.pageX = event.pageX;
                this.dragging.pageY = event.pageY;
            })

            .onDragOver((event, element) => {
                const bbox = element.getBoundingClientRect();
                let overItem = this.schemeContainer.findItemById(element.getAttribute('data-item-id'));
                let dropAbove = event.clientY < bbox.top + bbox.height/2;

                //searching for item index in the filtered list
                let found = false;
                for (let idx = 0; idx < this.filteredItems.length && !found; idx++) {
                    if (this.filteredItems[idx].id === overItem.id) {
                        found = true;
                        this.dragging.previewIdx = idx;
                    }
                }


                const xDiff = this.dragging.pageX - bbox.left - overItem.meta.ancestorIds.length * 25 - 15;

                this.dragging.destinationId = overItem.id;
                this.dragging.dropInside = xDiff > 35;


                if (xDiff < 0 && overItem.meta.ancestorIds.length > 0) {
                    const ancestorsBack =  myMath.clamp(Math.ceil(Math.abs(xDiff / 25)), 1, overItem.meta.ancestorIds.length);
                    this.dragging.destinationId = overItem.meta.ancestorIds[overItem.meta.ancestorIds.length - ancestorsBack];
                }


                this.dragging.dropAbove = dropAbove;
                this.dragging.readyToDrop = true;
                this.dragging.padding = (overItem.meta.ancestorIds.length + (this.dragging.dropInside ? 1:0)) * 25 + 15;
            })

            .onDone(() => {
                if (!this.dragging.startedDragging && !originalEvent.shiftKey) {
                    // should deselect the rest of items as it was just a simple click
                    this.schemeContainer.selectItem(item, originalEvent.metaKey || originalEvent.ctrlKey);
                }

                this.dragging.startedDragging = false;
                if (this.dragging.readyToDrop && this.dragging.items.length > 0 && this.dragging.destinationId) {
                    let handler = null;
                    if (this.dragging.dropAbove) {
                        handler = (item) => {
                            this.schemeContainer.remountItemBeforeOtherItem(item.id, this.dragging.destinationId);
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        };
                    } else if (this.dragging.dropInside) {
                        handler = (item) => {
                            this.schemeContainer.remountItemInsideOtherItem(item.id, this.dragging.destinationId, 0);
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        };
                    } else {
                        handler = (item) => {
                            this.schemeContainer.remountItemAfterOtherItem(item.id, this.dragging.destinationId);
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        };
                    }

                    let draggingItems = this.dragging.items;
                    if (!this.dragging.dropAbove) {
                        draggingItems = draggingItems.reverse();
                    }

                    forEach(draggingItems, (item) => {
                        if (item.id !== this.dragging.destinationId) {
                            handler(item);
                        }
                    });
                    this.schemeContainer.reindexItems();
                    this.schemeContainer.updateEditBox();
                }
                this.dragging.items = [];
                this.dragging.destinationId = null;
                this.filteredItems = this.filterItemsByKeyword(this.searchKeyword);
            })
            .build();
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
            this.$forceUpdate();
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
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'visible');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.visible`);
            this.$forceUpdate();
        },

        toggleItemLock(item) {
            item.locked = !item.locked;
            this.schemeContainer.updateEditBox();
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
            return filter(this.schemeContainer.getItems(), item => (item.name || '')
                .toLowerCase()
                .indexOf(loweredKeyword) >= 0)
                .map(item => enrichedItem(item, this.$store));
        },

        onItemSelectorResizeDraggerMouseDown(originalEvent) {
            dragAndDropBuilder(originalEvent)
            .onDrag(event => {
                const rect = this.$refs.itemSelectorContainer.getBoundingClientRect();

                const overflow = event.pageY - rect.bottom;

                const newHeight = myMath.clamp(this.height + overflow, this.minHeight, window.innerHeight - 140);
                this.height = newHeight;
                settingsStorage.save('height', this.height);
            })
            .build();
        },
    },

    watch: {
        revision() {
            this.filteredItems = this.filterItemsByKeyword(this.searchKeyword);
            this.dragging.readyToDrop = false;
            this.dragging.destinationId = null;
            this.dragging.dropInside = false;
            this.dragging.previewItemName = 'Drop here';
            this.dragging.previewIconUrl = null;
            this.dragging.startedDragging = false;
            this.$nextTick(() => {
                this.scrollToSelection();
            });
        },

        nameEdit: {
            deep: true,
            handler() {
                if (this.nameEdit.itemId) {
                    const item = this.schemeContainer.findItemById(this.nameEdit.itemId);
                    if (item) {
                        item.name = this.nameEdit.name;
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.name`);
                    }
                }
            }
        },
        searchKeyword(keyword) {
            if (!keyword) {
                this.filteredItems = this.schemeContainer.getItems().map(item => enrichedItem(item, this.$store));
            } else {
                this.filteredItems = this.filterItemsByKeyword(keyword);
            }
        }
    }
}
</script>