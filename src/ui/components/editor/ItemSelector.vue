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
                class="item-droppable-area"
                :key="`itsel-${item.id}`"
                :ref="`row_${item.id}`"
                :data-item-id="item.id"
                :data-index="idx"
                >
                <div ref="itemRows" :data-item-id="item.id" class="item-row" :data-padding="item.meta.ancestorIds.length * 25 + 15" :style="{'padding-left': `${item.meta.ancestorIds.length * 25 + 15}px`}">
                    <div class="item"
                        :ref="`item_${item.id}`"
                        v-if="item.meta.collapseBitMask === 0"
                        :class="{'selected': schemeContainer.isItemSelected(item), 'candidate-drop': dragging.destinationId === item.id, 'candidate-drop-above': dragging.destinationId === item.id && dragging.dropAbove, 'candidate-drop-inside': dragging.destinationId === item.id && dragging.dropInside, 'templated-item': item.args && item.args.templated, 'templated-item-root': item.args && item.args.templateRef}"
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
            </div>
        </div>


        <div ref="itemDragger" class="item-selector-drag-preview" style="position: fixed; white-space:nowrap;" :style="{display: dragging.startedDragging ? 'inline-block' : 'none', width: `${dragging.dragBox.width}px`, height: `${dragging.dragBox.height}px`}">
            <div class="item-name" v-for="(itemBox) in dragging.dragBox.itemBoxes" :style="{left: `${itemBox.left}px`, top: `${itemBox.top}px`, width: `${itemBox.width}px`, height: `${itemBox.height}px`}">
                <img v-if="itemBox.iconUrl" :src="itemBox.iconUrl" class="item-icon"/>
                <i v-else class="fas fa-cube"></i>
                <span>
                    {{itemBox.name}}
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
            itemRowBoxes: [],
            itemRowBoxesById: new Map(),
            dragging: {
                // the items that are dragged,
                items: [],
                // ids of items that are dragged
                itemIds: new Set(),

                dragBox : {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    itemBoxes: []
                },
                dragOffset: {
                    left: 0,
                    top: 0,
                },

                // the item to which the dragged item is supposed to be dropped
                destinationId: null,
                dropInside: false,
                dropAbove: false, // if set to true then dropInside is ignored
                readyToDrop: false,

                startedDragging: false,
                adding: 0,
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
            .onDragStart((event, cfg) => {
                this.dragging.items = [].concat(this.schemeContainer.selectedItems);
                const draggedItemIds = new Set();

                let found = false;
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
                this.dragging.itemIds = draggedItemIds;

                this.dragging.dragBox = this.collectedDragBox(this.dragging.items);

                this.dragging.dragOffset.left = this.dragging.dragBox.left - event.pageX;
                this.dragging.dragOffset.top = this.dragging.dragBox.top - event.pageY;
                cfg.setPreviewOffset(this.dragging.dragOffset.left, this.dragging.dragOffset.top);


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

                this.rebuildItemRowBoxes();

                this.dragging.previewItemName = item.name;
                this.dragging.previewIconUrl = enrichedItem(item, this.$store).meta.iconUrl;
                this.dragging.startedDragging = true;

                this.$forceUpdate();
            })

            .onScrollStop(() => {
                this.rebuildItemRowBoxes();
            })

            .onDrag(event => {
                const containerRect = this.$refs.itemSelectorContainer.getBoundingClientRect();
                const x = event.pageX - containerRect.left + this.dragging.dragOffset.left;
                const y = event.pageY - containerRect.top + this.dragging.dragOffset.top;

                let matchingBox = null;
                for (let i = 0; i < this.itemRowBoxes.length; i++) {
                    const box = this.itemRowBoxes[i];
                    if (!this.dragging.itemIds.has(box.itemId) && box.top <= y && y <= box.top + box.height) {
                        matchingBox = box;
                        break;
                    }
                }

                if (matchingBox) {
                    const overItem = this.schemeContainer.findItemById(matchingBox.itemId);
                    if (!overItem) {
                        return;
                    }

                    const xDiff = x - matchingBox.left - overItem.meta.ancestorIds.length * 25 - 15;
                    const k = (y - matchingBox.top) / matchingBox.height;
                    this.dragging.destinationId = matchingBox.itemId;
                    this.dragging.dropInside = xDiff > 15;
                    this.dragging.dropAbove = !this.dragging.dropInside && k < 0.5;
                    this.dragging.readyToDrop = true;
                }
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

        collectedDragBox(items) {
            const $main = this.$refs.itemSelectorContainer;

            const boxes = [];
            let minX = 0, minY = 0, firstTry = true;
            let maxX = 0, maxY = 0;

            items.forEach(item => {
                const el = $main.querySelector(`div.item-row[data-item-id="${item.id}"] > div.item`);
                if (!el) {
                    return;
                }
                const rect = el.getBoundingClientRect();
                if (firstTry) {
                    minX = rect.left;
                    minY = rect.top;
                    maxX = rect.right;
                    maxY = rect.bottom;
                    firstTry = false;
                } else {
                    if (minX > rect.left) {
                        minX = rect.left;
                    }
                    if (minY > rect.top) {
                        minY = rect.top;
                    }
                    if (maxX < rect.right) {
                        maxX = rect.right;
                    }
                    if (maxY < rect.bottom) {
                        maxY = rect.bottom;
                    }
                }
                boxes.push({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    iconUrl: item.meta.iconUrl,
                    name: item.name,
                });
            });

            return {
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY,
                itemBoxes: boxes.map(b => {
                    return {
                        left: b.left - minX,
                        top: b.top - minY,
                        width: b.width,
                        height: b.height,
                        iconUrl: b.iconUrl,
                        name: b.name,
                    };
                })
            };
        },

        rebuildItemRowBoxes() {
            const boxesById = new Map();
            const boxes = [];
            if (!Array.isArray(this.$refs.itemRows)) {
                // no need to build boxes as there is only a single item, and there is no place to re-attach it
                return [];
            }

            const containerRect = this.$refs.itemSelectorContainer.getBoundingClientRect();

            this.$refs.itemRows.forEach(itemRowEl => {
                const itemId = itemRowEl.getAttribute('data-item-id');
                const rect = itemRowEl.getBoundingClientRect();
                const box = {
                    itemId,
                    left: rect.left - containerRect.left,
                    top: rect.top - containerRect.top,
                    width: rect.width,
                    height: rect.height
                };
                boxes.push(box);
                boxesById.set(itemId, box);
            });
            this.itemRowBoxes = boxes;
            this.itemRowBoxesById = boxesById;
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