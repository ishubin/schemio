/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import State, { DragScreenState, MultiSelectState, SubState } from './State.js';
import Shape from '../items/shapes/Shape';
import {forEach, find} from '../../../collections';
import myMath from '../../../myMath';
import {Logger} from '../../../logger';
import '../../../typedef';
import shortid from 'shortid';
import { Keys } from '../../../events';
import StoreUtils from '../../../store/StoreUtils.js';
import utils from '../../../utils.js';
import SchemeContainer, { worldScalingVectorOnItem, localPointOnItem, DEFAULT_ITEM_MODIFICATION_CONTEXT, isItemDescendantOf } from '../../../scheme/SchemeContainer.js';
import EditorEventBus from '../EditorEventBus.js';
import {findFirstItemBackwards, traverseItems} from '../../../scheme/Item';
import { compileItemTemplate } from '../items/ItemTemplate.js';

const log = new Logger('StateDragItem');

const IS_SOFT = true;
const IS_NOT_SOFT = false;

const ITEM_MODIFICATION_CONTEXT_MOVED = {
    moved: true,
    rotated: false,
    resized: false,
    id: ''
};

const ITEM_MODIFICATION_CONTEXT_CONTROL_POINT = {
    moved: false,
    rotated: false,
    resized: false,
    controlPoint: true,
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


function updateEditBoxWorldPivot(editBox) {
    if (!editBox) {
        return;
    }

    editBox.worldPivotPoint = myMath.worldPointInArea(
        editBox.pivotPoint.x * editBox.area.w,
        editBox.pivotPoint.y * editBox.area.h,
        editBox.area
    );
}

class EditBoxState extends SubState {
    constructor(parentState, name, editBox, x, y, mx, my) {
        super(parentState, name);
        this.originalPoint = { x, y, mx, my };

        /** @type {SchemeContainer} */
        this.schemeContainer = parentState.schemeContainer;

        /** @type {EditBox} */
        this.editBox = editBox;
        this.editBoxOriginalArea = utils.clone(editBox.area);
        this.boxPointsForSnapping = this.generateBoxPointsForSnapping(editBox);
        this.modificationContextId = shortid.generate();
    }

    mouseUp(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        if (this.editBox && this.editBox.connectorPoints.length > 0) {
            const context = {
                ...DEFAULT_ITEM_MODIFICATION_CONTEXT,
                id: this.modificationContextId
            };
            this.schemeContainer.updateEditBoxItems(this.editBox, IS_NOT_SOFT, context, this.getUpdatePrecision());
        }

        this.schemeContainer.reindexItems();
        this.schemeContainer.updateEditBox();
        this.listener.onSchemeChangeCommitted();
        this.migrateToPreviousSubState();
    }

    /**
     * Creates lines for box which will be used for snapping when draging this box.
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
        /** @type {SchemeContainer} */
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
        this.item.meta.revision += 1;
        this.schemeContainer.updateEditBoxItems(this.schemeContainer.editBox, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_CONTROL_POINT, this.getUpdatePrecision());
        this.schemeContainer.reindexItems();
        this.schemeContainer.updateEditBox();
        StoreUtils.setItemControlPoints(this.store, this.item);
        this.listener.onSchemeChangeCommitted();
        this.listener.onItemsHighlighted({itemIds: [], showPins: false});
        this.migrateToPreviousSubState();
    }

    findItemControlPoint(pointId) {
        if (this.item.shape === 'connector') {
            pointId = parseInt(pointId);
            const p = this.item.shapeProps.points[pointId];
            if (!p) {
                return null;
            }

            return {
                id: pointId,
                x: p.x,
                y: p.y,
                editBoxConnectorPointIdx: this.findEditBoxConnectorPointIdx(this.item.id, pointId),
                isEdgeStart: pointId === 0,
                isEdgeEnd: pointId === this.item.shapeProps.points.length - 1
            };
        }

        for(let i = 0; i < this.store.state.itemControlPoints.length; i++) {
            const controlPoint = this.store.state.itemControlPoints[i];
            if (controlPoint.id === pointId) {
                return controlPoint.point;
            }
        }

        return null;
    }

    findEditBoxConnectorPointIdx(itemId, pointId) {
        if (!this.schemeContainer.editBox) {
            return -1;
        }
        for(let i = 0; i < this.schemeContainer.editBox.connectorPoints.length; i++) {
            const cp = this.schemeContainer.editBox.connectorPoints[i];
            if (cp.itemId === itemId && cp.pointIdx === pointId) {
                return i;
            }
        }
        return -1;
    }

    handleControlPointDrag(x, y) {
        StoreUtils.clearItemSnappers(this.store);

        if (this.controlPoint) {
            if (this.item.shape === 'connector' && (this.controlPoint.isEdgeStart || this.controlPoint.isEdgeEnd)) {
                this.handleConnectorEdgeControlPointDrag(x, y, this.controlPoint);
                this.schemeContainer.updateItemClones(this.item);
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
                this.schemeContainer.updateItemClones(this.item);
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

            const wx = worldPoint.x + newOffset.dx;
            const wy = worldPoint.y + newOffset.dy;

            const localPoint = this.schemeContainer.localPointOnItem(wx, wy, this.item);
            point.x = localPoint.x;
            point.y = localPoint.y;

            if (this.controlPoint.editBoxConnectorPointIdx >= 0) {
                const lp = myMath.localPointInArea(wx, wy, this.schemeContainer.editBox.area);
                this.schemeContainer.editBox.connectorPoints[this.controlPoint.editBoxConnectorPointIdx].x = lp.x;
                this.schemeContainer.editBox.connectorPoints[this.controlPoint.editBoxConnectorPointIdx].y = lp.y;
            }

            // since this function can only be called if the connector is selected
            // we should update connector path so that it can be rendered in multi item edit box
            StoreUtils.setSelectedConnector(this.store, this.item);
        }
    }

    handleConnectorEdgeControlPointDrag(x, y, controlPoint) {
        // this function implements the same logic as in StateEditPath.handleEdgeCurvePointDrag
        // but it also modifies a control point in the end
        // so it is not that easy to share code

        let distanceThreshold = 10;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = distanceThreshold / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;

        const point = this.item.shapeProps.points[this.pointId];
        if (!point) {
            return;
        }

        let excludedIds = null
        if (this.editBox) {
            excludedIds = this.editBox.itemIds;
        } else {
            excludedIds = new Set();
            excludedIds.add(this.item.id);
        }

        const snappedOffset = this.snapPoints({
            horizontal: [{x, y}],
            vertical: [{x, y}],
        }, excludedIds, 0, 0);

        const closestPointToItem = this.schemeContainer.findClosestPointToItems(x + snappedOffset.dx, y + snappedOffset.dy, distanceThreshold, this.item.id, includeOnlyVisibleItems);

        let worldX, worldY;
        // Not letting connectors attach to themselves
        if (closestPointToItem && closestPointToItem.itemId !== this.item.id
            && !this.schemeContainer.doesItemDependOn(closestPointToItem.itemId, this.item.id)) {
            worldX = closestPointToItem.x;
            worldY = closestPointToItem.y;
            const localPoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.item);

            point.x = localPoint.x;
            point.y = localPoint.y;

            if (closestPointToItem.hasOwnProperty('nx')) {
                point.nx = closestPointToItem.nx;
                point.ny = closestPointToItem.ny;
            }

            this.listener.onItemsHighlighted({itemIds: [closestPointToItem.itemId], showPins: true});
            if (controlPoint.isEdgeStart) {
                this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                if (closestPointToItem.pinId) {
                    this.item.shapeProps.sourcePin = closestPointToItem.pinId;
                    this.item.shapeProps.sourceItemPosition = 0;
                } else {
                    this.item.shapeProps.sourcePin = '';
                    this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
                }
            } else {
                this.item.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                if (closestPointToItem.pinId) {
                    this.item.shapeProps.destinationPin = closestPointToItem.pinId;
                    this.item.shapeProps.destinationItemPosition = 0;
                } else {
                    this.item.shapeProps.destinationPin = '';
                    this.item.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
                }
            }
        } else {
            worldX = x + snappedOffset.dx;
            worldY = y + snappedOffset.dy;
            const localPoint = this.schemeContainer.localPointOnItem(worldX, worldY, this.item);

            point.x = localPoint.x;
            point.y = localPoint.y;

            // nothing to attach to so reseting highlights in case it was set previously
            this.listener.onItemsHighlighted({itemIds: [], showPins: false});
            if (controlPoint.isEdgeStart) {
                this.item.shapeProps.sourceItem = null;
                this.item.shapeProps.sourcePin = '';
                this.item.shapeProps.sourceItemPosition = 0;
            } else {
                this.item.shapeProps.destinationItem = null;
                this.item.shapeProps.destinationPin = '';
                this.item.shapeProps.destinationItemPosition = 0;
            }

            if (point.hasOwnProperty('nx')) {
                delete point.nx;
                delete point.ny;
            }
        }

        if (this.controlPoint.editBoxConnectorPointIdx >= 0) {
            const lp = myMath.localPointInArea(worldX, worldY, this.schemeContainer.editBox.area);
            this.schemeContainer.editBox.connectorPoints[this.controlPoint.editBoxConnectorPointIdx].x = lp.x;
            this.schemeContainer.editBox.connectorPoints[this.controlPoint.editBoxConnectorPointIdx].y = lp.y;
        }


        const shape = Shape.find(this.item.shape);

        this.listener.onItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, {...ITEM_MODIFICATION_CONTEXT_DEFAULT, controlPoint: true}, this.getUpdatePrecision());

        // since this function can only be called if the connector is selected
        // we should update connector path so that it can be rendered in multi item edit box
        StoreUtils.setSelectedConnector(this.store, this.item);
    }
}

class DragPivotEditBoxState extends EditBoxState {
    constructor(parentState, editBox, x, y, mx, my) {
        super(parentState, 'drag-pivot-edit-box', editBox, x, y, mx, my);
        this.oldPivotPoint = {
            x: editBox.pivotPoint.x,
            y: editBox.pivotPoint.y,
        };
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (!this.editBox) {
            return;
        }

        if (this.editBox.area.w === 0 || this.editBox.area.h === 0) {
            return;
        }
        const localPoint = myMath.localPointInArea(x, y, this.editBox.area);
        const localOriginalPoint = myMath.localPointInArea(this.originalPoint.x, this.originalPoint.y, this.editBox.area);

        this.editBox.pivotPoint.x = myMath.clamp(this.oldPivotPoint.x + (localPoint.x - localOriginalPoint.x) / this.editBox.area.w, 0, 1);
        this.editBox.pivotPoint.y = myMath.clamp(this.oldPivotPoint.y + (localPoint.y - localOriginalPoint.y) / this.editBox.area.h, 0, 1);

        updateEditBoxWorldPivot(this.editBox);
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.editBox.items.length === 1) {
            this.editBox.items[0].area.px = this.editBox.pivotPoint.x;
            this.editBox.items[0].area.py = this.editBox.pivotPoint.y;
            this.schemeContainer.updateEditBoxItems(this.editBox, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());
        }

        super.mouseUp(x, y, mx, my, object, event);
    }
}

class ResizeEditBoxState extends EditBoxState {
    /**
     *
     * @param {*} parentState
     * @param {EditBox} editBox
     * @param {*} draggerEdges
     * @param {*} x
     * @param {*} y
     * @param {*} mx
     * @param {*} my
     */
    constructor(parentState, editBox, draggerEdges, x, y, mx, my) {
        super(parentState, 'resize-edit-box', editBox, x, y, mx, my);
        this.draggerEdges = draggerEdges

        let ratio = 0;
        if (!myMath.tooSmall(editBox.area.h)) {
            ratio = editBox.area.w / editBox.area.h;
        }
        this.originalRatio = ratio;
        /** @type {CompiledItemTemplate|undefined} */
        this.template = null;
        if (editBox.templateRef) {
            if (this.store.state.apiClient && this.store.state.apiClient.getTemplate) {
                this.store.state.apiClient.getTemplate(editBox.templateRef).then(templateDef => {
                    this.template = compileItemTemplate(templateDef, editBox.templateRef);
                });
            }
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (this.editBox && this.editBox.locked) {
            return;
        }

        const lockedRatio = event.metaKey || event.ctrlKey ? this.originalRatio : 0;

        dragEditBoxByDragger(
            this.editBox,
            this.editBoxOriginalArea,
            this.originalPoint,
            this.store,
            this,
            x, y,
            this.draggerEdges,
            lockedRatio);

        this.schemeContainer.updateEditBoxItems(this.editBox, IS_SOFT, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        }, this.getUpdatePrecision());

        if (this.editBox.items.length === 1) {
            // perhaps this should be optimized to only update the control points so it doesn't re-create the same array of control points
            // But setting it from scratch is safer
            StoreUtils.setItemControlPoints(this.store, this.editBox.items[0]);
        }
        this.schemeContainer.updateEditBoxConnectorPoints();
        updateEditBoxWorldPivot(this.editBox);

        if (this.editBox.templateItemRoot && this.template && this.editBox.templateItemRoot.args && this.editBox.templateItemRoot.args.templateArgs) {
            const item = this.editBox.templateItemRoot;
            this.schemeContainer.regenerateTemplatedItem(item, this.template, item.args.templateArgs, item.area.w, item.area.h);
            traverseItems([item], item => EditorEventBus.item.changed.specific.$emit(this.editorId, item.id));
        }
    }
}


class RotateEditBoxState extends EditBoxState {
    constructor(parentState, editBox, x, y, mx, my) {
        super(parentState, 'rotate-edit-box', editBox, x, y, mx, my);
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (this.editBox && this.editBox.locked) {
            return;
        }

        const area = this.editBoxOriginalArea;

        const pivotPoint = myMath.worldPointInArea(area.w * this.editBox.pivotPoint.x, area.h * this.editBox.pivotPoint.y, area);
        const angleDegrees = this.calculateRotatedAngle(x, y, this.originalPoint.x, this.originalPoint.y, pivotPoint.x, pivotPoint.y, event);
        const angle = angleDegrees * Math.PI / 180;

        const np = myMath.calculateRotationOffsetForSameCenter(this.editBoxOriginalArea.x, this.editBoxOriginalArea.y, pivotPoint.x, pivotPoint.y, angle);
        this.editBox.area.x = np.x;
        this.editBox.area.y = np.y;
        this.editBox.area.r = area.r + angleDegrees;

        this.schemeContainer.updateEditBoxItems(this.editBox, IS_SOFT, {
            id: this.modificationContextId,
            moved: false,
            rotated: true,
            resized: false
        }, this.getUpdatePrecision());

        this.schemeContainer.updateEditBoxConnectorPoints();

        log.info('Rotated multi item edit box', this.editBox);
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

    constructor(parentState, editBox, x, y, mx, my) {
        super(parentState, 'drag-edit-box', editBox, x, y, mx, my);
        this.proposedItemForMounting = null;
        this.proposedToRemountToRoot = false;
    }

    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);

        if (!this.editBox) {
            this.migrateToPreviousSubState();
            return;
        }

        if (this.editBox.locked) {
            return;
        }

        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        const preSnapDx = x - this.originalPoint.x;
        const preSnapDy = y - this.originalPoint.y;

        StoreUtils.clearItemSnappers(this.store);
        const snapResult = this.snapPoints(this.boxPointsForSnapping, this.editBox.itemIds, preSnapDx, preSnapDy);

        this.editBox.area.x = this.editBoxOriginalArea.x + snapResult.dx;
        this.editBox.area.y = this.editBoxOriginalArea.y + snapResult.dy;

        this.schemeContainer.updateEditBoxItems(this.editBox, IS_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());

        // Fixing bug #392 where connector outline is rendered stale while connector itself gets readjusted
        if (this.editBox.items.length === 1 && this.editBox.items[0].shape === 'connector') {
            StoreUtils.setItemControlPoints(this.store, this.editBox.items[0]);
            StoreUtils.setSelectedConnector(this.store, this.editBox.items[0]);
        }

        // checking if it can fit into another item
        if (this.store.state.autoRemount && !this.parentState.isRecording ) {
            const fakeItem = {meta: {}, area: this.editBox.area};
            this.proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(fakeItem, item => {
                if (this.editBox.itemIds.has(item.id)) {
                    return false;
                }

                const editBoxItemIds = Array.from(this.editBox.itemIds);
                return editBoxItemIds.findIndex(potentialAncestorId => isItemDescendantOf(item, potentialAncestorId)) < 0;
            });
        } else {
            this.proposedItemForMounting = null;
        }

        if (this.proposedItemForMounting) {
            this.listener.onItemsHighlighted({itemIds: [this.proposedItemForMounting.id], showPins: false});
            this.proposedToRemountToRoot = false;
        } else {
            this.listener.onItemsHighlighted({itemIds: [], showPins: false});
            this.proposedToRemountToRoot = true;
        }

        this.schemeContainer.updateEditBoxConnectorPoints();
        updateEditBoxWorldPivot(this.editBox);
    }

    mouseUp(x, y, mx, my, object, event) {
        this.listener.onItemsHighlighted({itemIds: [], showPins: false});
        super.mouseUp(x, y, mx, my, object, event);

        if (!this.store.state.autoRemount || this.parentState.isRecording) {
            return;
        }
        const items = this.editBox.items.filter(item => !item.locked);
        if (items.length === 0) {
            return;
        }
        if (this.editBox && this.proposedItemForMounting) {
            // it should remount all items in multi item edit box into the new proposed parent
            this.remountItems(items, this.proposedItemForMounting);
        } else if (this.editBox && this.proposedToRemountToRoot) {
            this.remountItems(items);
        }
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

            if (!this.parentState.subState || this.parentState.subState.name !== 'drag-screen') {
                this.migrate(new DragScreenState(this.parentState, false));
            }
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
            this.zoomOut();
        } else if (key === Keys.EQUALS) {
            this.zoomIn();
        } else if (key === Keys.CTRL_ZERO) {
            this.resetZoom();
        } else if (key === Keys.CMD || key === Keys.CTRL || key === Keys.SHIFT) {
            EditorEventBus.editBox.fillDisabled.$emit(this.editorId);
        }
    }

    keyUp(key, keyOptions) {
        if (key === Keys.CMD || key === Keys.CTRL || key === Keys.SHIFT) {
            EditorEventBus.editBox.fillEnabled.$emit(this.editorId);
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        if (isEventMiddleClick(event)) {
            this.migrate(new DragScreenState(this.parentState, true, {x, y, mx, my}));
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
                    const isInclusive = isMultiSelectKey(event);
                    this.schemeContainer.selectItem(object.item, isInclusive);
                    if (!isInclusive) {
                        this.handleItemClick(object.item);
                    }
                }
            } else if (object.connectorStarter) {
                this.listener.onStartConnecting(object.connectorStarter.item, object.connectorStarter.point)
                return;
            } else if (object.type === 'edit-box-context-menu-button') {
                if (this.schemeContainer.selectedItems.length > 0) {
                    this.listener.onItemRightClick(this.schemeContainer.selectedItems[0], mx, my);
                }
            }
        } else {
            if (!isMultiSelectKey(event)) {
                this.deselectAllItems();
            }
            this.migrate(new MultiSelectState(this.parentState, x, y, mx, my, (box, inclusive) => this.selectByBoundaryBox(box, inclusive)));
            return;
        }
    }

    handleItemClick(item) {
        let templateRef = null;
        let templateRootItem = null;
        if (item.args && item.args.templated && item.args.templateRef) {
            templateRef = item.args.templateRef;
            templateRootItem = item;
        } else if (item.meta && item.meta.templated && item.meta.templateRef) {
            templateRootItem = this.schemeContainer.findItemById(item.meta.templateRootId);
            templateRef = item.meta.templateRef;
        }

        if (templateRef && templateRootItem) {
            EditorEventBus.item.templateSelected.$emit(this.editorId, templateRootItem, templateRef);
        }
    }

    /**
     * We need this function because edit box has its own fill on top of all items.
     * There can be a situation when another item is rendered on top of the selected item
     * and user wants to select that item. When user clicks inside of existing edit box,
     * the other item does not register click.
     * In this case we need to iterate over all bounding boxes of all items respective of their layering order
     * and check if user clicked inside of them. The only exception needs to be done to connectors.
     * @param {*} x
     * @param {*} y
     * @param {*} event
     * @returns
     */
    handleSimpleClickOnEditBox(x, y, event) {
        const clickedItem = findFirstItemBackwards(this.schemeContainer.getItems(), item => {
            const p = localPointOnItem(x, y, item);
            if (p.x >= 0 && p.x <= item.area.w && p.y >= 0 && p.y < item.area.h && item.visible && item.meta.calculatedVisibility) {
                if (item.shape === 'connector') {
                    const closestPoint = this.schemeContainer.closestPointToItemOutline(item, {x, y}, {});
                    const d = myMath.distanceBetweenPoints(x, y, closestPoint.x, closestPoint.y);
                    return d / this.schemeContainer.screenTransform.scale < 5;
                }
                return true;
            }
        });
        if (!clickedItem) {
            return;
        }
        const isMultiSelect = isMultiSelectKey(event);
        this.schemeContainer.selectItem(clickedItem, isMultiSelect);
        if (!isMultiSelect) {
            this.handleItemClick(clickedItem);
        }
    }

    onItemDoubleClick(item, x, y) {
        if (item.shape === 'path') {
            this.listener.onEditPathRequested(item);
        } else if (item.shape === 'connector') {
            this.handleDoubleClickOnConnector(item, x, y);
        } else {
            this.findTextSlotAndEmitInPlaceEdit(item, x, y)
        }
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (object.item) {
            this.onItemDoubleClick(object.item, x, y);
        } else if (object.type === 'edit-box' && object.editBox.items.length === 1) {
            this.onItemDoubleClick(object.editBox.items[0], x, y);
        } else if (object.controlPoint && object.controlPoint.item.shape === 'connector') {
            this.handleDoubleClickOnConnectorControlPoint(object.controlPoint.item, parseInt(object.controlPoint.pointId));
        } else if (object.itemTextElement) {
            this.findTextSlotAndEmitInPlaceEdit(object.itemTextElement.item, x, y)
        } else if (object.type === 'void') {
            this.listener.onVoidDoubleClicked(x, y, mx, my);
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.clickedObject) {
            if ((this.clickedObject.type === 'item' || this.clickedObject.type === 'edit-box') && this.schemeContainer.editBox) {
                this.migrate(new DragEditBoxState(this.parentState, this.schemeContainer.editBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'edit-box-rotational-dragger') {
                this.migrate(new RotateEditBoxState(this.parentState, this.schemeContainer.editBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'edit-box-resize-dragger') {
                this.migrate(new ResizeEditBoxState(this.parentState, this.schemeContainer.editBox, this.clickedObject.draggerEdges, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'edit-box-pivot-dragger') {
                this.migrate(new DragPivotEditBoxState(this.parentState, this.schemeContainer.editBox, x, y, mx, my));
                this.reset();
                return;
            } else if (this.clickedObject.type === 'control-point') {
                this.migrate(new DragControlPointState(this.parentState, this.clickedObject.controlPoint.item, this.clickedObject.controlPoint.pointId, x, y, mx, my));
                this.reset();
                return;
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (object.type === 'edit-box' && this.clickedObject && this.clickedObject.type === object.type) {
            this.handleSimpleClickOnEditBox(x, y, event);
        }
        this.clickedObject = null;
    }

    handleRightClick(x, y, mx, my, object, event) {
        if (object.type === 'item') {
            if (!this.schemeContainer.isItemSelected(object.item)) {
                this.schemeContainer.selectItem(object.item, isMultiSelectKey(event));
            }
            this.listener.onItemRightClick(object.item, mx, my);
        } else if (object.type === 'edit-box') {
            this.listener.onItemRightClick(object.editBox.items[0], mx, my);
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
        const box = this.schemeContainer.editBox;
        if (box && !box.locked) {
            box.area.x += dx;
            box.area.y += dy;
            this.schemeContainer.updateEditBoxItems(box, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_MOVED, this.getUpdatePrecision());
            this.schemeContainer.updateEditBox();
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
        if (item.shapeProps.thick && item.shapeProps.points.length > 1) {
            const points = item.shapeProps.points;
            path = `M ${points[0].x} ${points[0].y}`
            for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x} ${points[i].y}`;
            }
            minDistance += item.shapeProps.thickWidth;
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
                id: shortid.generate(),
                x: closestPoint.x,
                y: closestPoint.y,
            });
            this.listener.onItemChanged(item.id);
            this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            StoreUtils.setSelectedConnector(this.store, item);
            this.schemeContainer.reindexItems();
            this.schemeContainer.updateEditBox();
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

    /**
     * @param {Item} item
     * @param {Number} pointId
     * @returns
     */
    handleDoubleClickOnConnectorControlPoint(item, pointId) {
        if (item.shape !== 'connector') {
            return;
        }
        if (pointId === 0 || pointId >= item.shapeProps.points.length - 1) {
            // should not allow to delete first and last connector points
            return;
        }

        item.shapeProps.points.splice(pointId, 1);
        this.listener.onItemChanged(item.id);
        this.schemeContainer.readjustItem(item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.setSelectedConnector(this.store, item);
        this.schemeContainer.reindexItems();
        this.schemeContainer.updateEditBox();
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
        this.schemeContainer.selectByBoundaryBox(box, inclusive);
    }
}

export default class StateDragItem extends State {
    constructor(editorId, store, listener) {
        super(editorId, store,  'drag-item', listener);
        this.subState = null;
        this.listener = listener;
        this.isRecording= false;
    }

    toggleGrabScreen(isEnabled) {
        if (isEnabled) {
            this.migrateSubState(new DragScreenState(this, false, null));
        } else {
            this.migrateSubState(new IdleState(this, this.listener));
        }
    }

    migrateSubState(subState) {
        super.migrateSubState(subState);
    }

    migrateToPreviousSubState() {
        super.migrateToPreviousSubState();
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

    enableRecording() {
        this.isRecording = true;
    }
    disableRecording() {
        this.isRecording = false;
    }
}

export function dragEditBoxByDragger(editBox, editBoxOriginalArea, originalPoint, store, snapper, x, y, draggerEdges, lockedRatio) {
    let nx = editBox.area.x,
        ny = editBox.area.y,
        nw = editBox.area.w,
        nh = editBox.area.h,
        dx = x - originalPoint.x,
        dy = y - originalPoint.y;

    let p0 = myMath.worldPointInArea(0, 0, editBox.area);
    let p1 = myMath.worldPointInArea(1, 0, editBox.area);
    let p2 = myMath.worldPointInArea(0, 1, editBox.area);

    // storing original rect points of edit box
    // this will be used later for readjusting the position of the box
    const ow = editBox.area.w;
    const oh = editBox.area.h;
    const originalWorldCorners = {
        topLeft: myMath.worldPointInArea(0, 0, editBox.area),
        topRight: myMath.worldPointInArea(ow, 0, editBox.area),
        bottomRight: myMath.worldPointInArea(ow, oh, editBox.area),
        bottomLeft: myMath.worldPointInArea(0, oh, editBox.area)
    }

    const rightVector = {x: p1.x - p0.x, y: p1.y - p0.y};
    const bottomVector = {x: p2.x - p0.x, y: p2.y - p0.y};

    StoreUtils.clearItemSnappers(store);
    const snapEdge = (x1, y1, x2, y2, vector) => {
        const p0 = myMath.worldPointInArea(x1, y1, editBoxOriginalArea);
        const p1 = myMath.worldPointInArea(x2, y2, editBoxOriginalArea);
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
                newOffset = snapper.snapPoints(snappingPoints, editBox.itemIds, projection * vector.x, projection * vector.y);
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

    const edgeBits = {
        'top'   : 0,
        'bottom': 1,
        'left'  : 2,
        'right' : 3
    };
    let edgeID = 0;

    forEach(draggerEdges, edge => {
        edgeID |= 1 << edgeBits[edge];

        if (edge === 'top') {
            const projection = snapEdge(0, 0, editBoxOriginalArea.w, 0, bottomVector);
            nx = editBoxOriginalArea.x + projection * bottomVector.x;
            ny = editBoxOriginalArea.y + projection * bottomVector.y;
            nh = editBoxOriginalArea.h - projection;
            if (nh < 0) {
                nh = 0;
            }
        } else if (edge === 'bottom') {
            const projection = snapEdge(0, editBoxOriginalArea.h, editBoxOriginalArea.w, editBoxOriginalArea.h, bottomVector);
            nh = editBoxOriginalArea.h + projection;
            if (nh < 0) {
                nh = 0;
            }
        } else if (edge === 'left') {
            const projection = snapEdge(0, 0, 0, editBoxOriginalArea.h, rightVector);
            nx = editBoxOriginalArea.x + projection * rightVector.x;
            ny = editBoxOriginalArea.y + projection * rightVector.y;
            nw = editBoxOriginalArea.w - projection;
            if (nw < 0) {
                nw = 0;
            }
        } else if (edge === 'right') {
            const projection = snapEdge(editBoxOriginalArea.w, 0, editBoxOriginalArea.w, editBoxOriginalArea.h, rightVector);
            nw = editBoxOriginalArea.w + projection;
            if (nw < 0) {
                nw = 0;
            }
        }
    });

    editBox.area.x = nx;
    editBox.area.y = ny;
    if (nw > 0) {
        editBox.area.w = nw;
    }
    if (nh > 0) {
        editBox.area.h = nh;
    }

    if (lockedRatio) {
        const xPart = dx * rightVector.x + dy * rightVector.y;
        const yPart = dx * bottomVector.x + dy * bottomVector.y;

        if (Math.abs(xPart) > Math.abs(yPart)) {
            editBox.area.h = editBox.area.w / lockedRatio;
        } else {
            editBox.area.w = editBox.area.h * lockedRatio;
        }
    }
    let p = null;

    if (edgeID == (1 << edgeBits.top | 1 << edgeBits.left)) {
        // bottom right position should remain as it was before
        const c = originalWorldCorners.bottomRight;
        p = myMath.findTranslationMatchingWorldPoint(c.x, c.y, editBox.area.w, editBox.area.h, editBox.area, null);

    } else if (edgeID == (1 << edgeBits.top | 1 << edgeBits.right)) {
        const c = originalWorldCorners.bottomLeft;
        p = myMath.findTranslationMatchingWorldPoint(c.x, c.y, 0, editBox.area.h, editBox.area, null);

    } else if (edgeID == (1 << edgeBits.bottom | 1 << edgeBits.right)) {
        const c = originalWorldCorners.topLeft;
        p = myMath.findTranslationMatchingWorldPoint(c.x, c.y, 0, 0, editBox.area, null);

    } else if (edgeID == (1 << edgeBits.bottom | 1 << edgeBits.left)) {
        const c = originalWorldCorners.topRight;
        p = myMath.findTranslationMatchingWorldPoint(c.x, c.y, editBox.area.w, 0, editBox.area, null);
    }

    if (p) {
        editBox.area.x = p.x;
        editBox.area.y = p.y;
    }
}