import State from './State.js';
import EventBus from '../EventBus.js';

export default class StateCreateComponent extends State {
    constructor(editor) {
        super(editor);
        this.name = 'create-component';
        this.component = null;
        this.addedToScheme = false;
        this.originalPoint = null;
        this.schemeContainer = editor.schemeContainer;
    }

    reset() {
        this.component = null;
        this.addedToScheme = false;
    }

    shouldHandleItemHover() {
        return false;
    }

    setComponent(component) {
        this.component = component;
    }

    cancel() {
        this.reset();
        EventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
    }

    mouseDown(x, y, mx, my, item, event) {
        this.originalPoint = {x, y};
        this.schemeContainer.addItem(this.component);
        this.addedToScheme = true;
        this.schemeContainer.setActiveBoundaryBox(this.component.area);
        EventBus.$emit(EventBus.REDRAW);
    }

    mouseMove(x, y, mx, my, item, event) {
        if (this.addedToScheme) {
            this.updateComponentArea(x, y);
        }
    }

    mouseUp(x, y, mx, my, item, event) {
        if (this.addedToScheme) {
            this.updateComponentArea(x, y);
            this.schemeContainer.setActiveBoundaryBox(null);
            this.schemeContainer.selectItem(this.component);
            EventBus.$emit(EventBus.ITEM_SELECTED, this.component);
        }
        this.cancel();
    }

    updateComponentArea(x, y) {
        if (x > this.originalPoint.x) {
            this.component.area.w = x - this.originalPoint.x;
            this.component.area.x = this.originalPoint.x;
        } else {
            this.component.area.w = this.originalPoint.x - x;
            this.component.area.x = x;
        }

        if (y > this.originalPoint.y) {
            this.component.area.h = y - this.originalPoint.y;
            this.component.area.y = this.originalPoint.y;
        } else {
            this.component.area.h = this.originalPoint.y - y;
            this.component.area.y = y;
        }
        EventBus.$emit(EventBus.REDRAW);
    }
}
