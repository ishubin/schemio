import Vue from 'vue';
const EventBus = new Vue({
    data() {
        return {
            START_CREATING_COMPONENT: 'start-creating-component',
            START_CONNECTING_ITEM: 'start-connecting-item',
            PLACE_ITEM: 'place-item',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            REDRAW: 'redraw',
            REDRAW_ITEM: 'redraw-item',
            REDRAW_CONNECTOR: 'redraw-connector',
            ITEM_SELECTED: 'item-selected',
            ALL_ITEMS_DESELECTED: 'all-items-deselected',
            CONNECTOR_SELECTED: 'connector-selected',
            ALL_CONNECTORS_DESELECTED: 'all-connectors-deselected',
            KEY_PRESS: 'key-press',
            BRING_TO_VIEW: 'bring-to-view',
            SWITCH_MODE_TO_EDIT: 'switch-mode-edit',
            MULTI_SELECT_BOX_APPEARED: 'multi-select-box-appeared',
            MULTI_SELECT_BOX_DISAPPEARED: 'multi-select-box-diappeared',
            KEY: {
                ESCAPE: 'escape',
                DELETE: 'delete'
            }
        };
    },
    methods: {
        emitRedrawConnector(sourceItemId, destinationId) {
            this.$emit(this._generateRedrawConnectorEventName(sourceItemId, destinationId));
        },
        subscribeForRedrawConnector(sourceItemId, destinationId, callback) {
            this.$on(this._generateRedrawConnectorEventName(sourceItemId, destinationId), callback);
        },
        unsubscribeForRedrawConnector(sourceItemId, destinationId, callback) {
            this.$off(this._generateRedrawConnectorEventName(sourceItemId, destinationId), callback);
        },
        _generateRedrawConnectorEventName(sourceItemId, destinationId) {
            return `${EventBus.REDRAW_CONNECTOR}/${sourceItemId}/${destinationId}`;
        }
    }
});

function identifyKeyPress(event) {
    if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) {
        return EventBus.KEY.ESCAPE;
    } else if (event.key === 'Backspace' || event.key === 'Delete' || event.keyCode === 8 || event.keyCode === 127) {
        return EventBus.KEY.DELETE;
    }
    return null;
}

document.onkeydown = function(event) {
    event = event || window.event;
    if (event.srcElement === document.body) {
        var key = identifyKeyPress(event);
        if (key) {
            EventBus.$emit(EventBus.KEY_PRESS, key);
        }
    }
}
export default EventBus;
