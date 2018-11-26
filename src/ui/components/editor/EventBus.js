import Vue from 'vue';
const EventBus = new Vue({
    data() {
        return {
            START_CREATING_COMPONENT: 'start-creating-component',
            CANCEL_CURRENT_STATE: 'cancel-current-state',
            REDRAW: 'redraw',
        };
    }
});


document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key == "Escape" || evt.key == "Esc");
    } else {
        isEscape = (evt.keyCode == 27);
    }
    if (isEscape) {
        EventBus.$emit('keyPressEscape');
    }
}
export default EventBus;
