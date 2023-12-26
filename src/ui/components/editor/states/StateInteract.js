/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State, { isEventMiddleClick, SubState } from './State.js';
import UserEventBus from '../../../userevents/UserEventBus.js';
import Events from '../../../userevents/Events.js';
import {DragType, hasItemDescription, ItemInteractionMode} from '../../../scheme/Item.js';
import { Keys } from '../../../events';
import Shape from '../items/shapes/Shape.js';
import { getBoundingBoxOfItems, getItemOutlineSVGPath, localPointOnItem, worldPointOnItem } from '../../../scheme/SchemeContainer.js';
import EditorEventBus from '../EditorEventBus.js';
import myMath from '../../../myMath.js';
import { indexOf } from '../../../collections.js';

const MOUSE_IN = Events.standardEvents.mousein.id;
const MOUSE_OUT = Events.standardEvents.mouseout.id;
const CLICKED = Events.standardEvents.clicked.id;

/*
This state works as dragging the screen, zooming, selecting elements
*/
class StateInteract extends State {
    /**
     *
     * @param {UserEventBus} userEventBus
     */
    constructor(editorId, store, userEventBus, listener) {
        super(editorId, store,  'interact', listener);
        this.subState = null;
        this.userEventBus = userEventBus;
    }

    reset() {
        this.migrateSubState(new IdleState(this, this.listener, this.userEventBus));
    }

    handleItemClick(item, mx, my) {
        this.emit(item, CLICKED);
        if (item.links && item.links.length > 0) {
            this.listener.onItemLinksShowRequested(item);
        }
        if (hasItemDescription(item)) {
            if (item.interactionMode === ItemInteractionMode.SIDE_PANEL) {
                this.listener.onItemSidePanelRequested(item);
            } else if (item.interactionMode === ItemInteractionMode.TOOLTIP) {
                this.listener.onItemTooltipRequested(item, mx, my);
            }
        }
    }

    emit(element, eventName, ...args) {
        if (element && element.id) {
            this.userEventBus.emitItemEvent(element.id, eventName, ...args);
        }
    }
}



class DragItemState extends SubState {
    constructor(parentState, listener, item, x, y) {
        super(parentState, 'drag-item-state');
        this.listener = listener;
        this.initialClickPoint = {x, y};
        this.originalItemPosition = {x: item.area.x, y: item.area.y};
        this.item = item;
        this.moved = false;
        this.lastDropCandidate = null;
    }

    emit(element, eventName, ...args) {
        this.parentState.emit(element, eventName, ...args);
    }


    mouseMove(x, y, mx, my, object, event) {
        if (!this.moved) {
            this.emit(this.item, Events.standardEvents.dragStart.id);
        }
        this.moved = true;
        const p0 = this.schemeContainer.relativePointForItem(this.initialClickPoint.x, this.initialClickPoint.y, this.item);
        const p1 = this.schemeContainer.relativePointForItem(x, y, this.item);
        const nx = this.originalItemPosition.x + p1.x - p0.x;
        const ny = this.originalItemPosition.y + p1.y - p0.y;
        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'area');

        if (this.item.behavior.dragging === DragType.dragndrop.id) {
            this.handleDroppableMouseMove(nx, ny);
        } else if (this.item.behavior.dragging === DragType.path.id && this.item.behavior.dragPath) {
            this.handlePathMouseMove(nx, ny);
        } else {
            this.item.area.x = nx;
            this.item.area.y = ny;
        }
    }

    handlePathMouseMove(x, y) {
        const pathItems = this.schemeContainer.findElementsBySelector(this.item.behavior.dragPath);
        if (pathItems.length === 0) {
            return;
        }

        let bestDistance = -1;
        let closestPoint = null;
        let closestPathItem = null;
        let closestPath = null;
        let closestPathDistance = -1;

        pathItems.forEach(item => {
            // it should not be possible to drag item along itself
            if (item.id === this.item.id || (item.meta.ancestorIds && indexOf(item.meta.ancestorIds) >= 0)) {
                return;
            }

            // re-calculating item outline for every mouse move event is not optimal
            // but if we calculate it only at the start of the drag
            // and the path is changing (e.g. stretching), it will not be the same path
            // as the one that is rendered on screen
            const svgPath = getItemOutlineSVGPath(item);
            if (!svgPath) {
                return;
            }

            const localPoint = localPointOnItem(x, y, item);
            const p = myMath.closestPointOnPath(localPoint.x, localPoint.y, svgPath);

            if (!p) {
                return;
            }

            const wp = worldPointOnItem(p.x, p.y, item);

            const squareDistance = (wp.x - x) * (wp.x - x) + (wp.y - y) * (wp.y - y);

            if (squareDistance < bestDistance || bestDistance < 0) {
                bestDistance = squareDistance;
                closestPoint = wp;
                closestPathItem = item;
                closestPath = svgPath;
                closestPathDistance = p.distance;
            }
        });

        if (!closestPoint) {
            return;
        }

        const localPoint = myMath.findTranslationMatchingWorldPoint(
            closestPoint.x, closestPoint.y,
            this.item.area.w * this.item.area.px, this.item.area.h * this.item.area.py,
            this.item.area, this.item.meta.transformMatrix
        );
        this.item.area.x = localPoint.x;
        this.item.area.y = localPoint.y;


        if (this.item.behavior.dragPathAlign) {
            const nextPoint = closestPath.getPointAtLength(closestPathDistance + 1);
            const prevPoint = closestPath.getPointAtLength(closestPathDistance - 1);
            const worldNextPoint = worldPointOnItem(nextPoint.x, nextPoint.y, closestPathItem);
            const worldPrevPoint = worldPointOnItem(prevPoint.x, prevPoint.y, closestPathItem);
            const Vx = worldNextPoint.x - worldPrevPoint.x;
            const Vy = worldNextPoint.y - worldPrevPoint.y;
            const dSquared = Vx * Vx + Vy * Vy;
            if (!myMath.tooSmall(dSquared)) {
                const d = Math.sqrt(dSquared);

                const vx = Vx / d;
                const vy = Vy / d;
                const angle = myMath.fullAngleForNormalizedVector(vx, vy) * 180 / Math.PI;

                this.item.area.r = angle;

                if (isFinite(this.item.behavior.dragPathRotation)) {
                    this.item.area.r += this.item.behavior.dragPathRotation;
                };
            }
        }
    }

    handleDroppableMouseMove(x, y) {
        this.item.area.x = x;
        this.item.area.y = y;
        const dropItem = this.findDesignatedDropItem();

        if (this.lastDropCandidate && (!dropItem || dropItem.id !== this.lastDropCandidate.id)) {
            this.emit(this.item, Events.standardEvents.dragObjectOut.id, this.lastDropCandidate);
            this.emit(this.lastDropCandidate, Events.standardEvents.dragObjectOut.id, this.item);
        }

        if (!dropItem) {
            this.lastDropCandidate = null;
            return;
        }

        const p = this.getDropPosition(dropItem);
        if (p) {
            this.item.area.x = p.x;
            this.item.area.y = p.y;
        }

        this.emit(this.item, Events.standardEvents.dragObjectIn.id, dropItem);
        this.emit(dropItem, Events.standardEvents.dragObjectIn.id, this.item);

        this.lastDropCandidate = dropItem;

    }

    getDropPosition(dropItem) {
        // centering item inside drop item
        const wp = worldPointOnItem(dropItem.area.w / 2, dropItem.area.h / 2, dropItem);
        return myMath.findTranslationMatchingWorldPoint(wp.x, wp.y, this.item.area.w/2, this.item.area.h/2, this.item.area, this.item.meta.transformMatrix);

    }

    mouseUp(x, y, mx, my, object, event) {
        this.emit(this.item, Events.standardEvents.dragEnd.id);
        if (!this.moved) {
            this.parentState.handleItemClick(this.item, mx, my);
            this.migrateToPreviousSubState();
            return;
        }
        if (this.item.behavior.dragging === DragType.dragndrop.id) {
            const dropItem = this.lastDropCandidate;
            if (dropItem) {
                const p = this.getDropPosition(dropItem);
                if (p) {
                    this.item.area.x = p.x;
                    this.item.area.y = p.y;
                }
                this.emit(this.item, Events.standardEvents.drop.id, dropItem);
                this.emit(dropItem, Events.standardEvents.receiveDrop.id, this.item);
            } else {
                // resetting back to old position since we can only drop the item
                // to specified designated items
                this.item.area.x = this.originalItemPosition.x;
                this.item.area.y = this.originalItemPosition.y;
            }
        }
        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'area');
        this.migrateToPreviousSubState();
    }

    findDesignatedDropItem() {
        if (this.item.behavior.dropTo === 'self') {
            return null;
        }
        const designatedDropItems = this.schemeContainer.findElementsBySelector(this.item.behavior.dropTo, null);

        const draggedItemBox = getBoundingBoxOfItems([this.item]);

        let candidateDrop = null;
        const draggedSquare = draggedItemBox.w * draggedItemBox.h;
        designatedDropItems.forEach(item => {
            // it should not be possible to drop item to itself or to its own descendants
            if (item.id === this.item.id || (item.meta.ancestorIds && indexOf(item.meta.ancestorIds) >= 0)) {
                return;
            }
            const box = getBoundingBoxOfItems([item]);
            const overlap = myMath.overlappingArea(draggedItemBox, box);
            if (overlap) {
                const overlapSquare = overlap.w * overlap.h;
                if (overlapSquare > draggedSquare / 2) {
                    candidateDrop = item;
                }
            }
        });
        return candidateDrop;
    }
}



class IdleState extends SubState {
    constructor(parentState, listener, userEventBus) {
        super(parentState, 'idle');
        this.listener = listener;
        this.startedDragging = false;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;

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
        this.initialClickPoint = null;
        this.startedDragging = false;
    }

    mouseDown(x, y, mx, my, object, event){
        super.mouseDown(x, y, mx, my, object, event);
        if (!isEventMiddleClick(event) && object && object.type === 'item' && object.item.behavior.dragging !== 'none') {
            this.migrateSubState(new DragItemState(this, this.listener, object.item, x, y));
            return;
        }
        this.initScreenDrag(mx, my);
    }

    initScreenDrag(x, y) {
        this.startedDragging = true;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
        this.originalZoom = this.schemeContainer.screenTransform.scale;
        this.resetInertiaDrag();
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

    mouseUp(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            this.initScreenInertia();

            if (Math.abs(mx - this.initialClickPoint.x) + Math.abs(my - this.initialClickPoint.y) < 3) {
                if (object && object.item) {
                    this.listener.onItemClicked(object.item, x, y);
                    const shape = Shape.find(object.item.shape);
                    if (shape && shape.onMouseDown) {
                        const localPoint = localPointOnItem(x, y, object.item);
                        shape.onMouseDown(this.editorId, object.item, object.areaId, localPoint.x, localPoint.y);
                    }
                    this.parentState.handleItemClick(object.item, mx, my);
                } else {
                    // checking whether user clicked on the item link or not
                    // if it was item link - then we don't want to remove them from DOM
                    if (!event.target || !event.target.closest('.item-link')) {
                        this.listener.onVoidClicked();
                    }
                }
            }
            this.softReset();
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.touches && event.touches.length === 2) {
            this.mobilePinchToZoom(event);
            return;
        }
        if (this.startedDragging && this.initialClickPoint) {
            event.preventDefault();
            if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.softReset();
            } else {
                this.dragScreen(mx, my);
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

    dragScreen(x, y) {
        this.registerInertiaPositions(x, y);

        if (!this.schemeContainer.scheme.settings.screen.draggable) {
            return;
        }
        this.dragScreenTo(
            Math.floor(this.originalOffset.x + x - this.initialClickPoint.x),
            Math.floor(this.originalOffset.y + y - this.initialClickPoint.y)
        );
    }

    handleItemClick(item, mx, my) {
        this.parentState.handleItemClick(item, mx, my);
    }
}

export default StateInteract;
