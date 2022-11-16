/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import State, { DragScreenState, MultiSelectState, SubState } from './State.js';
import Shape from '../items/shapes/Shape';
import EventBus from '../EventBus.js';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import myMath from '../../../myMath';
import {Logger} from '../../../logger';
import '../../../typedef';
import shortid from 'shortid';
import { Keys } from '../../../events';
import StoreUtils from '../../../store/StoreUtils.js';
import utils from '../../../utils.js';
import { worldScalingVectorOnItem } from '../../../scheme/SchemeContainer.js';

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


function updateMultiItemEditBoxWorldPivot(multiItemEditBox) {
    if (!multiItemEditBox) {
        return;
    }

    multiItemEditBox.worldPivotPoint = myMath.worldPointInArea(
        multiItemEditBox.pivotPoint.x * multiItemEditBox.area.w,
        multiItemEditBox.pivotPoint.y * multiItemEditBox.area.h,
        multiItemEditBox.area
    );
}

class EditBoxState extends SubState {
    constructor(parentState, name, multiItemEditBox, x, y, mx, my) {
        super(parentState, name);
        this.originalPoint = { x, y, mx, my };
        this.schemeContainer = parentState.schemeContainer;
        this.multiItemEditBox = multiItemEditBox;
        this.multiItemEditBoxOriginalArea = utils.clone(multiItemEditBox.area);
        this.boxPointsForSnapping = this.generateBoxPointsForSnapping(multiItemEditBox);
        this.modificationContextId = shortid.generate();
    }

    mouseUp(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);
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

            if (item.shape === 'path' || item.shape === 'connector') {
                shouldUpdateMultiItemEditBox = true;
            }
        });
        if (shouldUpdateMultiItemEditBox) {
            this.schemeContainer.updateMultiItemEditBox();
        }
        this.schemeContainer.reindexItems();

        this.listener.onSchemeChangeCommitted();
        this.migrateToPreviousSubState();
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
}

class DragControlPointState extends SubState {
    constructor(parentState, item, pointId, x, y, mx, my) {
        super(parentState, 'resize-edit-box');
        this.item = item;
        this.pointId = pointId;
        this.originalPoint = {x, y, mx, my};
        this.schemeContainer = parentState.schemeContainer;
        this.controlPoint = this.findItemControlPoint(this.pointId);
        if (this.controlPoint) {
            this.controlPointOriginalX = this.controlPoint.x;
            this.controlPointOriginalY = this.controlPoint.y;
        } else {
            this.migrateToPreviousSubState();
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }
        this.handleControlPointDrag(x, y);
    }

    mouseUp(x, y, mx, my, object, event) {
        this.listener.onSchemeChangeCommitted();
        this.eventBus.emitItemsHighlighted([]);
        this.migrateToPreviousSubState();
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

    handleControlPointDrag(x, y) {
        StoreUtils.clearItemSnappers(this.store);

        if (this.controlPoint) {
            if (this.item.shape === 'connector' && (this.controlPoint.isEdgeStart || this.controlPoint.isEdgeEnd)) {
                this.handleCurveConnectorEdgeControlPointDrag(x, y, this.controlPoint);
            } else {
                const localPoint  = this.schemeContainer.localPointOnItem(this.originalPoint.x, this.originalPoint.y, this.item);
                const localPoint2 = this.schemeContainer.localPointOnItem(x, y, this.item);
                const dx          = localPoint2.x - localPoint.x;
                const dy          = localPoint2.y - localPoint.y;

                const shape = Shape.find(this.item.shape);

                // using scaling vector as previously all control points were already corrected by scaling effect relatively to world (in StoreUtils)
                const scalingVector = worldScalingVectorOnItem(this.item);
                const svx = Math.max(0.0000001, scalingVector.x);
                const svy = Math.max(0.0000001, scalingVector.y);

                if (this.item.shape === 'connector') {
                    this.handleConnectorPointDrag(this.pointId, dx, dy, this.controlPointOriginalX / svx, this.controlPointOriginalY / svy);
                } else {
                    shape.controlPoints.handleDrag(this.item, this.pointId, this.controlPointOriginalX / svx, this.controlPointOriginalY / svy, dx, dy, this, this.schemeContainer);
                }

                this.listener.onItemChanged(this.item.id);
                this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());

                // updating all control points as they might affect one another
                StoreUtils.setItemControlPoints(this.store, this.item);
                this.reindexNeeded = true;
                this.lastModifiedItem = this.item;
            }
        }
    }

    handleConnectorPointDrag(pointId, dx, dy, originalX, originalY) {
        const point = this.item.shapeProps.points[pointId];
        if (point) {
            const worldPoint = this.schemeContainer.worldPointOnItem(originalX + dx, originalY + dy, this.item);

            const newOffset = this.snapPoints({
                vertical: [worldPoint],
                horizontal: [worldPoint],
            }, new Set(), 0, 0);

            const localPoint = this.schemeContainer.localPointOnItem(worldPoint.x + newOffset.dx, worldPoint.y + newOffset.dy, this.item);
            point.x = localPoint.x;
            point.y = localPoint.y;

            // since this function can only be called if the connector is selected
            // we should update connector path so that it can be rendered in multi item edit box
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find(this.item.shape).computeOutline(this.item));
        }
    }

    handleCurveConnectorEdgeControlPointDrag(x, y, controlPoint) {
        // this function implements the same logic as in StateEditPath.handleEdgeCurvePointDrag
        // but it also modifies a control point in the end
        // so it is not that easy to share code

        let distanceThreshold = 10;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = distanceThreshold / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;

        const curvePoint = this.item.shapeProps.points[this.pointId];
        if (!curvePoint) {
            return;
        }

        let excludedIds = null
        if (this.multiItemEditBox) {
            excludedIds = this.multiItemEditBox.itemIds;
        } else {
            excludedIds = new Set();
            excludedIds.add(this.item.id);
        }

        const snappedOffset = this.snapPoints({
            horizontal: [{x, y}],
            vertical: [{x, y}],
        }, excludedIds, 0, 0);

        const closestPointToItem = this.schemeContainer.findClosestPointToItems(x + snappedOffset.dx, y + snappedOffset.dy, distanceThreshold, this.item.id, includeOnlyVisibleItems);

        // Not letting connectors attach to themselves
        if (closestPointToItem && closestPointToItem.itemId !== this.item.id) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.item);

            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;

            this.eventBus.emitItemsHighlighted([closestPointToItem.itemId], {highlightPins: true});
            if (controlPoint.isEdgeStart) {
                this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
            } else {
                this.item.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                this.item.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
            }
        } else {
            const localPoint = this.schemeContainer.localPointOnItem(x + snappedOffset.dx, y + snappedOffset.dy, this.item);

            curvePoint.x = localPoint.x;
            curvePoint.y = localPoint.y;

            // nothing to attach to so reseting highlights in case it was set previously
            this.eventBus.emitItemsHighlighted([]);
            if (controlPoint.isEdgeStart) {
                this.item.shapeProps.sourceItem = null;
                this.item.shapeProps.sourceItemPosition = 0;
            } else {
                this.item.shapeProps.destinationItem = null;
                this.item.shapeProps.destinationItemPosition = 0;
            }
        }

        const shape = Shape.find(this.item.shape);
        StoreUtils.setItemControlPoints(this.store, this.item);

        this.listener.onItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.reindexNeeded = true;
        this.lastModifiedItem = this.item;

        // since this function can only be called if the connector is selected
        // we should update connector path so that it can be rendered in multi item edit box
        StoreUtils.setSelectedConnectorPath(this.store, shape.computeOutline(this.item));
    }
}

class DragPivotEditBoxState extends EditBoxState {
    constructor(parentState, multiItemEditBox, x, y, mx, my) {
        super(parentState, 'drag-pivot-edit-box', multiItemEditBox, x, y, mx, my);
        this.oldPivotPoint = {
            x: multiItemEditBox.pivotPoint.x,
            y: multiItemEditBox.pivotPoint.y,
        };
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (!this.multiItemEditBox) {
            return;
        }

        if (this.multiItemEditBox.area.w === 0 || this.multiItemEditBox.area.h === 0) {
            return;
        }
        const localPoint = myMath.localPointInArea(x, y, this.multiItemEditBox.area);
        const localOriginalPoint = myMath.localPointInArea(this.originalPoint.x, this.originalPoint.y, this.multiItemEditBox.area);

        this.multiItemEditBox.pivotPoint.x = myMath.clamp(this.oldPivotPoint.x + (localPoint.x - localOriginalPoint.x) / this.multiItemEditBox.area.w, 0, 1);
        this.multiItemEditBox.pivotPoint.y = myMath.clamp(this.oldPivotPoint.y + (localPoint.y - localOriginalPoint.y) / this.multiItemEditBox.area.h, 0, 1);

        updateMultiItemEditBoxWorldPivot(this.multiItemEditBox);
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.multiItemEditBox.items.length === 1) {
            this.multiItemEditBox.items[0].area.px = this.multiItemEditBox.pivotPoint.x;
            this.multiItemEditBox.items[0].area.py = this.multiItemEditBox.pivotPoint.y;
            this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());
        }

        super.mouseUp(x, y, mx, my, object, event);
    }
}

class ResizeEditBoxState extends EditBoxState {
    constructor(parentState, multiItemEditBox, draggerEdges, x, y, mx, my) {
        super(parentState, 'resize-edit-box', multiItemEditBox, x, y, mx, my);
        this.draggerEdges = draggerEdges
    }

    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        dragMultiItemEditBoxByDragger(
            this.multiItemEditBox,
            this.multiItemEditBoxOriginalArea,
            this.originalPoint,
            this.store,
            this,
            x, y, this.draggerEdges);

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
        updateMultiItemEditBoxWorldPivot(this.multiItemEditBox);
        this.reindexNeeded = true;
    }
}


class RotateEditBoxState extends EditBoxState {
    constructor(parentState, multiItemEditBox, x, y, mx, my) {
        super(parentState, 'rotate-edit-box', multiItemEditBox, x, y, mx, my);
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }
        const area = this.multiItemEditBoxOriginalArea;

        const pivotPoint = myMath.worldPointInArea(area.w * this.multiItemEditBox.pivotPoint.x, area.h * this.multiItemEditBox.pivotPoint.y, area);
        const angleDegrees = this.calculateRotatedAngle(x, y, this.originalPoint.x, this.originalPoint.y, pivotPoint.x, pivotPoint.y, event);
        const angle = angleDegrees * Math.PI / 180;

        const np = myMath.calculateRotationOffsetForSameCenter(this.multiItemEditBoxOriginalArea.x, this.multiItemEditBoxOriginalArea.y, pivotPoint.x, pivotPoint.y, angle);
        this.multiItemEditBox.area.x = np.x;
        this.multiItemEditBox.area.y = np.y;
        this.multiItemEditBox.area.r = area.r + angleDegrees;

        this.schemeContainer.updateMultiItemEditBoxItems(this.multiItemEditBox, IS_SOFT, {
            id: this.modificationContextId,
            moved: false,
            rotated: true,
            resized: false
        }, this.getUpdatePrecision());

        this.reindexNeeded = true;
        log.info('Rotated multi item edit box', this.multiItemEditBox);
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
}

class DragEditBoxState extends EditBoxState {
    constructor(parentState, multiItemEditBox, x, y, mx, my) {
        super(parentState, 'drag-edit-box', multiItemEditBox, x, y, mx, my);
        this.proposedItemForMounting = null;
        this.proposedToRemountToRoot = false;
    }

    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        if (!this.multiItemEditBox) {
            this.migrateToPreviousSubState();
            return;
        }

        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        const preSnapDx = x - this.originalPoint.x;
        const preSnapDy = y - this.originalPoint.y;

        StoreUtils.clearItemSnappers(this.store);
        const snapResult = this.snapPoints(this.boxPointsForSnapping, this.multiItemEditBox.itemIds, preSnapDx, preSnapDy);

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
            const fakeItem = {meta: {}, area: this.multiItemEditBox.area};
            this.proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(fakeItem, item => !this.multiItemEditBox.itemIds.has(item.id));
        } else {
            this.proposedItemForMounting = null;
        }

        if (this.proposedItemForMounting) {
            this.eventBus.emitItemsHighlighted([this.proposedItemForMounting.id], {highlightPins: false});
            this.proposedToRemountToRoot = false;
        } else {
            this.eventBus.emitItemsHighlighted([]);
            this.proposedToRemountToRoot = true;
        }

        updateMultiItemEditBoxWorldPivot(this.multiItemEditBox);
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.store.state.autoRemount && !this.store.state.animationEditor.isRecording) {
            if (this.multiItemEditBox && this.proposedItemForMounting) {
                // it should remount all items in multi item edit box into the new proposed parent
                this.remountItems(this.multiItemEditBox.items, this.proposedItemForMounting);
            } else if (this.multiItemEditBox && this.proposedToRemountToRoot) {
                this.remountItems(this.multiItemEditBox.items);
            }
        }

        this.eventBus.emitItemsHighlighted([]);
        super.mouseUp(x, y, mx, my, object, event);
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


class IdleState extends SubState {
    constructor(parentState, listener) {
        super(parentState, 'idle');
        this.clickedObject = null;
        this.listener = listener;
    }

    reset() {
        this.clickedObject = null;
        this.schemeContainer = this.parentState.schemeContainer;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.migrate(new DragScreenState(this.parentState));
            return;
        }

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
        } else if (key === Keys.MINUS) {
            this.zoomOutByKey();
        } else if (key === Keys.EQUALS) {
            this.zoomInByKey();
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        if (isEventMiddleClick(event)) {
            this.migrate(new DragScreenState(this.parentState, {x, y, mx, my}));
            return;
        }

        if (isEventRightClick(event)) {
            this.handleRightClick(x, y, mx, my, object, event);
            return;
        }

        if (object && object.type !== 'void') {
            this.clickedObject = object;

            if (object.type === 'item' && object.item) {
                if (!this.schemeContainer.isItemSelected(object.item)) {
                    this.schemeContainer.selectItem(object.item, isMultiSelectKey(event));
                }
            } else if (object.connectorStarter) {
                this.listener.onStartConnecting(object.connectorStarter.item, object.connectorStarter.point)
                return;
            }
        } else {
            if (!isMultiSelectKey(event)) {
                this.deselectAllItems();
            }
            this.migrate(new MultiSelectState(this.parentState, x, y, mx, my, (box, inclusive) => this.selectByBoundaryBox(box, inclusive)));
            return;
        }
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (object.item) {
            if (object.item.shape === 'path') {
                this.listener.onEditPathRequested(object.item);
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
            this.listener.onVoidDoubleClicked(x, y, mx, my);
        } else if (object.type === 'multi-item-edit-box' && object.multiItemEditBox.items.length === 1 && object.multiItemEditBox.items[0].shape === 'path') {
            // if user double clicks on the path but hits its edit box instead
            this.listener.onEditPathRequested(object.multiItemEditBox.items[0]);
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.clickedObject) {
            if (this.clickedObject.type === 'item' && this.schemeContainer.multiItemEditBox) {
                this.migrate(new DragEditBoxState(this.parentState, this.schemeContainer.multiItemEditBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'multi-item-edit-box-rotational-dragger') {
                this.migrate(new RotateEditBoxState(this.parentState, this.schemeContainer.multiItemEditBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'multi-item-edit-box-resize-dragger') {
                this.migrate(new ResizeEditBoxState(this.parentState, this.schemeContainer.multiItemEditBox, this.clickedObject.draggerEdges, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'multi-item-edit-box-pivot-dragger') {
                this.migrate(new DragPivotEditBoxState(this.parentState, this.schemeContainer.multiItemEditBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'control-point') {
                this.migrate(new DragControlPointState(this.parentState, this.clickedObject.controlPoint.item, this.clickedObject.controlPoint.pointId, x, y, mx, my));
                this.reset();
                return;
            }

        }
    }

    mouseUp() {
        this.clickedObject = null;
    }

    handleRightClick(x, y, mx, my, object, event) {
        if (object.type === 'item') {
            if (!this.schemeContainer.isItemSelected(object.item)) {
                this.schemeContainer.selectItem(object.item, isMultiSelectKey(event));
            }
            this.listener.onItemRightClick(object.item, mx, my);
        } else if (object.type === 'void') {
            this.schemeContainer.deselectAllItems();
            this.listener.onVoidRightClicked(mx, my);
        }
    }

    deselectAllItems() {
        this.schemeContainer.deselectAllItems();
        forEach(this.schemeContainer.selectedItems, item => this.listener.onItemDeselected(item));
    }

    dragItemsByKeyboard(dx, dy) {
        const box = this.schemeContainer.multiItemEditBox;
        if (box && !box.locked) {
            box.area.x += dx;
            box.area.y += dy;
            this.schemeContainer.updateMultiItemEditBoxItems(box, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());
            this.schemeContainer.updateMultiItemEditBox();
        }
    }

    handleDoubleClickOnConnector(item, x, y) {
        //TODO refactor it to use path segments in order to identify clicked segment
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
            this.listener.onItemChanged(item.id);
            this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            StoreUtils.setItemControlPoints(this.store, item);
            StoreUtils.setSelectedConnectorPath(this.store, Shape.find(item.shape).computeOutline(item));
            this.listener.onSchemeChangeCommitted();
        }
    }

    findClosestLineSegment(distanceOnPath, points, svgPath) {
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
        this.listener.onItemChanged(item.id);
        this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.setItemControlPoints(this.store, item);
        StoreUtils.setSelectedConnectorPath(this.store, Shape.find(item.shape).computeOutline(item));
        this.listener.onSchemeChangeCommitted();
    }

    findTextSlotAndEmitInPlaceEdit(item, x, y) {
        const textSlot = this.findItemTextSlotByPoint(item, x, y);
        if (!textSlot) {
            return;
        }
        this.listener.onItemTextSlotEditTriggered(item, textSlot.name, textSlot.area, textSlot.markupDisabled, false);
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

    selectByBoundaryBox(box, inclusive) {
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
        this.schemeContainer.selectMultipleItems(selectedItems, inclusive);
    }
}

export default class StateDragItem extends State {
    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus, store, listener) {
        super(eventBus, store,  'drag-item', listener);
        this.subState = null;
        this.listener = listener;
    }

    migrateSubState(subState) {
        super.migrateSubState(subState);
        EventBus.emitFloatingHelperPanelUpdated();
    }

    migrateToPreviousSubState() {
        super.migrateToPreviousSubState();
        EventBus.emitFloatingHelperPanelUpdated();
    }

    reset() {
        this.migrateSubState(new IdleState(this, this.listener));
    }

    mouseMove(x, y, mx, my, object, event) {
        super.mouseMove(x, y, mx, my, object, event);

        if (event.buttons === 0) {
            StoreUtils.clearItemSnappers(this.store);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        super.mouseUp(x, y, mx, my, object, event);
        StoreUtils.clearItemSnappers(this.store);
    }

    shouldAllowFloatingHelperPanel() {
        return this.subState && this.subState.name === 'idle';
    }
}

export function dragMultiItemEditBoxByDragger(multiItemEditBox, multiItemEditBoxOriginalArea, originalPoint, store, snapper, x, y, draggerEdges) {
    let nx = multiItemEditBox.area.x,
        ny = multiItemEditBox.area.y,
        nw = multiItemEditBox.area.w,
        nh = multiItemEditBox.area.h,
        dx = x - originalPoint.x,
        dy = y - originalPoint.y;

    let p0 = myMath.worldPointInArea(0, 0, multiItemEditBox.area);
    let p1 = myMath.worldPointInArea(1, 0, multiItemEditBox.area);
    let p2 = myMath.worldPointInArea(0, 1, multiItemEditBox.area);

    const rightVector = {x: p1.x - p0.x, y: p1.y - p0.y};
    const bottomVector = {x: p2.x - p0.x, y: p2.y - p0.y};

    StoreUtils.clearItemSnappers(store);
    const snapEdge = (x1, y1, x2, y2, vector) => {
        const p0 = myMath.worldPointInArea(x1, y1, multiItemEditBoxOriginalArea);
        const p1 = myMath.worldPointInArea(x2, y2, multiItemEditBoxOriginalArea);
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
            let newOffset;
            if (snapper) {
                newOffset = snapper.snapPoints(snappingPoints, multiItemEditBox.itemIds, projection * vector.x, projection * vector.y);
            } else {
                newOffset = {
                    dx: projection * vector.x,
                    dy: projection * vector.y
                };
            }
            projection = newOffset.dx * vector.x + newOffset.dy * vector.y;
        }
        return projection
    };


    // dirty hack as dragging of top left edge is special
    if (draggerEdges.length === 2 && draggerEdges[0] === 'top' && draggerEdges[1] === 'left') {
        const projectionBottom = snapEdge(0, 0, multiItemEditBoxOriginalArea.w, 0, bottomVector);
        const projectionRight = snapEdge(0, 0, 0, multiItemEditBoxOriginalArea.h, rightVector);

        nx = multiItemEditBoxOriginalArea.x + projectionRight * rightVector.x + projectionBottom * bottomVector.x;
        ny = multiItemEditBoxOriginalArea.y + projectionRight * rightVector.y + projectionBottom * bottomVector.y;
        nw = multiItemEditBoxOriginalArea.w - projectionRight;
        nh = multiItemEditBoxOriginalArea.h - projectionBottom;
        if (nh < 0) {
            nh = 0;
        }
    } else {
        forEach(draggerEdges, edge => {
            if (edge === 'top') {
                const projection = snapEdge(0, 0, multiItemEditBoxOriginalArea.w, 0, bottomVector);
                nx = multiItemEditBoxOriginalArea.x + projection * bottomVector.x;
                ny = multiItemEditBoxOriginalArea.y + projection * bottomVector.y;
                nh = multiItemEditBoxOriginalArea.h - projection;
                if (nh < 0) {
                    nh = 0;
                }
            } else if (edge === 'bottom') {
                const projection = snapEdge(0, multiItemEditBoxOriginalArea.h, multiItemEditBoxOriginalArea.w, multiItemEditBoxOriginalArea.h, bottomVector);
                nh = multiItemEditBoxOriginalArea.h + projection;
                if (nh < 0) {
                    nh = 0;
                }
            } else if (edge === 'left') {
                const projection = snapEdge(0, 0, 0, multiItemEditBoxOriginalArea.h, rightVector);
                nx = multiItemEditBoxOriginalArea.x + projection * rightVector.x;
                ny = multiItemEditBoxOriginalArea.y + projection * rightVector.y;
                nw = multiItemEditBoxOriginalArea.w - projection;
                if (nw < 0) {
                    nw = 0;
                }
            } else if (edge === 'right') {
                const projection = snapEdge(multiItemEditBoxOriginalArea.w, 0, multiItemEditBoxOriginalArea.w, multiItemEditBoxOriginalArea.h, rightVector);
                nw = multiItemEditBoxOriginalArea.w + projection;
                if (nw < 0) {
                    nw = 0;
                }
            }
        });
    }
    multiItemEditBox.area.x = nx;
    multiItemEditBox.area.y = ny;
    if (nw > 0) {
        multiItemEditBox.area.w = nw;
    }
    if (nh > 0) {
        multiItemEditBox.area.h = nh;
    }
}