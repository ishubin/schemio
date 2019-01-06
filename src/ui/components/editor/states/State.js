import EventBus from '../EventBus.js';

class State {
    constructor(editor) {
        this.editor = editor;
        this.name = '';
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {
        this.reset();
        EventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
    }

    mouseWheel(localX, localY, originalX, originalY, event) {}
    mouseDown(localX, localY, originalX, originalY, item, connector, rerouteId, event) {}
    mouseUp(localX, localY, originalX, originalY, item, connector, rerouteId, event) {}
    mouseMove(localX, localY, originalX, originalY, item, connector, rerouteId, event) {}

    shouldHandleItemHover() {return true;}
    shouldHandleItemMouseDown() {return true;}
    shouldHandleItemMouseUp() {return true;}

    itemHovered(item) {}
    itemLostFocus(item) {}
}

export default State;
