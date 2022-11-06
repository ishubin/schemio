/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import {Logger} from '../../logger';
import '../../typedef';
import {identifyKeyPress} from '../../events';

const log = new Logger('EventBus');

/*
This whole event bus is pretty much an anti-pattern and a very bad idea that I wished I have never picked up on.
It only works in case there is a single scheme editor component. In situations when there are multiple editors open at the same time,
this just does not work well and we have to come up with tricks like activating/deactivating scheme editors.
 */
const EventBus = new Vue({
    data() {
        return {
            START_CONNECTING_ITEM: 'start-connecting-item',
            START_CURVE_EDITING: 'start-curve-editing',
            START_DRAWING: 'start-drawing',
            STOP_DRAWING: 'stop-drawing',

            COMPONENT_LOAD_REQUESTED: 'component-load-requested',
            COMPONENT_LOAD_FAILED: 'component-load-failed',
            COMPONENT_SCHEME_MOUNTED: 'component-scheme-mounted',

            PLACE_ITEM: 'place-item',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            KEY_PRESS: 'key-press',
            KEY_UP: 'key-up',
            BRING_TO_VIEW: 'bring-to-view',

            SCHEME_CHANGE_COMMITED: 'scheme-changed-commited',

            ANY_ITEM_CLICKED: 'any-item-clicked',
            ITEM_CHANGED: 'item-changed',
            ITEM_SELECTED: 'item-selected',
            ITEM_DESELECTED: 'item-deselected',
            ANY_ITEM_CHANGED: 'any-item-changed',
            ANY_ITEM_SELECTED: 'any-item-selected',
            ANY_ITEM_DESELECTED: 'any-item-deselected',
            ITEM_HIGHLIGHT_SET: 'item-highlight-set',

            // used to trigger in-svg text edit of an item
            ITEM_TEXT_SLOT_EDIT_TRIGGERED: 'item-text-slot-edit-triggered',
            ITEM_TEXT_SLOT_EDIT_CANCELED: 'item-text-slot-edit-canceled',

            // emited when user moves one text slot into another
            ITEM_TEXT_SLOT_MOVED: 'item-text-slot-moved',

            // used when in place rich text editor is created and mounted, this comes after ITEM_TEXT_SLOT_EDIT_TRIGGERED event
            ITEM_IN_PLACE_TEXT_EDITOR_CREATED: 'item-in-place-text-editor-created',


            // triggered when user clicks empty space
            VOID_CLICKED: 'void-clicked',

            // triggered when user clicks empty space with right button
            VOID_RIGHT_CLICKED: 'void-clicked',

            // triggered when user double clicks empty space
            VOID_DOUBLE_CLICKED: 'void-double-clicked',

            // used to trigger display of item description as a tooltip (when in interactive mode)
            ITEM_TOOLTIP_TRIGGERED: 'item-tooltip-triggered',

            // used to trigger side panel for specified item in interaction (view) mode
            ITEM_SIDE_PANEL_TRIGGERED: 'item-side-panel-triggered',

            // used in view mode in case item has links
            ITEM_LINKS_SHOW_REQUESTED: 'item-links-show-requested',

            RIGHT_CLICKED_ITEM: 'right-clicked-item',

            // used inside ElementPicker and force editor state to switch to StatePickElement
            ELEMENT_PICK_REQUESTED: 'element-pick-requested',
            ELEMENT_PICK_CANCELED: 'element-pick-canceled',

            CURVE_EDITED: 'curve-edited',
            CURVE_EDIT_STOPPED: 'curve-edit-stopped',
            CURVE_EDIT_POINTS_UPDATED: 'curve-edit-points-updated',


            CUSTOM_CONTEXT_MENU_REQUESTED: 'custom-context-menu-requested',

            SCREEN_TRANSFORM_UPDATED: 'screen-transform-updated',

            ITEMS_HIGHLIGHTED: 'items-highlighted',

            ITEM_SURROUND_CREATED: 'item-surround-created',

            BEHAVIOR_PANEL_REQUESTED: 'behavior-panel-requested',

            MULTI_ITEM_EDIT_BOX_ITEMS_UPDATED: 'multi-item-edit-box-items-updated',
            MULTI_ITEM_EDIT_BOX_AREA_UPDATED: 'multi-item-edit-box-area-updated',

            ITEM_CREATION_DRAGGED_TO_SVG_EDITOR: 'item-creation-dragged-to-svg-editor',

            // triggered in case user clicked undo or redo and the scheme was reset to a new state
            HISTORY_UNDONE: 'history-undone',

            IMAGE_CROP_TRIGGERED: 'image-crop-triggered',

            FLOATING_HELPER_PANEL_UPDATED: 'floating-helper-panel-updated',

            // used for each frame_player item to initialize it's callbacks for its own frame animation
            FRAME_PLAYER_PREPARED: 'frame-player-prepared',

            CLICKABLE_MARKERS_TOGGLED: 'clickable-markers-toggled',

            EXTRA_SHAPE_GROUP_REGISTERED: 'extra-shape-group-registered',

            ART_PACK_ADDED: 'art-pack-added'
        };
    },
    methods: {
        emitSchemeChangeCommited(affinityId) {
            this.$emit(EventBus.SCHEME_CHANGE_COMMITED, affinityId);
        },

        /**
         * emits an event when a single item is supposed to be highlighted
         * @param {Array} itemIds array of ids of items that should be highlighted. In case it is set as null or empty - then no items should be highlighted at all.
         */
        emitItemsHighlighted(itemIds, options) {
            const highlightPins = options ? options.highlightPins: false;
            this.$emit(EventBus.ITEMS_HIGHLIGHTED, itemIds, {highlightPins});
        },

        /**
         * @param {string} itemId  id of an item
         * @param {string} propertyPath  path to a field that was changed. This argument is optional
         */
        emitItemChanged(itemId, propertyPath) {
            this.$emit(this._itemChangedEvent(itemId), propertyPath);
            this.$emit(EventBus.ANY_ITEM_CHANGED, itemId, propertyPath);
        },
        subscribeForItemChanged(itemId, callback) { this.$on(this._itemChangedEvent(itemId), callback); },
        unsubscribeForItemChanged(itemId, callback) { this.$off(this._itemChangedEvent(itemId), callback); },
        _itemChangedEvent(itemId) { return `${EventBus.ITEM_CHANGED}/${itemId}`; },

        emitItemSelected(itemId) {
            this.$emit(this._itemSelectedEvent(itemId));
            this.$emit(EventBus.ANY_ITEM_SELECTED, itemId);
        },
        subscribeForItemSelected(itemId, callback) {this.$on(this._itemSelectedEvent(itemId), callback)},
        unsubscribeForItemSelected(itemId, callback) {this.$off(this._itemSelectedEvent(itemId), callback)},
        _itemSelectedEvent(itemId) { return `${EventBus.ITEM_SELECTED}/${itemId}`; },


        emitItemDeselected(itemId) {
            this.$emit(this._itemDeselectedEvent(itemId));
            this.$emit(EventBus.ANY_ITEM_DESELECTED, itemId);
        },
        subscribeForItemDeselected(itemId, callback) {this.$on(this._itemDeselectedEvent(itemId), callback)},
        unsubscribeForItemDeselected(itemId, callback) {this.$off(this._itemDeselectedEvent(itemId), callback)},
        _itemDeselectedEvent(itemId) { return `${EventBus.ITEM_DESELECTED}/${itemId}`; },

        emitAnyItemDeselected() {
            this.$emit(EventBus.ANY_ITEM_DESELECTED);
        },

        emitRightClickedItem(item, mouseX, mouseY) {
            this.$emit(EventBus.RIGHT_CLICKED_ITEM, item, mouseX, mouseY);
        },

        /**
         *
         * @param {Item} item
         * @param {string} slotName
         * @param {Area} area - Area of a text slot and not of an item
         * @param {Boolean} markupDisabled - true if HTML markup is disabled. This means that a simple textarea is going to be used for text editing
         * @param {Boolean} creatingNewItem - true if it is triggered for a new item (e.g. double clicking void)
         */
        emitItemTextSlotEditTriggered(item, slotName, area, markupDisabled, creatingNewItem) {
            this.$emit(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, item, slotName, area, markupDisabled, creatingNewItem);
        },

        emitItemTextSlotEditCanceled(item, slotName) {
            this.$emit(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, item, slotName);
        },

        emitItemTextSlotMoved(item, slotName, destinationSlotName) {
            this.$emit(EventBus.ITEM_TEXT_SLOT_MOVED, item, slotName, destinationSlotName);
        },

        emitItemInPlaceTextEditorCreated(editor) {
            this.$emit(this.ITEM_IN_PLACE_TEXT_EDITOR_CREATED, editor);
        },

        emitElementPickRequested(elementPickCallback) {
            this.$emit(EventBus.ELEMENT_PICK_REQUESTED, elementPickCallback);
        },

        emitElementPickCanceled() {
            this.$emit(EventBus.ELEMENT_PICK_CANCELED);
        },

        emitCurveEdited(item) {
            this.$emit(EventBus.CURVE_EDITED, item);
        },

        emitCustomContextMenuRequested(mouseX, mouseY, menuOptions) {
            this.$emit(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, mouseX, mouseY, menuOptions);
        },

        emitItemSurroundCreated(item, boundingBox, padding) {
            this.$emit(EventBus.ITEM_SURROUND_CREATED, item, boundingBox, padding);
        },

        emitBringToViewAnimated(area) {
            this.$emit(EventBus.BRING_TO_VIEW, area, true);
        },

        emitBringToViewInstantly(area) {
            this.$emit(EventBus.BRING_TO_VIEW, area, false);
        },

        emitItemCreationDraggedToSvgEditor(item, pageX, pageY) {
            this.$emit(EventBus.ITEM_CREATION_DRAGGED_TO_SVG_EDITOR, item, pageX, pageY);
        },

        emitComponentLoadRequested(item) {
            this.$emit(EventBus.COMPONENT_LOAD_REQUESTED, item);
        },

        emitComponentLoadFailed(item) {
            this.$emit(EventBus.COMPONENT_LOAD_FAILED, item);
        },

        emitComponentSchemeMounted(item) {
            this.$emit(EventBus.COMPONENT_SCHEME_MOUNTED, item);
        },

        emitFloatingHelperPanelUpdated() {
            this.$emit(EventBus.FLOATING_HELPER_PANEL_UPDATED);
        },

        emitFramePlayerPrepared(framePlayerItem, frameCallbacks) {
            this.$emit(EventBus.FRAME_PLAYER_PREPARED, framePlayerItem, frameCallbacks);
        },
    }
});

// Adding logging of all events in EventBus
const _old$emit = EventBus.$emit;

EventBus.$emit = (...args) => {
    log.infoEvent(args[0], args);
    if (_old$emit) {
        _old$emit.apply(EventBus, args);
    }
};


document.addEventListener('keyup', (event) => {
    event = event || window.event;
    if (event.target === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_UP, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
});
document.addEventListener('keydown', (event) => {
    event = event || window.event;
    if (event.target === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_PRESS, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
});

export default EventBus;
