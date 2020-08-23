/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import {findKey} from 'lodash';

const EventBus = new Vue({
    data() {
        return {
            START_CREATING_COMPONENT: 'start-creating-component',
            START_CONNECTING_ITEM: 'start-connecting-item',
            PLACE_ITEM: 'place-item',
            EDITOR_STATE_CHANGED: 'editor-state-changed',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            KEY_PRESS: 'key-press',
            KEY_UP: 'key-up',
            BRING_TO_VIEW: 'bring-to-view',
            SWITCH_MODE_TO_EDIT: 'switch-mode-edit', //TODO rename it to MODE_CHANGED and pass the value of the mode

            MULTI_SELECT_BOX_APPEARED: 'multi-select-box-appeared',
            MULTI_SELECT_BOX_DISAPPEARED: 'multi-select-box-diappeared',

            SCHEME_CHANGED: 'scheme-changed', // should be emitted in case of any changes (e.g. item, scheme properties)

            SCHEME_CHANGE_COMITTED: 'scheme-changed-commited',

            // triggered from CreateItemMenu component, when user clicks on any style from the list
            SHAPE_STYLE_APPLIED: 'shape-style-applied',

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


            // triggered when user is in interactive mode and clicks empty space
            VOID_CLICKED: 'void-clicked',

            // used to trigger display of item description as a tooltip (when in interactive mode)
            ITEM_TOOLTIP_TRIGGERED: 'item-tooltip-triggered',

            // used to trigger side panel for specified item in interaction (view) mode
            ITEM_SIDE_PANEL_TRIGGERED: 'item-side-panel-triggered',

            // used in view mode in case item has links
            ITEM_LINKS_SHOW_REQUESTED: 'item-links-show-requested',

            RIGHT_CLICKED_ITEM: 'right-clicked-item',

            // used inside ElementPicker and force editor state to switch to StatePickElement
            ELEMENT_PICK_REQUESTED: 'element-pick-requested',

            ELEMENT_PICKED: 'element-picked',

            KEY: {
                ESCAPE: 'escape',
                DELETE: 'delete',
                CTRL_C: 'ctrl-c',
                CTRL_V: 'ctrl-v',
                CTRL_S: 'ctrl-s',
                CTRL_Z: 'ctrl-z',
                CTRL_SHIFT_Z: 'ctrl-shift-z',
                UP: 'up',
                DOWN: 'down',
                LEFT: 'left',
                RIGHT: 'right',
                SPACE: 'space'
            },

            CURVE_EDITED: 'curve-edited',
            CURVE_EDIT_STOPPED: 'curve-edit-stopped',

            CUSTOM_CONTEXT_MENU_REQUESTED: 'custom-context-menu-requested',

            SCREEN_TRANSFORM_UPDATED: 'screen-transform-updated',

            ITEMS_HIGHLIGHTED: 'items-highlighted'
        };
    },
    methods: {
        emitSchemeChangeCommited(affinityId) {
            this.$emit(EventBus.SCHEME_CHANGE_COMITTED, affinityId);
        },

        /**
         * emits an event when a single item is supposed to be highlighted
         * @param {Array} itemIds array of ids of items that should be highlighted. In case it is set as null or empty - then no items should be highlighted at all.
         */
        emitItemsHighlighted(itemIds) {
            this.$emit(EventBus.ITEMS_HIGHLIGHTED, itemIds);
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

        emitRightClickedItem(item, mouseX, mouseY) {
            this.$emit(EventBus.RIGHT_CLICKED_ITEM, item, mouseX, mouseY);
        },

        emitItemTextSlotEditTriggered(item, slotName, x, y) {
            this.$emit(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, item, slotName, x, y);
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

        emitCurveEdited(item) {
            this.$emit(EventBus.CURVE_EDITED, item);
        },

        emitCustomContextMenuRequested(mouseX, mouseY, menuOptions) {
            this.$emit(EventBus.CUSTOM_CONTEXT_MENU_REQUESTED, mouseX, mouseY, menuOptions);
        }
    }
});

const keyMap = {};
keyMap[EventBus.KEY.ESCAPE] = event => event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27;
keyMap[EventBus.KEY.DELETE] = event => event.key === 'Backspace' || event.key === 'Delete' || event.keyCode === 8 || event.keyCode === 127;
keyMap[EventBus.KEY.CTRL_C] = event => event.key === 'c' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.CTRL_V] = event => event.key === 'v' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.CTRL_S] = event => event.key === 's' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.CTRL_Z] = event => event.key === 'z' && (event.metaKey || event.ctrlKey) && (!event.shiftKey);
keyMap[EventBus.KEY.CTRL_SHIFT_Z] = event => event.key === 'z' && (event.metaKey || event.ctrlKey) && event.shiftKey;
keyMap[EventBus.KEY.LEFT] = event => event.key === 'ArrowLeft';
keyMap[EventBus.KEY.RIGHT] = event => event.key === 'ArrowRight';
keyMap[EventBus.KEY.UP] = event => event.key === 'ArrowUp';
keyMap[EventBus.KEY.DOWN] = event => event.key === 'ArrowDown';
keyMap[EventBus.KEY.SPACE] = event => event.key === ' ' || event.keyCode === 32;

function identifyKeyPress(event) {
    return findKey(keyMap, (check, keyName) => check(event));
}

document.onkeyup = function(event) {
    event = event || window.event;
    if (event.srcElement === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_UP, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
};


document.onkeydown = function(event) {
    event = event || window.event;
    if (event.srcElement === document.body) {
        const key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_PRESS, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
};
export default EventBus;
