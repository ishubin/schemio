import State from './State.js';
import EventBus from '../EventBus.js';

export default class StateCreateComponent extends State {
    constructor(editor) {
        super(editor);
        this.component = null;
        this.addedToScheme = false;
        this.schemeContainer = editor.schemeContainer;
    }

    reset() {
        this.component = null;
        this.addedToScheme = false;
    }

    setComponent(component) {
        this.component = component;
    }

    cancel() {
        this.reset();
        EventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
    }

    mouseDown(x, y, mx, my, event) {
        this.component.area.x = x;
        this.component.area.y = y;
        this.schemeContainer.addItem(this.component);
        this.addedToScheme = true;
        EventBus.$emit(EventBus.REDRAW);
    }

    mouseMove(x, y, mx, my, event) {
        if (this.addedToScheme) {
            this.component.area.w = x - this.component.area.x;
            this.component.area.h = y - this.component.area.y;
            EventBus.$emit(EventBus.REDRAW);
        }
    }

    mouseUp(x, y, mx, my, event) {
        if (this.addedToScheme) {
            this.component.area.w = x - this.component.area.x;
            this.component.area.h = y - this.component.area.y;
            EventBus.$emit(EventBus.REDRAW);
        }
        this.cancel();
    }
}
