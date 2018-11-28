import State from './State.js';
import EventBus from '../EventBus.js';

export default class StateDragItem extends State {
    constructor(editor) {
        super(editor);
        this.schemeContainer = editor.schemeContainer;
        this.originalPoint = {x: 0, y: 0};
        this.startedDragging = true;
        this.selectedItem = null;
        this.itemOriginalPoint = {x: 0, y: 0};
    }

    reset() {
        this.startedDragging = false;
        this.selectedItem = null;
    }

    mouseDown(x, y, mx, my, item, event) {
        if (item) {
            this.selectedItem = item;
            this.startedDragging = true;
            this.originalPoint.x = x;
            this.originalPoint.y = y;
            this.itemOriginalPoint.x = item.area.x;
            this.itemOriginalPoint.y = item.area.y;

            if (!item.selected) {
                this.schemeContainer.selectItem(item, false);
                EventBus.$emit(EventBus.ITEM_SELECTED, item);
            }
        }
    }

    mouseMove(x, y, mx, my, item, event) {
        if (this.startedDragging && this.selectedItem) {
            this.dragItem(x, y);
        }
    }

    mouseUp(x, y, mx, my, item, event) {
        this.startedDragging = false;
    }

    dragItem(x, y) {
        var dx = x - this.originalPoint.x;
        var dy = y - this.originalPoint.y;
        this.selectedItem.area.x = this.itemOriginalPoint.x + dx;
        this.selectedItem.area.y = this.itemOriginalPoint.y + dy;
        EventBus.$emit(EventBus.REDRAW);
    }
}
