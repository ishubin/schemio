import State from './State.js';
import EventBus from '../EventBus.js';

export default class StateDragItem extends State {
    constructor(editor) {
        super(editor);
        this.schemeContainer = editor.schemeContainer;
        this.originalPoint = {x: 0, y: 0};
        this.startedDragging = true;
        this.selectedItem = null;
        this.itemOriginalArea = {x: 0, y: 0, w: 0, h: 0};
    }

    reset() {
        this.startedDragging = false;
        this.selectedItem = null;
        this.dragger = null;
    }

    initDraggingForItem(item, x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.itemOriginalArea.x = item.area.x;
        this.itemOriginalArea.y = item.area.y;
        this.itemOriginalArea.w = item.area.w;
        this.itemOriginalArea.h = item.area.h;
        this.startedDragging = true;
    }

    mouseDown(x, y, mx, my, item, event) {
        var selectedItems = this.schemeContainer.getSelectedItems();
        if (selectedItems && selectedItems.length > 0) {
            var dragger = this.findDraggerAtPoint(selectedItems, x, y, mx, my);
            if (dragger) {
                this.dragger = dragger;
                this.initDraggingForItem(dragger.item, x, y);
                return;
            }
        }
        // proceed initiating item drag if dragger wasn't found
        if (item) {
            this.selectedItem = item;
            this.initDraggingForItem(item, x, y);

            if (!item.selected) {
                this.schemeContainer.selectItem(item, false);
                EventBus.$emit(EventBus.ITEM_SELECTED, item);
            }
        }
    }

    mouseMove(x, y, mx, my, item, event) {
        if (this.startedDragging && this.dragger) {
            this.dragByDragger(x, y);
        } else if (this.startedDragging && this.selectedItem) {
            this.dragItem(x, y);
        }
    }

    mouseUp(x, y, mx, my, item, event) {

        this.reset();
    }

    dragItem(x, y) {
        var dx = x - this.originalPoint.x;
        var dy = y - this.originalPoint.y;
        this.selectedItem.area.x = this.itemOriginalArea.x + dx;
        this.selectedItem.area.y = this.itemOriginalArea.y + dy;
        EventBus.$emit(EventBus.REDRAW);
    }

    dragByDragger(x, y) {
        _.forEach(this.dragger.dragger.edges, edge => {
            if (edge === 'top') {
                var dy = y - this.dragger.dragger.y;
                this.dragger.item.area.y = this.itemOriginalArea.y + dy;
                this.dragger.item.area.h = this.itemOriginalArea.h - dy;
            } else if (edge === 'bottom') {
                var dy = y - this.dragger.dragger.y;
                this.dragger.item.area.h = this.itemOriginalArea.h + dy;
            } else if (edge === 'left') {
                var dx = x - this.dragger.dragger.x;
                this.dragger.item.area.x = this.itemOriginalArea.x + dx;
                this.dragger.item.area.w = this.itemOriginalArea.w - dx;
            } else if (edge === 'right') {
                var dx = x - this.dragger.dragger.x;
                this.dragger.item.area.w = this.itemOriginalArea.w + dx;
            }
        });
    }

    findDraggerAtPoint(items, x, y, mx, my) {
        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            var draggers = this.schemeContainer.provideBoundingBoxDraggers(item);

            for (var j = 0; j < draggers.length; j++) {
                var dragger = draggers[j];
                var draggerMX = this.editor._x(dragger.x);
                var draggerMY = this.editor._y(dragger.y);

                if (Math.abs(mx - draggerMX) <= dragger.s
                    && Math.abs(my - draggerMY) <= dragger.s) {
                    return {
                        item, dragger
                    };
                }
            }
        }
        return null;
    }
}
