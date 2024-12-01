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
        this.currentHovered = null;
        this.hoveredItemEntries = new Map();
        this.userEventBus = userEventBus;
        this.schemeContainer = this.parentState.schemeContainer;
    }

    reset() {
        this.softReset();
        this.hoveredItemEntries = new Map();
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
                    let transformMatrix = null;
                    if (componentItem && componentItem.meta.componentSchemeContainer) {
                        transformMatrix = componentItem.meta.componentSchemeContainer.shadowTransform;
                    }
                    const localPoint = localPointOnItem(x, y, object.item, transformMatrix);
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
                    let transformMatrix = null;
                    if (componentItem && componentItem.meta.componentSchemeContainer) {
                        transformMatrix = componentItem.meta.componentSchemeContainer.shadowTransform;
                    }
                    const localPoint = localPointOnItem(x, y, object.item, transformMatrix);
                    shape.onMouseMove(this.editorId, object.item, object.areaId, localPoint.x, localPoint.y);
                }
            }
            this.handleItemHoverEvents(object, componentItem);
        }
    }

    /**
     *
     * @param {String} itemId
     * @param {String} event
     * @param {Item|undefined} componentItem
     */
    sendItemEventById(itemId, event, componentItem) {
        if (componentItem && componentItem.meta.componentUserEventBus) {
            componentItem.meta.componentUserEventBus.emitItemEvent(itemId, event);
            return;
        }
        const item = this.schemeContainer.findItemById(itemId);
        if (item) {
            this.emit(componentItem, item, event);
        }
    }

    /**
     * This function tracks the triggering of mouse in/out events for item and its entire chain of ancestors.
     * This is needed so that the mouse out event correctly propagates through all ancestor items
     * @param {*} object
     * @param {Item|undefined} componentItem
     */
    handleItemHoverEvents(object, componentItem) {
        if (object && (object.type === 'item' || object.type === 'custom-item-area') && object.item) {
            if (!this.currentHovered) {
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    const item = object.item;
                    this.hoveredItemEntries = new Map();

                    item.meta.ancestorIds.forEach(itemId => {
                        this.hoveredItemEntries.set(itemId, { itemId, componentItem });
                    });
                    this.hoveredItemEntries.set(item.id, { itemId: item.id, componentItem });

                    item.meta.ancestorIds.forEach(itemId => {
                        this.sendItemEventById(itemId, MOUSE_IN, componentItem);
                    });
                } else {
                    this.hoveredItemEntries = new Map();
                    this.hoveredItemEntries.set(item.id, { itemId: item.id, componentItem });
                }
                this.emit(componentItem, object.item, MOUSE_IN);
                this.currentHovered = {
                    item: object.item,
                    componentItem
                };

            } else if (this.currentHovered.item.id !== object.item.id) {
                let allNewIds = new Set();
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    allNewIds = new Set(object.item.meta.ancestorIds);
                }
                allNewIds.add(object.item.id);

                this.hoveredItemEntries.forEach((entry, itemId) => {
                    if (!allNewIds.has(itemId)) {
                        this.hoveredItemEntries.delete(itemId);
                        this.sendMouseOutEvent(itemId, entry.componentItem);
                    }
                });

                allNewIds.forEach(itemId => {
                    if (!this.hoveredItemEntries.has(itemId)) {
                        this.hoveredItemEntries.set(itemId, {itemId, componentItem});
                        this.sendItemEventById(itemId, MOUSE_IN, componentItem);
                    }
                });
                this.currentHovered = {
                    item: object.item,
                    componentItem
                };
            }
        } else {
            this.hoveredItemEntries.forEach((entry, itemId) => {
                this.sendMouseOutEvent(itemId, entry.componentItem);
            });
            this.hoveredItemEntries.clear();
            this.currentHovered = null;
        }
    }

    /**
     *
     * @param {String} itemId
     * @param {Item|undefined} componentItem
     * @returns
     */
    sendMouseOutEvent(itemId, componentItem) {
        this.sendItemEventById(itemId, MOUSE_OUT, componentItem);
        let schemeContainer = this.schemeContainer;
        if (componentItem && componentItem.meta.componentSchemeContainer) {
            schemeContainer = componentItem.meta.componentSchemeContainer;
        }
        const item = schemeContainer.findItemById(itemId);
        if (!item) {
            return;
        }
        const shape = Shape.find(item.shape);
        if (!shape || !shape.onMouseOut) {
            return;
        }
        shape.onMouseOut(this.editorId, item);
    }

    /**
     *
     * @param {Item|undefined} componentItem
     * @param {Item} item
     * @param {String} eventName
     * @param  {...any} args
     */
    emit(componentItem, item, eventName, ...args) {
        if (componentItem && componentItem.meta.componentUserEventBus && item && item.id) {
            componentItem.meta.componentUserEventBus.emitItemEvent(item.id, eventName, ...args);
        } else {
            this.parentState.emit(item, eventName, ...args);
        }
    }

    handleItemClick(item, mx, my, componentItem) {
        this.parentState.handleItemClick(item, mx, my, componentItem);
    }
}