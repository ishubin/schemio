class State {
    constructor() {
        this.editor = null;
    }
    init(editor) {
        this.editor = editor;
    }

    mouseDown(x, y, event) {}
    mouseUp(x, y, event) {}
    mouseMove(x, y, event) {}
    itemHovered(item) {}
    itemLostFocus(item) {}

    // return true if you don't want to interrupt the regular mouseDown event
    itemMouseDown(item, x, y, event) {return true;}

    // return true if you don't want to interrupt the regular mouseUp event
    itemMouseUp(item, x, y, event) {return true;}
}

export default State;
