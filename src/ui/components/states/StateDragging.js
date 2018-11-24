import State from './State.js';

/*
This state works as dragging the screen, zooming, selecting elements and dragging selected elements
*/
const NOTHING = 0;
const DRAG_SCREEN = 1;
const DRAG_ITEM = 2;
class StateDragging extends State {
    constructor() {
        super();
        this.editor = null;
        this.schemeContainer = null;
        this.state = NOTHING;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;

        this.lastHoveredItem = null;
    }
    init(editor) {
        this.editor = editor;
        this.schemeContainer = editor.schemeContainer;
    }

    mouseDown(x, y, event){
        console.log('Dragging: mouseDown', x, y, this.state);
        var p = this.editor.toLocalPoint(x, y);
        var hoveredItem = null; //this.schemeContainer.findHoveredItem(p.x, p.y);
        if (hoveredItem) {
            this.state = DRAG_ITEM;
            this.schemeContainer.selectItem(hoveredItem, false);
            this.editor.$forceUpdate();
        } else {
            this.initScreenDrag(x, y);
        }
    }

    initScreenDrag(x, y) {
        this.state = DRAG_SCREEN;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.editor.vOffsetX, y: this.editor.vOffsetY};
        this.originalZoom = this.editor.vZoom;
    }

    mouseUp(x, y, event) {
        if (this.state === DRAG_SCREEN) {
            this.state = NOTHING;
            this.dragScreen(x, y);
            this.initialClickPoint = null;
        }
    }

    mouseMove(x, y, event) {
        if (this.state === DRAG_SCREEN && this.initialClickPoint) {
            this.dragScreen(x, y);
        } else if (this.state === NOTHING) {
            this.handleItemHover(x, y);
        }
    }

    unhoverLastHoveredItem() {
        this.lastHoveredItem.hovered = false;
        this.lastHoveredItem = null;
        this.editor.$forceUpdate();
    }

    handleItemHover(x, y) {
        var p = this.editor.toLocalPoint(x, y);
        var hoveredItem = this.schemeContainer.findHoveredItem(p.x, p.y);
        if (hoveredItem) {
            if (this.lastHoveredItem !== hoveredItem) {
                if (this.lastHoveredItem) {
                    this.unhoverLastHoveredItem();
                }
                this.lastHoveredItem = hoveredItem;
                this.lastHoveredItem.hovered = true;
                this.editor.$forceUpdate();
            }
        } else {
            if (this.lastHoveredItem) {
                this.unhoverLastHoveredItem();
            }
        }
    }

    dragScreen(x, y) {
        this.editor.vOffsetX = Math.floor(this.originalOffset.x + x - this.initialClickPoint.x);
        this.editor.vOffsetY = Math.floor(this.originalOffset.y + y - this.initialClickPoint.y);
        this.editor.$forceUpdate();
    }
}

export default StateDragging;
