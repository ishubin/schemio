/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import State from './State.js';
import Shape from '../items/shapes/Shape';
import EventBus from '../EventBus.js';
import forEach from 'lodash/forEach';
import indexOf from 'lodash/indexOf';
import myMath from '../../../myMath';
import {Logger} from '../../../logger';
import '../../../typedef';
import shortid from 'shortid';
import { Keys } from '../../../events';
import StoreUtils from '../../../store/StoreUtils.js';
import utils from '../../../utils.js';

const log = new Logger('StateDragItem');

const IS_SOFT = true;
const IS_NOT_SOFT = false;

const ITEM_MODIFICATION_CONTEXT_MOVED = {
    moved: true,
    rotated: false,
    resized: false,
    id: ''
};
const ITEM_MODIFICATION_CONTEXT_DEFAULT = ITEM_MODIFICATION_CONTEXT_MOVED;


function isEventMiddleClick(event) {
    return event.button === 1;
}

function isEventRightClick(event) {
    return event.button === 2;
}

/**
 * Checkes whether keys like shift, meta (mac), ctrl were pressed during the mouse event
 * @param {MouseEvent} event 
 */
function isMultiSelectKey(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey;
}

export default class StateDragItem extends State {
    /**
     * @param {EventBus} eventBus 
     */
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'drag-item';
        this.originalPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.wasDraggedEnough = false;
        this.startedDragging = true;
        
        //TODO either get rid of it or rename sourceItem to something more meaningful. This field is very confusing and it is used to often in this code
        this.sourceItem = null; // used for item control points dragging
        this.controlPoint = null; // stores coords for item control point

        this.multiSelectBox = null;

        /**
         * @type SnappingPoints
         */
        this.boxPointsForSnapping = null;

        this.isRotating = false;

        // used to check whether the mouse moved between mouseDown and mouseUp events
        this.wasMouseMoved = false;

        // used in order to drag screen when user holds spacebar
        this.shouldDragScreen = false;
        this.originalOffset = {x: 0, y: 0};
        this.reindexNeeded = false;
        this.multiItemEditBox = null;
        this.multiItemEditBoxOriginalArea = null;
        // array of edge names. used to resize multi item edit box using its edge draggers
        this.draggerEdges = null;

        // used for tracking updates of control points (also when multi item edit box is not initialized, e.g. for connector)
        this.lastModifiedItem = null;

        // used in order to remount items in this item in case thier area fits
        this.proposedItemForMounting = null;
        
        // flag that identifies whether items should be remounted to root. happens when they are dragged outside of their parent
        this.proposedToRemountToRoot = false;

        this.snapper = {
            /**
             * Checks snapping of item and returns new offset that should be applied to item
             * 
             * @param {SnappingPoints} points - points of an item by which it should snap it to other items
             * @param {Set} excludeItemIds - items that should be excluded from snapping (so that they don't snap to themselve)
             * @param {Number} dx - pre-snap candidate offset on x axis
             * @param {Number} dy - pre-snap candidate offset on y axis
             * @returns {Offset} offset with dx and dy fields specifying how these points should be moved to be snapped
             */
            snapPoints: (points, excludeItemIds, dx, dy) => this.snapPoints(points, excludeItemIds, dx, dy)
        };

        // used in order to track the uniqueness of modification context from mouse down to mouse up events
        this.modificationContextId = null;
    }

    reset() {
        this.updateCursor('default');
        this.reindexNeeded = false;
        this.wasDraggedEnough = false;
        this.startedDragging = false;
        this.shouldDragScreen = false;
        this.draggerEdges = null;
        this.isRotating = false;
        this.sourceItem = null;
        this.controlPoint = null;
        this.multiSelectBox = null;
        this.wasMouseMoved = false;
        this.multiItemEditBox = null;
        this.multiItemEditBoxOriginalArea = null;
        this.boxPointsForSnapping = null;
        this.modificationContextId = null;
        this.lastModifiedItem = null;
        this.proposedItemForMounting = null;
        this.proposedToRemountToRoot = false;
    }

    keyPressed(key, keyOptions) {
        var delta = keyOptions.ctrlCmdPressed ? 10: 1;

        if (Keys.LEFT === key) {
            this.dragItemsByKeyboard(-delta, 0);
        } else if (Keys.RIGHT === key) {
            this.dragItemsByKeyboard(delta, 0);
        } else if (Keys.UP === key) {
            this.dragItemsByKeyboard(0, -delta);
        } else if (Keys.DOWN === key) {
            this.dragItemsByKeyboard(0, delta);
        } else if (key === Keys.SPACE && !this.startedDragging) {
            this.shouldDragScreen = true;
            this.updateCursor('grabbing');
        } else if (key === Keys.MINUS) {
            this.zoomOutByKey();
        } else if (key === Keys.EQUALS) {
            this.zoomInByKey();
        }
    }

    keyUp(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.shouldDragScreen = false;
            this.updateCursor('default');
        }
    }

    initDragging(x, y, mx, my) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.originalPoint.mx = mx;
        this.originalPoint.my = my;
        this.wasDraggedEnough = false;
        this.startedDragging = true;
        this.wasMouseMoved = false;
        this.reindexNeeded = false;
        this.lastModifiedItem = null;
    }

    initDraggingMultiItemBox(multiItemEditBox, x, y, mx, my) {
        this.initDragging(x, y, mx, my);
        this.multiItemEditBox = multiItemEditBox;
        this.initOriginalAreasForMultiItemEditBox(multiItemEditBox);
        this.boxPointsForSnapping = this.generateBoxPointsForSnapping(multiItemEditBox);
        this.isRotating = false;
    }

    initMultiItemBoxRotation(multiItemEditBox, x, y, mx, my) {
        this.initDragging(x, y, mx, my);
        this.multiItemEditBox = multiItemEditBox;
        this.initOriginalAreasForMultiItemEditBox(multiItemEditBox);
        this.isRotating = true;
    }

    initMultiItemBoxResize(multiItemEditBox, draggerEdges, x, y, mx, my) {
        this.initDragging(x, y, mx, my);
        this.multiItemEditBox = multiItemEditBox;
        this.initOriginalAreasForMultiItemEditBox(multiItemEditBox);
        this.isRotating = false;
        this.draggerEdges = draggerEdges;
    }

    initOriginalAreasForMultiItemEditBox(multiItemEditBox) {
        this.multiItemEditBoxOriginalArea = utils.clone(multiItemEditBox.area);
    }

    initScreenDrag(mx, my) {
        this.wasDraggedEnough = false;
        this.startedDragging = true;
        this.originalPoint.x = mx;
        this.originalPoint.y = my;
        this.originalPoint.mx = mx;
        this.originalPoint.my = my;
        this.originalOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    mouseDown(x, y, mx, my, object, event) {
        this.modificationContextId = shortid.generate();
        this.wasMouseMoved = false;
        
        if (isEventMiddleClick(event)) {
            this.shouldDragScreen = true;
        }

        if (this.shouldDragScreen) {
            this.updateCursor('grabbing');
            this.initScreenDrag(mx, my);
        } else if (object.item) {
            if (isEventRightClick(event)) {
                this.handleItemRightMouseDown(x, y, mx, my, object.item, event);
            } else {
                this.handleItemLeftMouseDown(x, y, mx, my, object.item, event);
            }
        } else if (object.connectorStarter) {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, object.connectorStarter.item, object.connectorStarter.point);
        } else if (object.controlPoint) {
            this.initDraggingForControlPoint(object.controlPoint, x, y, mx, my);
        } else if (object.type === 'multi-item-edit-box') {
            this.initDraggingMultiItemBox(object.multiItemEditBox, x, y, mx, my);
        } else if (object.type === 'multi-item-edit-box-rotational-dragger') {
            this.initMultiItemBoxRotation(object.multiItemEditBox, x, y, mx, my);
        } else if (object.type === 'multi-item-edit-box-resize-dragger') {
            this.initMultiItemBoxResize(object.multiItemEditBox, object.draggerEdges, x, y, mx, my);
        } else if (object.type === 'multi-item-edit-box-edit-curve-link') {
            if (object.multiItemEditBox.items.length > 0
                && object.multiItemEditBox.items[0].shape === 'curve') {
                this.eventBus.emitCurveEdited(object.multiItemEditBox.items[0]);
            }
        } else if (isEventRightClick(event)) {
            this.handleVoidRightClick(x, y, mx, my);
        } else {
            //enabling multi select box only if user clicked in the empty area.
            if (!object || object.type === 'void' || object.itemTextElement) {
                this.initMulitSelectBox(x, y, mx, my);
            }
        }
    }

    findItemControlPoint(pointId) {
        for(let i = 0; i < this.store.state.itemControlPoints.length; i++) {
            const controlPoint = this.store.state.itemControlPoints[i];
            if (controlPoint.id === pointId) {
                return controlPoint.point;
            }
        }

        return null;
    }

    initDraggingForControlPoint(controlPointDef, x, y, mx, my) {
        const controlPoint = this.findItemControlPoint(controlPointDef.pointId);
        if (controlPoint) {
            this.reset();
            this.originalPoint.x = x;
            this.originalPoint.y = y;
            this.originalPoint.mx = mx;
            this.originalPoint.my = my;
            this.startedDragging = true;
            this.wasDraggedEnough = false;
            this.sourceItem = controlPointDef.item;
            this.controlPoint = {
                id: controlPointDef.pointId,
                originalX: controlPoint.x,
                originalY: controlPoint.y,
            }
        }
    }

    handleVoidRightClick(x, y, mx, my) {
        this.schemeContainer.deselectAllItems();
        this.eventBus.$emit(EventBus.VOID_RIGHT_CLICKED, x, y, mx, my);
    }

    /**
     * This function is tricky as there are a lot of various conditions for the mouse click event.
     * 1. When clicked non-selected element without meta/ctrl key 
     *      =>  it should only select that element and deselect any other
     * 
     * 2. When clicked already selected element 
     *      =>  it should not do anything until the mouse is either released or moved.
     *          Other selected elements should stay selected
     * 
     * 3. When clicked non-selected element with meta/ctrl key
     *      =>  it should just select that element only without reseting selection for other elements
     * 
     * 4. When clicked selected element with meta/ctrl key
     *      =>  it should just deselect this element without reseting selection for other elements
     * 
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} mx 
     * @param {number} my 
     * @param {SchemeItem} item 
     * @param {MouseEvent} event 
     */
    handleItemLeftMouseDown(x, y, mx, my, item, event) {
        // if the item is already selected it should not do anything. This way we can let user drag multiple items
        if (!this.schemeContainer.isItemSelected(item)) {
            this.schemeContainer.selectItem(item, isMultiSelectKey(event));
        }
        
        if (this.schemeContainer.multiItemEditBox && this.schemeContainer.multiItemEditBox.itemData[item.id]) {
            this.initDraggingMultiItemBox(this.schemeContainer.multiItemEditBox, x, y, mx, my);
        }
    }

    handleItemRightMouseDown(x, y, mx, my, item, event) {
        this.eventBus.emitRightClickedItem(item, mx, my);

        if (!this.schemeContainer.isItemSelected(item)) {
            this.schemeContainer.selectItem(item, isMultiSelectKey(event));
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging) {

            this.wasMouseMoved = true;

            if (this.shouldDragScreen) {
                this.dragScreen(mx, my);
            } else if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.reset();
            } else if (this.multiItemEditBox && !this.multiItemEditBox.locked) {
                if (this.isRotating) {
                    this.rotateMultiItemEditBox(x, y, mx, my, event);
                } else if (this.draggerEdges) {
                    this.dragMultiItemEditBoxByDragger(x, y, this.draggerEdges, event);
                } else {
                    // doing this check since it is really easy to trigger item drag just by few pixels
                    if (!this.draggedEnough(mx, my)) {
                        return;
                    }

                    this.dragMultiItemEditBox(x, y);
                }
            } else {
                if (this.controlPoint) {
                    this.handleControlPointDrag(x, y);
                }
            }
        } else if (this.multiSelectBox) {
            // checking user moved multi select box outside of svg editor and released the button there
            if (event.buttons === 0) {
                // in such case when user moves mouse back - it should finalize the multi select
                // therefore we need to trigger mouseUp artificially
                this.mouseUp(x, y, mx, my, object, event);
            } else {
                // otherwise keep moving multi select box
                this.wasMouseMoved = true;
                if (x > this.originalPoint.x) {
                    this.multiSelectBox.x = this.originalPoint.x;
                    this.multiSelectBox.w = x - this.originalPoint.x;
                } else {
                    this.multiSelectBox.x = x;
                    this.multiSelectBox.w = this.originalPoint.x - x;
                }
                if (y > this.originalPoint.y) {
                    this.multiSelectBox.y = this.originalPoint.y;
                    this.multiSelectBox.h = y - this.originalPoint.y;
                } else {
                    this.multiSelectBox.y = y;
                    this.multiSelectBox.h = this.originalPoint.y - y;
                }
                StoreUtils.setMultiSelectBox(this.store, this.multiSelectBox);
            }
        }
    }

    draggedEnough(mx, my) {
        if (this.wasDraggedEnough) {
            return true;
        }

        const offset = Math.abs(mx - this.originalPoint.mx) + Math.abs(my - this.originalPoint.my);
        if (offset > 7) {
            this.wasDraggedEnough = true;
            return true;
        }

        return false;
    }

    mouseUp(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        // doing it just in case the highlighting was previously set
        this.eventBus.emitItemsHighlighted([]);

        if (this.shouldDragScreen) {
            // user probably finished dragging screen
            this.eventBus.$emit(this.eventBus.SCREEN_TRANSFORM_UPDATED);
        }

        if (this.store.state.autoRemount && !this.store.state.animationEditor.isRecording) {
            if (this.multiItemEditBox && this.proposedItemForMounting) {
                // it should remount all items in multi item edit box into the new proposed parent
                this.remountItems(this.multiItemEditBox.items, this.proposedItemForMounting);
            } else if (this.multiItemEditBox && this.proposedToRemountToRoot) {
                this.remountItems(this.multiItemEditBox.items);
            }
        }

        if (this.multiSelectBox) {
            if (!isMultiSelectKey(event)) {
                this.deselectAllItems();
            }
            this.selectByBoundaryBox(this.multiSelectBox, mx, my);
            this.emitEventsForAllSelectedItems();
            StoreUtils.setMultiSelectBox(this.store, null);

        } else if (object.item && !this.wasMouseMoved) {
            // when clicking right button - it should not deselected
            // but when clicking left button and without movin a mouse - it should deselect other items
            if (!isEventRightClick(event) && ! isMultiSelectKey(event)) {
                // forcing deselect of other items, since the mouse wasn't moved and ctrl/meta keys were not pressed
                if (this.schemeContainer.selectedItems.length > 1 && this.schemeContainer.selectedItems[0].id !== object.item.id) {
                    this.schemeContainer.selectItem(object.item, false);
                }
            }
        } 
        if (this.startedDragging && this.wasMouseMoved) {
            this.eventBus.emitSchemeChangeCommited();
        }
        if (this.reindexNeeded) {
            let items = [];
            if (this.multiItemEditBox && this.multiItemEditBox.items) {
                items = this.multiItemEditBox.items;
            }
            if (this.lastModifiedItem) {
                items.push(this.lastModifiedItem);
            }
            
            let shouldUpdateMultiItemEditBox = false;
            forEach(items, item => {
                // Now doing hard readjustment (this is needed for curve items so that they can update their area)
                this.schemeContainer.readjustItem(item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());

                if (item.shape === 'curve' && this.controlPoint) {
                    shouldUpdateMultiItemEditBox = true;
                }
            });
            if (shouldUpdateMultiItemEditBox) {
                this.schemeContainer.updateMultiItemEditBox();
            }
            this.schemeContainer.reindexItems();
        }

        // the code below is messy because it handles two conditions:
        // 1) when user dragged control point of an item
        // 2) when user dragged connector by its body and not by a control point
        // in both cases we need to do the same thing: update control points in store 
        // but in case user dragged control point of a connector - we also need to update selected connector path in store

        let itemForControlPointsUpdate = null;
        let connectorForPathRebuild = null;
        if (this.sourceItem) {
            itemForControlPointsUpdate = this.sourceItem;
            if (this.sourceItem.shape === 'connector') {
                connectorForPathRebuild = this.sourceItem;
            }
        }

        if (this.multiItemEditBox && this.multiItemEditBox.items.length === 1 && this.multiItemEditBox.items[0].shape === 'connector') {
            itemForControlPointsUpdate = this.multiItemEditBox.items[0];
            connectorForPathRebuild = this.multiItemEditBox.items[0];
        }

        if (itemForControlPointsUpdate) {
            StoreUtils.setItemControlPoints(this.store, itemForControlPointsUpdate);
        }
        if (connectorForPathRebuild) {
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find('connector').computeOutline(connectorForPathRebuild));
        }


        this.reset();
    }

    /**
     * Select items by multi select box. It uses different coords depending on item transform type
     * @param {*} box 
     * @param {*} mx mouse x in viewport
     * @param {*} my mouse y in viewport
     */
    selectByBoundaryBox(box, mx, my) {
        const viewportBox = {
            x: this.originalPoint.mx,
            y: this.originalPoint.my,
            w: mx - this.originalPoint.mx,
            h: my - this.originalPoint.my
        };

        // normalizing box
        if (viewportBox.w < 0) {
            viewportBox.x += viewportBox.w;
            viewportBox.w = Math.abs(viewportBox.w);
        }
        if (viewportBox.h < 0) {
            viewportBox.y += viewportBox.h;
            viewportBox.h = Math.abs(viewportBox.h);
        }

        const selectedItems = [];

        forEach(this.schemeContainer.getItems(), item => {
            const points = [ 
                {x: 0, y: 0}, 
                {x: item.area.w, y: 0},
                {x: item.area.w, y: item.area.h},
                {x: 0, y: item.area.h},
            ];

            let isInArea = true;

            for(let i = 0; i < points.length && isInArea; i++) {
                const wolrdPoint = this.schemeContainer.worldPointOnItem(points[i].x, points[i].y, item);

                isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box);
            }

            if (isInArea) {
                selectedItems.push(item);
            }
        });
        this.schemeContainer.selectMultipleItems(selectedItems);
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (object.item) {
            if (object.item.shape === 'curve') {
                this.eventBus.emitCurveEdited(object.item);
            } else if (object.item.shape === 'connector') {
                this.handleDoubleClickOnConnector(object.item, x, y);
            } else {
                this.findTextSlotAndEmitInPlaceEdit(object.item, x, y)
            }
        } else if (object.controlPoint && object.controlPoint.item.shape === 'connector') {
            this.handleDoubleClickOnConnectorControlPoint(object.controlPoint.item, object.controlPoint.pointId);
        } else if (object.itemTextElement) { 
            this.findTextSlotAndEmitInPlaceEdit(object.itemTextElement.item, x, y)
        } else if (object.type === 'void') {
            this.eventBus.$emit(EventBus.VOID_DOUBLE_CLICKED, x, y, mx, my);
        }
    }
    
    handleDoubleClickOnConnector(item, x, y) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return;
        }

        let minDistance = parseInt(item.shapeProps.strokeSize) + 1;

        const shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let path = '';
        if (item.shapeProps.fat && item.shapeProps.points.length > 1) {
            const points = item.shapeProps.points;
            path = `M ${points[0].x} ${points[0].y}`
            for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x} ${points[i].y}`;
            }
            minDistance += item.shapeProps.fatWidth;
        } else {
            path = shape.computeOutline(item);
        }

        if (!path) {
            return;
        }
        shadowSvgPath.setAttribute('d', path);

        const localPoint = this.schemeContainer.localPointOnItem(x, y, item);
        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, shadowSvgPath);

        // checking how far away from the curve stroke has the user clicked
        const dx = localPoint.x - closestPoint.x;
        const dy = localPoint.y - closestPoint.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= minDistance) {
            const index = this.findClosestLineSegment(closestPoint.distance, item.shapeProps.points, shadowSvgPath);
            item.shapeProps.points.splice(index + 1, 0, {
                x: closestPoint.x,
                y: closestPoint.y,
            });
            this.eventBus.emitItemChanged(item.id);
            this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            StoreUtils.setItemControlPoints(this.store, item);
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find(item.shape).computeOutline(item));
            this.eventBus.emitSchemeChangeCommited();
        }
    }

    findClosestLineSegment(distanceOnPath, points, svgPath) {
        //TODO this function is a copy paste form StateEditCurve, it should be moved to myMath
        let i = points.length - 1;
        while(i > 0) {
            const closestPoint = myMath.closestPointOnPath(points[i].x, points[i].y, svgPath);
            if (closestPoint.distance < distanceOnPath) {
                return i;
            }
            i--;
        }
        return 0;
    }

    handleDoubleClickOnConnectorControlPoint(item, pointId) {
        item.shapeProps.points.splice(pointId, 1);
        this.eventBus.emitItemChanged(item.id);
        this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.setItemControlPoints(this.store, item);
        StoreUtils.setSelectedConnectorPath(this.store, Shape.find(item.shape).computeOutline(item));
        this.eventBus.emitSchemeChangeCommited();
    }

    findTextSlotAndEmitInPlaceEdit(item, x, y) {
        const textSlot = this.findItemTextSlotByPoint(item, x, y);
        if (!textSlot) {
            return;
        }
        this.eventBus.emitItemTextSlotEditTriggered(item, textSlot.name, textSlot.area, false);
    }

    findItemTextSlotByPoint(item, x, y) {
        const localPoint = this.schemeContainer.localPointOnItem(x, y, item);
        const shape = Shape.find(item.shape);
        const textSlots = shape.getTextSlots(item);
        let selectedTextSlot = null;
        for (let i = 0; i < textSlots.length && !selectedTextSlot; i++) {
            const textSlot = textSlots[i];
            if(myMath.isPointInArea(localPoint.x, localPoint.y, textSlot.area)) {
                selectedTextSlot = textSlot;
            }
        }
        if (!selectedTextSlot && textSlots.length > 0) {
            selectedTextSlot = textSlots[0];
        }
        return selectedTextSlot;
    }

    dragMultiItemEditBox(x, y) {
        if (!this.multiItemEditBox) {
            return;
        }

        const preSnapDx = x - this.originalPoint.x;
        const preSnapDy = y - this.originalPoint.y;

        StoreUtils.clearItemSnappers(this.store);
        const snapResult = this.snapper.snapPoints(this.boxPointsForSnapping, this.multiItemEditBox.itemIds, preSnapDx, preSnapDy);

        this.multiItemEditBox.area.x = this.multiItemEditBoxOriginalArea.x + snapResult.dx;
        this.multiItemEditBox.area.y = this.multiItemEditBoxOriginalArea.y + snapResult.dy;
        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, IS_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());

        // Fixing bug #392 where connector outline is rendered stale while connector itself gets readjusted
        if (this.multiItemEditBox.items.length === 1 && this.multiItemEditBox.items[0].shape === 'connector') {
            StoreUtils.setItemControlPoints(this.store, this.multiItemEditBox.items[0]);
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find('connector').computeOutline(this.multiItemEditBox.items[0]));
        }

        // checking if it can fit into another item
        if (this.store.state.autoRemount && !this.store.state.animationEditor.isRecording ) {
            this.proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(this.multiItemEditBox.area, item => !this.multiItemEditBox.itemIds.has(item.id));
        } else {
            this.proposedItemForMounting = [];
        }

        if (this.proposedItemForMounting) {
            this.eventBus.emitItemsHighlighted([this.proposedItemForMounting.id], {highlightPins: false});
            this.proposedToRemountToRoot = false;
        } else {
            this.eventBus.emitItemsHighlighted([]);
            this.proposedToRemountToRoot = true;
        }

        this.reindexNeeded = true;
    }

    rotateMultiItemEditBox(x, y, mx, my, event) {
        const center = myMath.worldPointInArea(this.multiItemEditBoxOriginalArea.w/2, this.multiItemEditBoxOriginalArea.h/2, this.multiItemEditBoxOriginalArea)
        const angleDegrees = this.calculateRotatedAngle(x, y, this.originalPoint.x, this.originalPoint.y, center.x, center.y, event);
        const angle = angleDegrees * Math.PI / 180;

        const np = this.calculateRotationOffsetForSameCenter(this.multiItemEditBoxOriginalArea.x, this.multiItemEditBoxOriginalArea.y, center.x, center.y, angle);
        this.multiItemEditBox.area.r = this.round(this.multiItemEditBoxOriginalArea.r + angleDegrees);
        this.multiItemEditBox.area.x = this.round(np.x);
        this.multiItemEditBox.area.y = this.round(np.y);

        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, IS_SOFT, {
            id: this.modificationContextId,
            moved: false,
            rotated: true,
            resized: false
        }, this.getUpdatePrecision());

        this.reindexNeeded = true;
        log.info('Rotated multi item edit box', this.multiItemEditBox);
    }

    dragMultiItemEditBoxByDragger(x, y, draggerEdges, event) {
        let nx = this.multiItemEditBox.area.x,
            ny = this.multiItemEditBox.area.y,
            nw = this.multiItemEditBox.area.w,
            nh = this.multiItemEditBox.area.h,
            dx = x - this.originalPoint.x,
            dy = y - this.originalPoint.y;

        let p0 = myMath.worldPointInArea(0, 0, this.multiItemEditBox.area);
        let p1 = myMath.worldPointInArea(1, 0, this.multiItemEditBox.area);
        let p2 = myMath.worldPointInArea(0, 1, this.multiItemEditBox.area);

        const rightVector = {x: p1.x - p0.x, y: p1.y - p0.y};
        const bottomVector = {x: p2.x - p0.x, y: p2.y - p0.y};

        StoreUtils.clearItemSnappers(this.store);
        const snapEdge = (x1, y1, x2, y2, vector) => {
            const p0 = myMath.worldPointInArea(x1, y1, this.multiItemEditBoxOriginalArea);
            const p1 = myMath.worldPointInArea(x2, y2, this.multiItemEditBoxOriginalArea);
            let snappingType = null;
            if (myMath.sameFloatingValue(p0.x, p1.x)) {
                snappingType = 'vertical';
            } else if (myMath.sameFloatingValue(p0.y, p1.y)) {
                snappingType = 'horizontal';
            }

            let projection = dx * vector.x + dy * vector.y;
            if (snappingType) {
                const snappingPoints = {};
                snappingPoints[snappingType] = [p0];

                // calculating the real absolute dx and dy of points
                const newOffset = this.snapper.snapPoints(snappingPoints, this.multiItemEditBox.itemIds, projection * vector.x, projection * vector.y);
                projection = newOffset.dx * vector.x + newOffset.dy * vector.y;
            }
            return projection
        };


        // dirty hack as dragging of top left edge is special
        if (draggerEdges.length === 2 && draggerEdges[0] === 'top' && draggerEdges[1] === 'left') {
            const projectionBottom = snapEdge(0, 0, this.multiItemEditBoxOriginalArea.w, 0, bottomVector);
            const projectionRight = snapEdge(0, 0, 0, this.multiItemEditBoxOriginalArea.h, rightVector);

            nx = this.multiItemEditBoxOriginalArea.x + projectionRight * rightVector.x + projectionBottom * bottomVector.x;
            ny = this.multiItemEditBoxOriginalArea.y + projectionRight * rightVector.y + projectionBottom * bottomVector.y;
            nw = this.multiItemEditBoxOriginalArea.w - projectionRight;
            nh = this.multiItemEditBoxOriginalArea.h - projectionBottom;
            if (nh < 0) {
                nh = 0;
            }
        } else {
            forEach(draggerEdges, edge => {
                if (edge === 'top') {
                    const projection = snapEdge(0, 0, this.multiItemEditBoxOriginalArea.w, 0, bottomVector);
                    nx = this.multiItemEditBoxOriginalArea.x + projection * bottomVector.x;
                    ny = this.multiItemEditBoxOriginalArea.y + projection * bottomVector.y;
                    nh = this.multiItemEditBoxOriginalArea.h - projection;
                    if (nh < 0) {
                        nh = 0;
                    }
                } else if (edge === 'bottom') {
                    const projection = snapEdge(0, this.multiItemEditBoxOriginalArea.h, this.multiItemEditBoxOriginalArea.w, this.multiItemEditBoxOriginalArea.h, bottomVector);
                    nh = this.multiItemEditBoxOriginalArea.h + projection;
                    if (nh < 0) {
                        nh = 0;
                    }
                } else if (edge === 'left') {
                    const projection = snapEdge(0, 0, 0, this.multiItemEditBoxOriginalArea.h, rightVector);
                    nx = this.multiItemEditBoxOriginalArea.x + projection * rightVector.x;
                    ny = this.multiItemEditBoxOriginalArea.y + projection * rightVector.y;
                    nw = this.multiItemEditBoxOriginalArea.w - projection;
                    if (nw < 0) {
                        nw = 0;
                    }
                } else if (edge === 'right') {
                    const projection = snapEdge(this.multiItemEditBoxOriginalArea.w, 0, this.multiItemEditBoxOriginalArea.w, this.multiItemEditBoxOriginalArea.h, rightVector);
                    nw = this.multiItemEditBoxOriginalArea.w + projection;
                    if (nw < 0) {
                        nw = 0;
                    }
                }
            });
        }
        this.multiItemEditBox.area.x = nx;
        this.multiItemEditBox.area.y = ny;
        this.multiItemEditBox.area.w = nw;
        this.multiItemEditBox.area.h = nh;
        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, IS_SOFT, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        }, this.getUpdatePrecision());

        if (this.multiItemEditBox.items.length === 1) {
            // perhaps this should be optimized to only update the control points so it doesn't re-create the same array of control points
            // But setting it from scratch is safer
            StoreUtils.setItemControlPoints(this.store, this.multiItemEditBox.items[0]);
        }
        this.reindexNeeded = true;
        log.info('Resized multi item edit box', this.multiItemEditBox);
    }

    handleControlPointDrag(x, y) {
        StoreUtils.clearItemSnappers(this.store);

        const controlPoint = this.findItemControlPoint(this.controlPoint.id);
        if (controlPoint) {
            if (this.sourceItem.shape === 'connector' && (controlPoint.isEdgeStart || controlPoint.isEdgeEnd)) {
                this.handleCurveConnectorEdgeControlPointDrag(x, y, controlPoint);
            } else {
                const localPoint  = this.schemeContainer.localPointOnItem(this.originalPoint.x, this.originalPoint.y, this.sourceItem);
                const localPoint2 = this.schemeContainer.localPointOnItem(x, y, this.sourceItem);
                const dx          = localPoint2.x - localPoint.x;
                const dy          = localPoint2.y - localPoint.y;

                const shape = Shape.find(this.sourceItem.shape);
                if (this.sourceItem.shape === 'connector') {
                    this.handleConnectorPointDrag(this.sourceItem, this.controlPoint.id, dx, dy, this.controlPoint.originalX, this.controlPoint.originalY);
                } else {
                    shape.controlPoints.handleDrag(this.sourceItem, this.controlPoint.id, this.controlPoint.originalX, this.controlPoint.originalY, dx, dy, this.snapper, this.schemeContainer);
                }
                
                this.eventBus.emitItemChanged(this.sourceItem.id);
                this.schemeContainer.readjustItem(this.sourceItem.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());

                // updating all control points as they might affect one another
                StoreUtils.setItemControlPoints(this.store, this.sourceItem);
                this.reindexNeeded = true;
                this.lastModifiedItem = this.sourceItem;
            }
        }
    }

    handleConnectorPointDrag(item, pointId, dx, dy, originalX, originalY) {
        const point = item.shapeProps.points[pointId];
        if (point) {
            const worldPoint = this.schemeContainer.worldPointOnItem(originalX + dx, originalY + dy, item);

            const newOffset = this.snapPoints({
                vertical: [worldPoint],
                horizontal: [worldPoint],
            }, new Set(), 0, 0);

            const localPoint = this.schemeContainer.localPointOnItem(worldPoint.x + newOffset.dx, worldPoint.y + newOffset.dy, item);
            point.x = localPoint.x;
            point.y = localPoint.y;

            // since this function can only be called if the connector is selected
            // we should update connector path so that it can be rendered in multi item edit box
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find(item.shape).computeOutline(item));
        }
    }

    handleCurveConnectorEdgeControlPointDrag(x, y, controlPoint) {
        // this function implements the same logic as in StateEditCurve.handleEdgeCurvePointDrag
        // but it also modifies a control point in the end
        // so it is not that easy to share code

        let distanceThreshold = 0;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = 20 / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;

        const curvePoint = this.sourceItem.shapeProps.points[this.controlPoint.id];
        if (!curvePoint) {
            return;
        }
        
        let excludedIds = null
        if (this.multiItemEditBox) {
            excludedIds = this.multiItemEditBox.itemIds;
        } else {
            excludedIds = new Set();
            excludedIds.add(this.sourceItem.id);
        }

        const snappedOffset = this.snapper.snapPoints({
            horizontal: [{x, y}],
            vertical: [{x, y}],
        }, excludedIds, 0, 0);

        const closestPointToItem = this.schemeContainer.findClosestPointToItems(x + snappedOffset.dx, y + snappedOffset.dy, distanceThreshold, this.sourceItem.id, includeOnlyVisibleItems);

        // Not letting connectors attach to themselves
        if (closestPointToItem && closestPointToItem.itemId !== this.sourceItem.id) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.sourceItem);

            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;

            this.eventBus.emitItemsHighlighted([closestPointToItem.itemId], {highlightPins: true});
            if (controlPoint.isEdgeStart) {
                this.sourceItem.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                this.sourceItem.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
            } else {
                this.sourceItem.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                this.sourceItem.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
            }
        } else {
            const localPoint = this.schemeContainer.localPointOnItem(x + snappedOffset.dx, y + snappedOffset.dy, this.sourceItem);

            curvePoint.x = localPoint.x;
            curvePoint.y = localPoint.y;

            // nothing to attach to so reseting highlights in case it was set previously
            this.eventBus.emitItemsHighlighted([]);
            if (controlPoint.isEdgeStart) {
                this.sourceItem.shapeProps.sourceItem = null;
                this.sourceItem.shapeProps.sourceItemPosition = 0;
            } else {
                this.sourceItem.shapeProps.destinationItem = null;
                this.sourceItem.shapeProps.destinationItemPosition = 0;
            }
        }

        const shape = Shape.find(this.sourceItem.shape);
        StoreUtils.setItemControlPoints(this.store, this.sourceItem);
        
        this.eventBus.emitItemChanged(this.sourceItem.id);
        this.schemeContainer.readjustItem(this.sourceItem.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.reindexNeeded = true;
        this.lastModifiedItem = this.sourceItem;

        // since this function can only be called if the connector is selected
        // we should update connector path so that it can be rendered in multi item edit box
        StoreUtils.setSelectedConnectorPath(this.store, shape.computeOutline(this.sourceItem));
    }

    initMulitSelectBox(x, y, mx, my) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.originalPoint.mx = mx;
        this.originalPoint.my = my;
        this.multiSelectBox = {x, y, w: 0, h: 0};
    }

    dragItemsByKeyboard(dx, dy) {
        // don't need to drag by keyboard if already started dragging by mouse
        if (!this.startedDragging) {
            const box = this.schemeContainer.multiItemEditBox;
            if (box && !box.locked) {
                box.area.x += dx;
                box.area.y += dy;
                this.schemeContainer.updateMultiItemEditBoxItems(box, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());
                this.schemeContainer.updateMultiItemEditBox();
            }
        }
    }

    /**
     * Calculates the angle produced by a user when rotating around the center
     * @param {Number} x - current mouse x
     * @param {Number} y - current mouse y
     * @param {Number} originalX - original mouse x where user has initiated a rotation
     * @param {Number} originalY - original mouse x where user has initiated a rotation
     * @param {Number} centerX - x point around which it should be rotating
     * @param {Number} centerY - y point around which it should be rotating
     * @param {MouseEvent} event - mouse event
     * @returns {Number} - angle in degrees (0 - 360)
     */
    calculateRotatedAngle(x, y, originalX, originalY, centerX, centerY, event) {
        const v1x = originalX - centerX;
        const v1y = originalY - centerY;
        const v2x = x - centerX;
        const v2y = y - centerY;
        const v1SquareLength = v1x * v1x + v1y * v1y;
        const v2SquareLength = v2x * v2x + v2y * v2y;
        
        if (v1SquareLength < 0.0001 || v2SquareLength < 0.0001) {
            return;
        }

        // cross production of two vectors to figure out the direction (clock-wise or counter clock-wise) of rotation
        const direction = (v1x * v2y - v2x * v1y >= 0) ? 1: -1; 

        const cosa = (v1x * v2x + v1y * v2y)/(Math.sqrt(v1SquareLength) * Math.sqrt(v2SquareLength));
        let angle = direction * Math.acos(cosa);
        let angleDegrees = angle * 180 / Math.PI;
        
        if (isNaN(angleDegrees)) {
            return 0;
        }
        if (!isMultiSelectKey(event)) {
            angleDegrees = Math.round(angleDegrees/ 5) * 5;
        }

        return angleDegrees;
    }

    /**
     * Calculates new offset for a box after its rotation around its own center so that its center would stay the same
     * @param {Number} originalX - x of top left corner of a box
     * @param {Number} originalY - y of top left corner of a box
     * @param {Number} centerX - original center of the box
     * @param {Number} centerY - original center of the box
     * @param {Number} angle - rotated angle in radians
     * @returns {Point} point with {x, y} of the new top left corner position
     */
    calculateRotationOffsetForSameCenter(originalX, originalY, centerX, centerY, angle) {
        const ax = originalX - centerX;
        const ay = originalY - centerY;
        const cosa = Math.cos(angle);
        const sina = Math.sin(angle);
        const bx = ax * cosa - ay * sina;
        const by = ax * sina + ay * cosa;
        return {
            x: centerX + bx,
            y: centerY + by
        };
    }

    deselectAllItems() {
        this.schemeContainer.deselectAllItems();
        forEach(this.schemeContainer.selectedItems, item => this.eventBus.emitItemDeselected(item.id));
    }

    emitEventsForAllSelectedItems() {
        forEach(this.schemeContainer.selectedItems, item => this.eventBus.emitItemSelected(item.id));
    }

    dragScreen(x, y) {
        this.schemeContainer.screenTransform.x = Math.floor(this.originalOffset.x + x - this.originalPoint.x);
        this.schemeContainer.screenTransform.y = Math.floor(this.originalOffset.y + y - this.originalPoint.y);
    }

    /**
     * Creates a lines for box which will be used for snapping when draging this box.
     * In case the box is rotated it will generate vertical and horizontal lines that are surrounding the box from the outside
     * @param {*} box
     * @returns {SnappingPoints} {vertical: [], horizontal: []}
     */
    generateBoxPointsForSnapping(box) {
        const localPoints = [
            [0, 0],
            [box.area.w, 0],
            [box.area.w, box.area.h],
            [0, box.area.h],
        ];

        const minPoint = {x: 0, y: 0};
        const maxPoint = {x: 0, y: 0};

        forEach(localPoints, (localPoint, i) => {
            const worldPoint = myMath.worldPointInArea(localPoint[0], localPoint[1], box.area);
            if (i === 0) {
                minPoint.x = worldPoint.x;
                minPoint.y = worldPoint.y;
                maxPoint.x = worldPoint.x;
                maxPoint.y = worldPoint.y;
            } else {
                minPoint.x = Math.min(minPoint.x, worldPoint.x);
                minPoint.y = Math.min(minPoint.y, worldPoint.y);
                maxPoint.x = Math.max(maxPoint.x, worldPoint.x);
                maxPoint.y = Math.max(maxPoint.y, worldPoint.y);
            }
        });

        return {
            vertical: [
                {x: minPoint.x, y: minPoint.y}, //top edge
                {x: maxPoint.x, y: maxPoint.y}, //bottom edge
            ],
            horizontal: [
                {x: minPoint.x, y: minPoint.y}, //left edge
                {x: maxPoint.x, y: maxPoint.y}, //right edge
            ]
        };
    }

    remountItems(items, parentItem) {
        const processedItemIds = new Set();
        forEach(items, item => {
            const parentWasAlreadyRemounted = (item.meta && item.meta.ancestorIds && find(item.meta.ancestorIds, id => processedItemIds.has(id)));
            if (parentWasAlreadyRemounted) {
                return;
            }
            processedItemIds.add(item.id);
            if (parentItem) {
                if (item.meta && item.meta.parentId !== parentItem.id) {
                    this.schemeContainer.remountItemInsideOtherItem(item.id, parentItem.id);
                }
            } else {
                // remount it to root only in case it has a parent
                if (item.meta && item.meta.parentId && item.meta.ancestorIds) {
                    const rootParent = this.schemeContainer.findItemById(item.meta.ancestorIds[0]);
                    
                    if (rootParent) {
                        this.schemeContainer.remountItemAfterOtherItem(item.id, rootParent.id);
                    } else {
                        this.schemeContainer.remountItemToRoot(item.id);
                    }
                }
            }
        });
    }
}
