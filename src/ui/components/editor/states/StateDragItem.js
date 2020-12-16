/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import Shape from '../items/shapes/Shape';
import EventBus from '../EventBus.js';
import forEach from 'lodash/forEach';
import myMath from '../../../myMath';
import {Logger} from '../../../logger';
import '../../../typedef';
import shortid from 'shortid';
import { Keys } from '../../../events';

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
        this.startedDragging = true;
        // used for item control points dragging
        this.sourceItem = null;
        this.controlPoint = null; // stores coords for item control point

        this.multiSelectBox = null;

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

        this.snapper = {
            snapX: (x) => this.snapX(x),
            snapY: (y) => this.snapY(y),
        };

        // used in order to track the uniqueness of modification context from mouse down to mouse up events
        this.modificationContextId = null;
    }

    reset() {
        this.updateCursor('default');
        this.reindexNeeded = false;
        this.startedDragging = false;
        this.draggerEdges = null;
        this.isRotating = false;
        this.sourceItem = null;
        this.controlPoint = null;
        this.multiSelectBox = null;
        this.wasMouseMoved = false;
        this.multiItemEditBox = null;
        this.multiItemEditBoxOriginalArea = null;
        this.modificationContextId = null;
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
            this.updateCursor('grab');
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
        this.startedDragging = true;
        this.wasMouseMoved = false;
        this.reindexNeeded = false;
        this.lastDraggedItem = null;
    }

    initDraggingMultiItemBox(multiItemEditBox, x, y, mx, my) {
        this.initDragging(x, y, mx, my);
        this.multiItemEditBox = multiItemEditBox;
        this.initOriginalAreasForMultiItemEditBox(multiItemEditBox);
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
        this.multiItemEditBoxOriginalArea = {
            x: multiItemEditBox.area.x,
            y: multiItemEditBox.area.y,
            w: multiItemEditBox.area.w,
            h: multiItemEditBox.area.h,
            r: multiItemEditBox.area.r
        };
    }

    initScreenDrag(mx, my) {
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
            this.initDraggingForControlPoint(object.controlPoint, x, y);
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

    initDraggingForControlPoint(controlPointDef, x, y) {
        const controlPoint = controlPointDef.item.meta.controlPoints[controlPointDef.pointId];
        if (controlPoint) {
            this.reset();
            this.originalPoint.x = x;
            this.originalPoint.y = y;
            this.startedDragging = true;
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
        
        if (this.schemeContainer.multiItemEditBoxes.relative && this.schemeContainer.multiItemEditBoxes.relative.itemData[item.id]) {
            this.initDraggingMultiItemBox(this.schemeContainer.multiItemEditBoxes.relative, x, y);
        }
        if (this.schemeContainer.multiItemEditBoxes.viewport && this.schemeContainer.multiItemEditBoxes.viewport.itemData[item.id]) {
            this.initDraggingMultiItemBox(this.schemeContainer.multiItemEditBoxes.viewport, x, y);
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
            } else if (this.multiItemEditBox) {
                // in case only single item is selected and it is locked - we don't want to be able to do anything with edit box
                if (this.multiItemEditBox.items.length > 1 || !this.multiItemEditBox.items[0].locked) {
                    if (this.isRotating) {
                        this.rotateMultiItemEditBox(x, y, mx, my, event);
                    } else if (this.draggerEdges) {
                        this.dragMultiItemEditBoxByDragger(x, y, this.draggerEdges, event);
                    } else {
                        this.dragMultiItemEditBox(x, y);
                    }
                }
            } else {
                if (this.controlPoint) {
                    this.handleControlPointDrag(x, y);
                }
            }
        } else if (this.multiSelectBox) {
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
            this.eventBus.$emit(EventBus.MULTI_SELECT_BOX_APPEARED, this.multiSelectBox);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        // doing it just in case the highlighting was previously set
        this.eventBus.emitItemsHighlighted([]);

        if (this.multiSelectBox) {
            if (!isMultiSelectKey(event)) {
                this.deselectAllItems();
            }
            this.selectByBoundaryBox(this.multiSelectBox, mx, my);
            this.emitEventsForAllSelectedItems();
            this.eventBus.$emit(EventBus.MULTI_SELECT_BOX_DISAPPEARED);

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
            if (this.lastDraggedItem) {
                // Now doing hard readjustment (this is needed for curve items so that they can update their area)
                this.schemeContainer.readjustItem(this.lastDraggedItem.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);

                if (this.lastDraggedItem.shape === 'curve' && this.controlPoint) {
                    this.schemeContainer.updateAllMultiItemEditBoxes();
                }
            }
            this.schemeContainer.reindexItems();
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
            x: this.originalPoint.mx - this.viewportCorrectionLeft,
            y: this.originalPoint.my - this.viewportCorrectionTop,
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

                if (item.area.type === 'viewport') {
                    isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, viewportBox);
                } else {
                    isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box);
                }
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
            } else {
                this.findTextSlotAndEmitInPlaceEdit(object.item, x, y)
            }
        } else if (object.itemTextElement) { 
            this.findTextSlotAndEmitInPlaceEdit(object.itemTextElement.item, x, y)
        } else if (object.type === 'void') {
            this.eventBus.$emit(EventBus.VOID_DOUBLE_CLICKED, x, y, mx, my);
        }
    }

    findTextSlotAndEmitInPlaceEdit(item, x, y) {
        const textSlot = this.findItemTextSlotByPoint(item, x, y);
        if (!textSlot) {
            return;
        }
        this.eventBus.emitItemTextSlotEditTriggered(item, textSlot.name, textSlot.area);
    }

    findItemTextSlotByPoint(item, x, y) {
        const localPoint = this.schemeContainer.localPointOnItem(x, y, item);
        const shape = Shape.make(item.shape);
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
        
        const snappedBoxX = this.snapper.snapX(this.multiItemEditBoxOriginalArea.x + preSnapDx);
        const snappedBoxY = this.snapper.snapY(this.multiItemEditBoxOriginalArea.y + preSnapDy);

        const dx = snappedBoxX - this.multiItemEditBoxOriginalArea.x;
        const dy = snappedBoxY - this.multiItemEditBoxOriginalArea.y;


        this.multiItemEditBox.area.x = this.multiItemEditBoxOriginalArea.x + dx;
        this.multiItemEditBox.area.y = this.multiItemEditBoxOriginalArea.y + dy;
        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, ITEM_MODIFICATION_CONTEXT_MOVED);
        this.reindexNeeded = true;
    }

    rotateMultiItemEditBox(x, y, mx, my, event) {
        if (Math.abs(this.multiItemEditBox.area.w) < 0.00001 || Math.abs(this.multiItemEditBox.area.h) < 0.00001) {
            // There might be too many errors when calculating displacement of items after rotation of such a thin box
            // so it is better to skip everything
            return;
        }

        const center = myMath.worldPointInArea(this.multiItemEditBoxOriginalArea.w/2, this.multiItemEditBoxOriginalArea.h/2, this.multiItemEditBoxOriginalArea)
        let angleDegrees = 0;
        if (this.multiItemEditBox.transformType === 'viewport') {
            angleDegrees = this.calculateRotatedAngle(mx - this.viewportCorrectionLeft, my - this.viewportCorrectionTop, this.originalPoint.mx - this.viewportCorrectionLeft, this.originalPoint.my - this.viewportCorrectionTop, center.x, center.y, event);
        } else {
            angleDegrees = this.calculateRotatedAngle(x, y, this.originalPoint.x, this.originalPoint.y, center.x, center.y, event);
        }
        const angle = angleDegrees * Math.PI / 180;

        const np = this.calculateRotationOffsetForSameCenter(this.multiItemEditBoxOriginalArea.x, this.multiItemEditBoxOriginalArea.y, center.x, center.y, angle);
        this.multiItemEditBox.area.r = this.multiItemEditBoxOriginalArea.r + angleDegrees;
        this.multiItemEditBox.area.x = np.x;
        this.multiItemEditBox.area.y = np.y;

        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, {
            id: this.modificationContextId,
            moved: false,
            rotated: true,
            resized: false
        });
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

        // dirty hack as dragging of top left edge is special
        if (draggerEdges.length === 2 && draggerEdges[0] === 'top' && draggerEdges[1] === 'left') {
            const projectionBottom = this.snapX(dx * bottomVector.x + dy * bottomVector.y);
            const projectionRight = this.snapX(dx * rightVector.x + dy * rightVector.y);
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
                    const projection = this.snapX(dx * bottomVector.x + dy * bottomVector.y);
                    nx = this.multiItemEditBoxOriginalArea.x + projection * bottomVector.x;
                    ny = this.multiItemEditBoxOriginalArea.y + projection * bottomVector.y;
                    nh = this.multiItemEditBoxOriginalArea.h - projection;
                    if (nh < 0) {
                        nh = 0;
                    }
                } else if (edge === 'bottom') {
                    const projection = this.snapX(dx * bottomVector.x + dy * bottomVector.y);
                    nh = this.multiItemEditBoxOriginalArea.h + projection;
                    if (nh < 0) {
                        nh = 0;
                    }
                } else if (edge === 'left') {
                    const projection = this.snapX(dx * rightVector.x + dy * rightVector.y);
                    nx = this.multiItemEditBoxOriginalArea.x + projection * rightVector.x;
                    ny = this.multiItemEditBoxOriginalArea.y + projection * rightVector.y;
                    nw = this.multiItemEditBoxOriginalArea.w - projection;
                    if (nw < 0) {
                        nw = 0;
                    }
                } else if (edge === 'right') {
                    const projection = this.snapX(dx * rightVector.x + dy * rightVector.y);
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
        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        });
        this.reindexNeeded = true;
        log.info('Resized multi item edit box', this.multiItemEditBox);
    }

    handleControlPointDrag(x, y) {
        const controlPoint = this.sourceItem.meta.controlPoints[this.controlPoint.id];
        if (controlPoint) {
            if (this.sourceItem.shape === 'curve' && (controlPoint.isEdgeStart || controlPoint.isEdgeEnd)) {
                this.handleCurveEdgeControlPointDrag(x, y, controlPoint);
            } else {
                const localPoint = this.schemeContainer.localPointOnItem(this.originalPoint.x, this.originalPoint.y, this.sourceItem);
                const localPoint2 = this.schemeContainer.localPointOnItem(x, y, this.sourceItem);
                const dx = localPoint2.x - localPoint.x, dy = localPoint2.y - localPoint.y;

                const shape = Shape.find(this.sourceItem.shape);
                shape.controlPoints.handleDrag(this.sourceItem, this.controlPoint.id, this.controlPoint.originalX, this.controlPoint.originalY, dx, dy, this.snapper, this.schemeContainer);
                const newPoint = shape.controlPoints.make(this.sourceItem, this.controlPoint.id);
                this.sourceItem.meta.controlPoints[this.controlPoint.id].x = newPoint.x;
                this.sourceItem.meta.controlPoints[this.controlPoint.id].y = newPoint.y;
                this.eventBus.emitItemChanged(this.sourceItem.id);
                this.schemeContainer.readjustItem(this.sourceItem.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
                this.reindexNeeded = true;
                this.lastDraggedItem = this.sourceItem;
            }
        }
    }

    handleCurveEdgeControlPointDrag(x, y, controlPoint) {
        // this function implement the same logic as in StateEditCurve.handleEdgeCurvePointDrag
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

        let closestPointToItem = null;
        if (this.store.state.curveEditing.autoAttachEnabled) {
            closestPointToItem = this.schemeContainer.findClosestPointToItems(this.snapper.snapX(x), this.snapper.snapY(y), distanceThreshold, this.sourceItem.id, includeOnlyVisibleItems, this.sourceItem.area.type);
        }
        
        if (closestPointToItem) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.sourceItem);

            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;

            this.eventBus.emitItemsHighlighted([closestPointToItem.itemId]);
            if (controlPoint.isEdgeStart) {
                this.sourceItem.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                this.sourceItem.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
            } else {
                this.sourceItem.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                this.sourceItem.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
            }
        } else {
            const localPoint = this.schemeContainer.localPointOnItem(this.snapper.snapX(x), this.snapper.snapY(y), this.sourceItem);

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
        const newPoint = shape.controlPoints.make(this.sourceItem, this.controlPoint.id);
        this.sourceItem.meta.controlPoints[this.controlPoint.id].x = newPoint.x;
        this.sourceItem.meta.controlPoints[this.controlPoint.id].y = newPoint.y;
        this.eventBus.emitItemChanged(this.sourceItem.id);
        this.schemeContainer.readjustItem(this.sourceItem.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        this.reindexNeeded = true;
        this.lastDraggedItem = this.sourceItem;
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
            forEach(this.schemeContainer.multiItemEditBoxes, multiItemEditBox => {
                if (multiItemEditBox && (multiItemEditBox.items.length > 1 || !multiItemEditBox.items[0].locked)) {
                    multiItemEditBox.area.x += dx;
                    multiItemEditBox.area.y += dy;
                    this.schemeContainer.updateMultiItemEditBoxItems(multiItemEditBox, ITEM_MODIFICATION_CONTEXT_MOVED);
                }
            });
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

}
