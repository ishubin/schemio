import Vue from 'vue';
const EventBus = new Vue({
    data() {
        return {
            START_CREATING_COMPONENT: 'start-creating-component',
            PLACE_ITEM: 'place-item',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            REDRAW: 'redraw',
            ITEM_SELECTED: 'item-selected',
            ALL_ITEMS_DESELECTED: 'all-items-deselected',
            KEY_PRESS: 'key-press',
            KEY: {
                ESCAPE: 'escape',
                DELETE: 'delete'
            }
        };
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
