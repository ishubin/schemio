import { DragScreenState, isEventMiddleClick, SubState } from '../State.js';
import Events from '../../../../userevents/Events.js';
import { Keys } from '../../../../events';
import Shape from '../../items/shapes/Shape.js';
import { localPointOnItem } from '../../../../scheme/ItemMath.js';
import { DragItemState } from './DragItemState.js';

const MOUSE_IN = Events.standardEvents.mousein.id;
const MOUSE_OUT = Events.standardEvents.mouseout.id;

export class IdleInteractState extends SubState {
    constructor(parentState, listener, userEventBus) {
        super(parentState, 'idle');
        this.listener = listener;
        this.mouseMovedAfterClick = false;
        this.initialClickPoint = null;

        // used in order to track whether mousein or mouseout event can be produced
        this.currentHoveredItem = null;
        this.hoveredItemIds = new Set();
        this.userEventBus = userEventBus;
        this.schemeContainer = this.parentState.schemeContainer;
    }

    reset() {
        this.softReset();
        this.hoveredItemIds = new Set();
    }

    softReset() {
        this.mouseMovedAfterClick = false;
        this.initialClickPoint = null;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.MINUS) {
            this.zoomOut();
        } else if (key === Keys.EQUALS) {
            this.zoomIn();
        } else if (key === Keys.CTRL_ZERO) {
            this.resetZoom();
        }
    }

    /**
     *
     * @param {*} x
     * @param {*} y
     * @param {*} mx
     * @param {*} my
     * @param {*} object
     * @param {*} event
     * @param {Item|undefined} componentItem
     * @returns
     */
    mouseDown(x, y, mx, my, object, event, componentItem) {
        super.mouseDown(x, y, mx, my, object, event, componentItem);
        this.mouseMovedAfterClick = false;
        this.initialClickPoint = {x: mx, y: my};
        if (!isEventMiddleClick(event) && object && object.type === 'item') {
            if (object.item.behavior.dragging !== 'none') {
                this.migrateSubState(new DragItemState(this, this.listener, object.item, x, y, componentItem));
                return;
            } else if (object.item.meta.ancestorDraggableId) {
                const schemeContainer = componentItem ? componentItem.meta.componentSchemeContainer : this.schemeContainer;
                const ancestorItem =  schemeContainer.findItemById(object.item.meta.ancestorDraggableId);
                if (ancestorItem) {
                    this.migrateSubState(new DragItemState(this, this.listener, ancestorItem, x, y, componentItem));
                    return;
                }
            }
        }
    }

    mouseUp(x, y, mx, my, object, event, componentItem) {
        if (!this.mouseMovedAfterClick) {
            if (object && object.item) {
                this.listener.onItemClicked(object.item, x, y);
                const shape = Shape.find(object.item.shape);
                if (shape && shape.onMouseDown) {
                    // TODO in case of componentItem set the localPointOnItem should take components item transform into account
                    const localPoint = localPointOnItem(x, y, object.item);
                    shape.onMouseDown(this.editorId, object.item, object.areaId, localPoint.x, localPoint.y);
                }
                this.parentState.handleItemClick(object.item, mx, my, componentItem);
            } else {
                // checking whether user clicked on the item link or not
                // if it was item link - then we don't want to remove them from DOM
                if (!event.target || !event.target.closest('.item-link')) {
                    this.listener.onVoidClicked();
                }
            }
            this.softReset();
        }
    }

    mouseMove(x, y, mx, my, object, event, componentItem) {
        if (event.touches && event.touches.length === 2) {
            this.mobilePinchToZoom(event);
            return;
        }
        if (this.initialClickPoint && Math.abs(mx - this.initialClickPoint.x) + Math.abs(my - this.initialClickPoint.y) > 3) {
            this.mouseMovedAfterClick = true;
            event.preventDefault();
            if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.softReset();
            } else {
                this.migrate(new DragScreenState(this.parentState, true, {x, y, mx, my}));
            }
        } else {
            if (object.item) {
                const shape = Shape.find(object.item.shape);
                if (shape && shape.onMouseMove) {
                    const localPoint = localPointOnItem(x, y, object.item);
                    shape.onMouseMove(this.editorId, object.item, object.areaId, localPoint.x, localPoint.y);
                }
            }
            this.handleItemHoverEvents(object);
        }
    }

    sendItemEventById(itemId, event) {
        const item = this.schemeContainer.findItemById(itemId);
        if (item) {
            this.emit(item, event);
        }
    }

    handleItemHoverEvents(object) {
        if (object && (object.type === 'item' || object.type === 'custom-item-area') && object.item) {
            if (!this.currentHoveredItem) {
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    this.hoveredItemIds = new Set(object.item.meta.ancestorIds.concat([object.item.id]));
                    object.item.meta.ancestorIds.forEach(itemId => {
                        this.sendItemEventById(itemId, MOUSE_IN);
                    });
                } else {
                    this.hoveredItemIds = new Set([object.item.id]);
                }
                this.emit(object.item, MOUSE_IN);
                this.currentHoveredItem = object.item;

            } else if (this.currentHoveredItem.id !== object.item.id) {
                let allNewIds = new Set();
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    allNewIds = new Set(object.item.meta.ancestorIds);
                }
                allNewIds.add(object.item.id);

                this.hoveredItemIds.forEach(itemId => {
                    if (!allNewIds.has(itemId)) {
                        this.hoveredItemIds.delete(itemId);
                        this.sendMouseOutEvent(itemId);
                    }
                });

                allNewIds.forEach(itemId => {
                    if (!this.hoveredItemIds.has(itemId)) {
                        this.hoveredItemIds.add(itemId);
                        this.sendItemEventById(itemId, MOUSE_IN);
                    }
                });
                this.currentHoveredItem = object.item;
            }
        } else {
            this.hoveredItemIds.forEach(itemId => {
                this.sendMouseOutEvent(itemId);
            });
            this.hoveredItemIds.clear();
            this.currentHoveredItem = null;
        }
    }

    sendMouseOutEvent(itemId) {
        this.sendItemEventById(itemId, MOUSE_OUT);
        const item = this.schemeContainer.findItemById(itemId);
        if (!item) {
            return;
        }
        const shape = Shape.find(item.shape);
        if (!shape || !shape.onMouseOut) {
            return;
        }
        shape.onMouseOut(this.editorId, item);
    }

    emit(element, eventName, ...args) {
        this.parentState.emit(element, eventName, ...args);
    }

    handleItemClick(item, mx, my, componentItem) {
        this.parentState.handleItemClick(item, mx, my, componentItem);
    }
}