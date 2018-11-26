class State {
    constructor(editor) {
        this.editor = editor;
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {}

    mouseDown(localX, localY, originalX, originalY, event) {}
    mouseUp(localX, localY, originalX, originalY, event) {}
    mouseMove(localX, localY, originalX, originalY, event) {}

    shouldHandleItemHover() {return true;}
    shouldHandleItemMouseDown() {return true;}
    shouldHandleItemMouseUp() {return true;}

    itemHovered(item) {}
    itemLostFocus(item) {}

    // return true if you don't want to interrupt the regular mouseDown event
    itemMouseDown(item, x, y, event) {return true;}

    // return true if you don't want to interrupt the regular mouseUp event
    itemMouseUp(item, x, y, event) {return true;}
}

export default State;
