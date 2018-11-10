class State {
    constructor() {
        this.editor = null;
    }
    init(editor) {
        this.editor = editor;
    }

    mouseDown(x, y, event){}
    mouseUp(x, y, event) {}
    mouseMove(x, y, event) {}
}

export default State;
