import State from './State.js';

/*
This state works as dragging the screen, zooming, selecting elements and dragging selected elements
*/
const NOTHING = 0;
const DRAG_SCREEN = 1;
class StateDragging extends State {
    constructor() {
        super();
        this.editor = null;
        this.state = NOTHING;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;
    }
    init(editor) {
        this.editor = editor;
    }

    mouseDown(x, y, event){
        this.state = DRAG_SCREEN;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.editor.vOffsetX, y: this.editor.vOffsetY};
        this.originalZoom = this.editor.vZoom;
    }

    mouseUp(x, y, event) {
        if (this.state === DRAG_SCREEN) {
            this.dragScreen(x, y);
            this.initialClickPoint = null;
        }
    }

    mouseMove(x, y, event) {
        if (this.state === DRAG_SCREEN && this.initialClickPoint) {
            this.dragScreen(x, y);
        } else if (this.state === NOTHING) {

        }
    }

    dragScreen(x, y) {
        this.editor.vOffsetX = Math.floor(this.originalOffset.x + x - this.initialClickPoint.x);
        this.editor.vOffsetY = Math.floor(this.originalOffset.y + y - this.initialClickPoint.y);
        this.editor.$forceUpdate();
    }
}

export default StateDragging;
