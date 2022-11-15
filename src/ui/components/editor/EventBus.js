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
            KEY_PRESS: 'key-press',
            KEY_UP: 'key-up',
            BRING_TO_VIEW: 'bring-to-view',

            // used when in place rich text editor is created and mounted, this comes after ITEM_TEXT_SLOT_EDIT_TRIGGERED event
            ITEM_IN_PLACE_TEXT_EDITOR_CREATED: 'item-in-place-text-editor-created',


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

        /**
         * emits an event when a single item is supposed to be highlighted
         * @param {Array} itemIds array of ids of items that should be highlighted. In case it is set as null or empty - then no items should be highlighted at all.
         */
        emitItemsHighlighted(itemIds, options) {
            const highlightPins = options ? options.highlightPins: false;
            this.$emit(EventBus.ITEMS_HIGHLIGHTED, itemIds, {highlightPins});
        },

        emitRightClickedItem(item, mouseX, mouseY) {
            this.$emit(EventBus.RIGHT_CLICKED_ITEM, item, mouseX, mouseY);
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
