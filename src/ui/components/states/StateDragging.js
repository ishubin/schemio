import State from './State.js';

class StateDragging extends State {
    constructor() {
        super();
        this.editor = null;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;
    }
    init(editor) {
        this.editor = editor;
    }

    mouseDown(x, y, event){
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.editor._offsetX, y: this.editor._offsetY};
        this.originalZoom = this.editor._zoom;
    }

    mouseUp(x, y, event) {
        this.drag(x, y);
        this.initialClickPoint = null;
    }

    mouseMove(x, y, event) {
        if (this.initialClickPoint) {
            this.drag(x, y);
        }
    }

    drag(x, y) {
        this.editor._offsetX = Math.floor(this.originalOffset.x + x - this.initialClickPoint.x);
        this.editor._offsetY = Math.floor(this.originalOffset.y + y - this.initialClickPoint.y);
        this.editor.$forceUpdate();
    }
}

export default StateDragging;
