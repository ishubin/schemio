/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import _ from 'lodash';

const EventBus = new Vue({
    data() {
        return {
            START_CREATING_COMPONENT: 'start-creating-component',
            START_CONNECTING_ITEM: 'start-connecting-item',
            PLACE_ITEM: 'place-item',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            REDRAW: 'redraw', //TODO get rid of this event. instead listen to item-changed, connector-changed event and redraw properly
            REDRAW_CONNECTOR: 'redraw-connector',  //TODO get rid of this event.
            CONNECTOR_SELECTED: 'connector-selected',
            ALL_CONNECTORS_DESELECTED: 'all-connectors-deselected',
            KEY_PRESS: 'key-press',
            BRING_TO_VIEW: 'bring-to-view',
            SWITCH_MODE_TO_EDIT: 'switch-mode-edit', //TODO rename it to MODE_CHANGED and pass the value of the mode

            MULTI_SELECT_BOX_APPEARED: 'multi-select-box-appeared',
            MULTI_SELECT_BOX_DISAPPEARED: 'multi-select-box-diappeared',

            CONNECTOR_CHANGED: 'connector-changed',
            SCHEME_CHANGED: 'scheme-changed', // should be emitted in case of any changes (e.g. item, connector, scheme properties)


            ITEM_CHANGED: 'item-changed',
            ITEM_SELECTED: 'item-selected',
            ITEM_DESELECTED: 'item-deselected',
            ANY_ITEM_CHANGED: 'any-item-changed',
            ANY_ITEM_SELECTED: 'any-item-selected',
            ANY_ITEM_DESELECTED: 'any-item-deselected',

            KEY: {
                ESCAPE: 'escape',
                DELETE: 'delete',
                CTRL_C: 'ctrl-c',
                CTRL_V: 'ctrl-v',
                CTRL_S: 'ctrl-s',
                UP: 'up',
                DOWN: 'down',
                LEFT: 'left',
                RIGHT: 'right'
            }
        };
    },
    methods: {
        emitRedrawConnector(connectorId) {
            this.$emit(this._generateRedrawConnectorEventName(connectorId));
        },
        subscribeForRedrawConnector(connectorId, callback) {
            this.$on(this._generateRedrawConnectorEventName(connectorId), callback);
        },
        unsubscribeForRedrawConnector(connectorId, callback) {
            this.$off(this._generateRedrawConnectorEventName(connectorId), callback);
        },
        _generateRedrawConnectorEventName(connectorId) {
            return `${EventBus.REDRAW_CONNECTOR}/${connectorId}`;
        },

        emitItemChanged(itemId) {
            this.$emit(this._itemChangedEvent(itemId));
            this.$emit(EventBus.ANY_ITEM_CHANGED, itemId);
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
    }
});

const keyMap = {};
keyMap[EventBus.KEY.ESCAPE] = event => event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27;
keyMap[EventBus.KEY.DELETE] = event => event.key === 'Backspace' || event.key === 'Delete' || event.keyCode === 8 || event.keyCode === 127;
keyMap[EventBus.KEY.CTRL_C] = event => event.key === 'c' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.CTRL_V] = event => event.key === 'v' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.CTRL_S] = event => event.key === 's' && (event.metaKey || event.ctrlKey);
keyMap[EventBus.KEY.LEFT] = event => event.key === 'ArrowLeft';
keyMap[EventBus.KEY.RIGHT] = event => event.key === 'ArrowRight';
keyMap[EventBus.KEY.UP] = event => event.key === 'ArrowUp';
keyMap[EventBus.KEY.DOWN] = event => event.key === 'ArrowDown';

function identifyKeyPress(event) {
    return _.findKey(keyMap, (check, keyName) => check(event));
}

document.onkeydown = function(event) {
    event = event || window.event;
    if (event.srcElement === document.body) {
        var key = identifyKeyPress(event);
        if (key) {
            event.preventDefault();
            EventBus.$emit(EventBus.KEY_PRESS, key, {
                ctrlCmdPressed: event.metaKey || event.ctrlKey
            });
        }
    }
}
export default EventBus;
