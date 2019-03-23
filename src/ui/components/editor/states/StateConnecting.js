import State from './State.js';
import EventBus from '../EventBus.js';

export default class StateConnecting extends State {
    constructor(editor) {
        super(editor);
        this.name = 'connecting';
        this.component = null;
        this.schemeContainer = editor.schemeContainer;
        this.sourceItem = null;
        this.hoveredItem = null;
    }

    reset() {
        this.sourceItem = null;
        this.hoveredItem = null;
    }

    mouseMove(x, y, mx, my, object, event) {
        if (object && object.item && this.isLegitItemForConnecting(object.item)) {
            this.hoveredItem = object.item;
        } else {
            this.hoveredItem = null;
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        if (object && object.item && this.isLegitItemForConnecting(object.item)) {
            if (this.sourceItem && this.sourceItem !== object.item) {
                this.schemeContainer.connectItems(this.sourceItem, object.item);
                this.reset();
                EventBus.$emit(EventBus.SWITCH_MODE_TO_EDIT);
            } else {
                this.sourceItem = item;
            }
        }
    }

    isLegitItemForConnecting(item) {
        return item && (item.type === 'component' || item.type === 'overlay' || item.type === 'image' || item.type === 'comment');
    }

    setSourceItem(item) {
        this.sourceItem = item;
    }
}
