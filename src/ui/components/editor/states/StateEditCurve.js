/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import Shape from '../items/shapes/Shape.js';
import {enrichItemWithDefaults} from '../../../scheme/Item';
import { Keys } from '../../../events.js';
import StoreUtils from '../../../store/StoreUtils.js';
import forEach from 'lodash/forEach';
import filter from 'lodash/filter';

const IS_NOT_SOFT = false;
const IS_SOFT = true;

const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};


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

export default class StateEditCurve extends State {
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'editCurve';
        this.item = null;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.originalClickPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
        this.multiSelectBox = null;

        // used to identify whether mouse was moved between mouseDown and mouseUp events
        this.wasMouseMoved = false;

        // used in order to drag screen when user holds spacebar
        this.shouldDragScreen = false;
        this.startedDraggingScreen = false;
        this.originalScreenOffset = {x: 0, y: 0};

        this.draggedObject = null;
        this.originalCurvePoints = null;

        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    }

    reset() {
        this.eventBus.emitItemsHighlighted([]);
        this.item = null;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.softReset();
    }

    softReset() {
        this.shouldDragScreen = false;
        this.multiSelectBox = null;
        this.wasMouseMoved = false;
        this.startedDraggingScreen = false;
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
        this.draggedObject = null;
        this.originalCurvePoints = null;
    }

    cancel() {
        this.eventBus.emitItemsHighlighted([]);
        if (this.creatingNewPoints) {
            // deleting last point
            this.item.shapeProps.points.splice(this.item.shapeProps.points.length - 1 , 1);

            if (this.item.shapeProps.points.length > 0) {
                this.submitItem();
            }
        } else {
            this.schemeContainer.readjustItem(this.item.id, false, ITEM_MODIFICATION_CONTEXT_DEFAULT);
            this.schemeContainer.updateMultiItemEditBox();
        }
        super.cancel();
    }

    setItem(item) {
        this.item = item;
        if (this.schemeContainer.findItemById(item.id)) {
            this.addedToScheme = true;
            this.creatingNewPoints = false;
        } else {
            this.updateCursor('crosshair');
        }
    }

    initConnectingFromSourceItem(sourceItem, localPoint) {
        if (!localPoint) {
            localPoint = {
                x: sourceItem.area.w / 2,
                y: sourceItem.area.h / 2
            };
        }
        
        const worldPoint = this.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, sourceItem);

        let curveItem = {
            shape: 'connector',
            name: `${sourceItem.name} :: `,
            area: {x: 0, y: 0, w: 200, h: 200, r: 0},
            shapeProps: { }
        };
        enrichItemWithDefaults(curveItem);
        curveItem = this.schemeContainer.addItem(curveItem);
        curveItem.shapeProps.sourceItem = `#${sourceItem.id}`;

        const closestPoint = this.findAttachmentPointToItem(sourceItem, localPoint);
        curveItem.shapeProps.sourceItemPosition = closestPoint.distanceOnPath;
        curveItem.shapeProps.points = [{
            t: 'L', x: closestPoint.x, y: closestPoint.y
        }, {
            t: 'L', x: worldPoint.x, y: worldPoint.y
        }];

        if (typeof closestPoint.bx != 'undefined') {
            curveItem.shapeProps.points[0].bx = closestPoint.bx;
            curveItem.shapeProps.points[0].by = closestPoint.by;
        }

        this.item = curveItem;
        this.addedToScheme = true;
        this.creatingNewPoints = true;
        this.updateCursor('crosshair');
        return this.item;
    }

    /**
     * 
     * @param {Item} item 
     * @param {Point} localPoint 
     * @returns {ItemClosestPoint}
     */
    findAttachmentPointToItem(item, localPoint) {
        const worldPoint = this.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, item);
        const closestPoint = this.schemeContainer.closestPointToItemOutline(item, worldPoint, {
            withNormal: true
        });

        if (closestPoint) {
            return closestPoint;
        }

        return {
            x: item.area.w / 2,
            y: item.area.h / 2
        };
    }

    initFirstClick(x, y) {
        this.item.shapeProps.points = [];

        this.schemeContainer.addItem(this.item);

        // snapping can only be performed once the item is added to the scheme
        // that is why we have to re-adjust curve points afterwords so that they are snapped
        const snappedCurvePoint = this.snapCurvePoint(-1, x, y);

        this.item.shapeProps.points.push({
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });
        this.item.shapeProps.points.push({
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });

        // in case user tried to attach source to another item
        this.handleEdgeCurvePointDrag(this.item.shapeProps.points[0], true);
        this.addedToScheme = true;
    }

    initScreenDrag(mx, my) {
        this.startedDraggingScreen = true;
        this.originalClickPoint.x = mx;
        this.originalClickPoint.y = my;
        this.originalClickPoint.mx = mx;
        this.originalClickPoint.my = my;
        this.originalScreenOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    initMulitSelectBox(x, y, mx, my) {
        this.originalClickPoint.x = x;
        this.originalClickPoint.y = y;
        this.originalClickPoint.mx = mx;
        this.originalClickPoint.my = my;
        this.multiSelectBox = {x, y, w: 0, h: 0};
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE && !this.startedDraggingScreen) {
            this.shouldDragScreen = true;
            this.updateCursor('grabbing');
        }
    }

    keyUp(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.shouldDragScreen = false;
            this.updateCursor('default');
        }
    }


    mouseDoubleClick(x, y, mx, my, object, event) {
        if (this.creatingNewPoints) {
            return;
        }
        if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
            return;
        }
        this.insertPointAtCoords(x, y);
    }

    mouseDown(x, y, mx, my, object, event) {
        this.originalClickPoint.x = x;
        this.originalClickPoint.y = y;
        this.originalClickPoint.mx = mx;
        this.originalClickPoint.my = my;

        if (this.shouldDragScreen) {
            this.updateCursor('grabbing');
            this.initScreenDrag(mx, my);
            return;
        }

        if (!this.addedToScheme) {
            this.initFirstClick(x, y);
        } else if (this.creatingNewPoints) {
            if (isEventRightClick(event) && this.item.shape === 'connector') {
                this.proposeNewDestinationItemForConnector(this.item, mx, my);
            } else {
                const snappedCurvePoint = this.snapCurvePoint(this.item.shapeProps.points.length - 1, x, y);

                // checking if the curve was attached to another item
                if (this.item.shapeProps.destinationItem) {
                    if (this.item.shapeProps.sourceItem) {
                        this.item.name = this.createNameFromAttachedItems(this.item.shapeProps.sourceItem, this.item.shapeProps.destinationItem);
                    }
                    this.submitItem();
                    return;
                }

                const point = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];
                point.x = snappedCurvePoint.x;
                point.y = snappedCurvePoint.y;

                //checking whether curve got closed
                if (this.item.shapeProps.points.length > 2) {
                    if (this.shouldJoinClosedPoints) {
                        //closing the curve
                        this.item.shapeProps.closed = true;
                        // deleting last point
                        this.item.shapeProps.points.splice(this.item.shapeProps.points.length - 1 , 1);
                        this.submitItem();
                    }
                }
                StoreUtils.updateAllCurveEditPoints(this.store, this.item);
                this.candidatePointSubmited = true;
            }
        } else {
            // editing existing curve
            if (isEventRightClick(event)) {
                this.handleRightClick(x, y, mx, my, object);
            } else if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
                this.originalCurvePoints = utils.clone(this.item.shapeProps.points);
                this.draggedObject = object;

                if (!StoreUtils.getCurveEditPoints(this.store)[object.pointIndex].selected) {
                    StoreUtils.toggleCurveEditPointSelection(this.store, object.pointIndex, isMultiSelectKey(event));
                }
            } else {
                this.initMulitSelectBox(x, y, mx, my);
            }
        }
    }
    
    createNameFromAttachedItems(sourceSelector, destinationSelector) {
        const sourceItem = this.schemeContainer.findFirstElementBySelector(sourceSelector);
        const destinationItem = this.schemeContainer.findFirstElementBySelector(destinationSelector);
        if (sourceItem && destinationItem) {
            return `${sourceItem.name} -> ${destinationItem.name}`;
        }
        
        return 'Curve';
    }

    mouseMove(x, y, mx, my, object, event) {
        // not handling any mouse movement if connector proposed destination panel is shown
        if (this.store.state.connectorProposedDestination.shown) {
            return;
        }

        this.wasMouseMoved = true;

        if (this.shouldDragScreen && this.startedDraggingScreen) {
            this.dragScreen(mx, my);
            return;
        }

        StoreUtils.clearItemSnappers(this.store);

        if (this.addedToScheme && this.creatingNewPoints) {
            const pointIndex = this.item.shapeProps.points.length - 1;
            const point = this.item.shapeProps.points[pointIndex];

            if (this.candidatePointSubmited && this.item.shape !== 'connector') {
                // convert last point to Beizer and drag its control points
                // but only in case this is a regular curve and not a connector
                point.t = 'B';
                point.x2 = x - point.x;
                point.y2 = y - point.y;

                point.x1 = -point.x2;
                point.y1 = -point.y2;
            } else {
                // drag last point
                const snappedLocalCurvePoint = this.snapCurvePoint(pointIndex, x, y);
                point.x = snappedLocalCurvePoint.x;
                point.y = snappedLocalCurvePoint.y;

                this.shouldJoinClosedPoints = false;

                if (this.item.shapeProps.points.length > 2) {
                    // checking if the curve point was moved too close to first point,
                    // so that the placement of new points can be stopped and curve will become closed
                    // This needs to be checked in viewport (not in world transform)
                    const p0 = this.item.shapeProps.points[0];
                    const dx = point.x - p0.x;
                    const dy = point.y - p0.y;
                    
                    if (Math.sqrt(dx * dx + dy * dy) * this.schemeContainer.screenTransform.scale <= 5) {
                        point.x = p0.x;
                        point.y = p0.y;
                        if (!this.item.shapeProps.sourceItem) {
                            this.shouldJoinClosedPoints = true;
                        }
                    }
                }
            }
            if (!this.shouldJoinClosedPoints) {
                // what if we want to attach this point to another item
                this.handleEdgeCurvePointDrag(pointIndex, point, false);
            }
            this.eventBus.emitItemChanged(this.item.id);
            StoreUtils.updateCurveEditPoint(this.store, pointIndex, point);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-point') {
            this.handleCurvePointDrag(x, y, this.draggedObject.pointIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-control-point') {
            this.handleCurveControlPointDrag(x, y, event);
        } else if (this.multiSelectBox) {
            this.wasMouseMoved = true;
            if (x > this.originalClickPoint.x) {
                this.multiSelectBox.x = this.originalClickPoint.x;
                this.multiSelectBox.w = x - this.originalClickPoint.x;
            } else {
                this.multiSelectBox.x = x;
                this.multiSelectBox.w = this.originalClickPoint.x - x;
            }
            if (y > this.originalClickPoint.y) {
                this.multiSelectBox.y = this.originalClickPoint.y;
                this.multiSelectBox.h = y - this.originalClickPoint.y;
            } else {
                this.multiSelectBox.y = y;
                this.multiSelectBox.h = this.originalClickPoint.y - y;
            }
            StoreUtils.setMultiSelectBox(this.store, this.multiSelectBox);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.eventBus.emitItemsHighlighted([]);


        if (this.multiSelectBox) {
            const inclusive = isMultiSelectKey(event);
            this.selectByBoundaryBox(this.multiSelectBox, inclusive, mx, my);
            StoreUtils.setMultiSelectBox(this.store, null);
        } else if (this.addedToScheme && this.creatingNewPoints) {
            if (this.candidatePointSubmited) {
                this.candidatePointSubmited = false;

                const snappedLocalCurvePoint = this.snapCurvePoint(-1, x, y);
                this.item.shapeProps.points.push({
                    x: snappedLocalCurvePoint.x,
                    y: snappedLocalCurvePoint.y,
                    t: 'L'
                });
                this.eventBus.emitItemChanged(this.item.id);
            }
        } else if (!this.wasMouseMoved && object && object.type === 'curve-point') {
            // correcting for click on a point
            // it should clear selection of other points in case ctrl key was not pressed
            if (isMultiSelectKey(event)) {
                StoreUtils.toggleCurveEditPointSelection(this.store, object.pointIndex, false);
            }
        }

        // if something was dragged - the scheme change should be commited
        if (this.draggedObject) {
            this.eventBus.emitSchemeChangeCommited();
        }

        this.draggedObject = null;
        this.originalCurvePoints = null;

        StoreUtils.clearItemSnappers(this.store);
        this.softReset();
    }

    convertSelectedPointsToBeizer() {
        const selectedPoints = filter(StoreUtils.getCurveEditPoints(this.store), point => point.selected);
        forEach(selectedPoints, point => this.convertPointToBeizer(point.id));
    }

    convertSelectedPointsToSimple() {
        const selectedPoints = filter(StoreUtils.getCurveEditPoints(this.store), point => point.selected);
        forEach(selectedPoints, point => this.convertPointToSimple(point.id));
    }

    handleRightClick(x, y, mx, my, object) {
        const selectedPoints = filter(StoreUtils.getCurveEditPoints(this.store), point => point.selected);
        if (selectedPoints.length > 1) {
            const menuOptions = [{
                name: 'Delete points',
                clicked: () => this.deleteSelectedPoints()
            }, {
                name: 'Convert to beizer',
                clicked: () => this.convertSelectedPointsToBeizer()
            }, {
                name: 'Convert to simple',
                clicked: () => this.convertSelectedPointsToSimple()
            }];
            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);
        }

        if (object && object.type === 'curve-point') {
            StoreUtils.selectCurveEditPoint(this.store, object.pointIndex, false);

            const point = this.item.shapeProps.points[object.pointIndex];

            let nextPoint = null;
            if (object.pointIndex < this.item.shapeProps.points.length - 1) {
                nextPoint = this.item.shapeProps.points[object.pointIndex + 1];
            }

            const menuOptions = [{
                name: 'Delete point',
                clicked: () => this.deletePoint(object.pointIndex)
            }];

            if (point.break || (nextPoint && nextPoint.break)) {
                menuOptions.push({
                    name: 'Remove break',
                    clicked: () => this.repairBreak(object.pointIndex)
                });
            } else if (object.pointIndex > 0 && object.pointIndex < this.item.shapeProps.points.length - 2){
                menuOptions.push({
                    name: 'Break curve',
                    clicked: () => this.breakCurve(object.pointIndex + 1)
                });
            }

            if (point.t === 'L') {
                menuOptions.push({
                    name: 'Convert to beizer point',
                    clicked: () => this.convertPointToBeizer(object.pointIndex)
                });
            }
            else {
                menuOptions.push({
                    name: 'Convert to simple point',
                    clicked: () => this.convertPointToSimple(object.pointIndex)
                });
            }
            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);
        }
    }

    breakCurve(pointIndex) {
        this.item.shapeProps.points[pointIndex].break = true;
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        this.eventBus.emitSchemeChangeCommited();
    }

    repairBreak(pointIndex) {
        if (this.item.shapeProps.points[pointIndex].break) {
            this.item.shapeProps.points[pointIndex].break = false;
        } else if (pointIndex < this.item.shapeProps.points.length - 1 && this.item.shapeProps.points[pointIndex + 1].break) {
            this.item.shapeProps.points[pointIndex + 1].break = false;
        } else {
            return;
        }
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        this.eventBus.emitSchemeChangeCommited();
    }

    deletePoint(pointIndex) {
        this.item.shapeProps.points.splice(pointIndex, 1);
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    deleteSelectedPoints() {
        const points = StoreUtils.getCurveEditPoints(this.store);
        
        const selectedIds = [];
        forEach(points, p => {
            if (p.selected) {
                selectedIds.push(p.id);
            }
        });

        forEach(selectedIds.sort().reverse(), pointIndex => {
            this.item.shapeProps.points.splice(pointIndex, 1);
        });

        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    insertPointAtCoords(x, y) {
        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return;
        }
        this.shadowSvgPath.setAttribute('d', shape.computePath(this.item));
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, this.shadowSvgPath);

        // checking how far away from the curve stroke has the user clicked
        const dx = localPoint.x - closestPoint.x;
        const dy = localPoint.y - closestPoint.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= parseInt(this.item.shapeProps.strokeSize) + 1) {
            const index = this.findClosestLineSegment(closestPoint.distance, this.item.shapeProps.points, this.shadowSvgPath);
            this.item.shapeProps.points.splice(index + 1, 0, {
                x: closestPoint.x,
                y: closestPoint.y,
                t: 'L'
            });
            if (this.item.shapeProps.points[index].t === 'B') {
                this.convertPointToBeizer(index + 1);
            }
            this.eventBus.emitItemChanged(this.item.id);
            this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
            StoreUtils.updateAllCurveEditPoints(this.store, this.item);
            this.eventBus.emitSchemeChangeCommited();
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

    convertPointToSimple(pointIndex) {
        const point = this.item.shapeProps.points[pointIndex];
        if (!point) {
            return;
        }
        point.t = 'L';
        if (point.hasOwnProperty('x1')) {
            delete point.x1;
            delete point.y1;
        }
        if (point.hasOwnProperty('x2')) {
            delete point.x2;
            delete point.y2;
        }
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        StoreUtils.updateCurveEditPoint(this.store, pointIndex, this.item.shapeProps.points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
    }

    convertPointToBeizer(pointIndex) {
        const point = this.item.shapeProps.points[pointIndex];
        if (!point) {
            return;
        }
        
        let dx = 10, dy = 0;
        if (this.item.shapeProps.points.length > 2) {
            // calculating dx and dy via previous and next points
            let prevPointId = pointIndex - 1;
            if (prevPointId < 0) {
                prevPointId = this.item.shapeProps.points.length + prevPointId;
            }
            let nextPointId = pointIndex + 1;
            if (nextPointId >= this.item.shapeProps.points.length - 1) {
                nextPointId -= this.item.shapeProps.points.length - 1;
            }

            dx = (this.item.shapeProps.points[nextPointId].x - this.item.shapeProps.points[prevPointId].x) / 4;
            dy = (this.item.shapeProps.points[nextPointId].y - this.item.shapeProps.points[prevPointId].y) / 4;
        }

        point.x1 = - dx;
        point.y1 = - dy;
        point.x2 = dx;
        point.y2 = dy;
        point.t = 'B';
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        StoreUtils.updateCurveEditPoint(this.store, pointIndex, this.item.shapeProps.points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
    }

    handleCurvePointDrag(x, y, pointIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[pointIndex];

        const snappedLocalCurvePoint = this.snapCurvePoint(
            pointIndex,
            this.originalCurvePoints[pointIndex].x + localPoint.x - localOriginalPoint.x,
            this.originalCurvePoints[pointIndex].y + localPoint.y - localOriginalPoint.y
        );

        curvePoint.x = snappedLocalCurvePoint.x;
        curvePoint.y = snappedLocalCurvePoint.y;

        const dx = curvePoint.x - this.originalCurvePoints[pointIndex].x;
        const dy = curvePoint.y - this.originalCurvePoints[pointIndex].y;

        // dragging the rest of selected points
        forEach(StoreUtils.getCurveEditPoints(this.store), storePoint => {
            if (storePoint.selected && storePoint.id !== pointIndex) {
                this.item.shapeProps.points[storePoint.id].x = this.originalCurvePoints[storePoint.id].x + dx;
                this.item.shapeProps.points[storePoint.id].y = this.originalCurvePoints[storePoint.id].y + dy;
                StoreUtils.updateCurveEditPoint(this.store, storePoint.id, this.item.shapeProps.points[storePoint.id]);
            }
        });
        
        if (pointIndex === 0 || pointIndex === this.item.shapeProps.points.length - 1) {
            this.handleEdgeCurvePointDrag(pointIndex, curvePoint, pointIndex === 0);
        }

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, pointIndex, curvePoint);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
    }

    snapCurvePoint(pointId, localX, localY) {
        const worldCurvePoint = this.schemeContainer.worldPointOnItem(localX, localY, this.item);

        let bestSnappedHorizontalProximity = 100000;
        let bestSnappedVerticalProximity = 100000;
        //TODO configure snapping precision
        const maxSnapProximity = 6;
        
        let horizontalSnapper = null;
        let verticalSnapper = null;

        // first it should try to snap to its own curve points and only then to any other snappers of other items
        if (this.isSnappingToItemsEnabled()) {
            forEach(this.item.shapeProps.points, (point, idx) => {
                if (pointId === idx) {
                    return;
                }

                const wp = this.schemeContainer.worldPointOnItem(point.x, point.y, this.item);

                let d = Math.abs(wp.y - worldCurvePoint.y);
                if (d < maxSnapProximity && d < bestSnappedHorizontalProximity) {
                    bestSnappedHorizontalProximity = d;
                    horizontalSnapper = {
                        localValue: point.y,
                        value: wp.y,
                        item: this.item,
                        snapperType: 'horizontal'
                    };
                }

                d = Math.abs(wp.x - worldCurvePoint.x);
                if (d < maxSnapProximity && d < bestSnappedVerticalProximity) {
                    bestSnappedVerticalProximity = d;
                    verticalSnapper = {
                        localValue: point.x,
                        value: wp.x,
                        item: this.item,
                        snapperType: 'vertical'
                    };
                }
            });
        }

        const newOffset = this.snapPoints({
            vertical: [worldCurvePoint],
            horizontal: [worldCurvePoint]
        }, new Set(), 0, 0);

        let snappedWorldX = worldCurvePoint.x + newOffset.dx;
        let snappedWorldY = worldCurvePoint.y + newOffset.dy;

        const localPoint = this.schemeContainer.localPointOnItem(snappedWorldX, snappedWorldY, this.item);
        if (horizontalSnapper) {
            localPoint.y = horizontalSnapper.localValue;
            StoreUtils.setItemSnapper(this.store, horizontalSnapper);
        }
        if (verticalSnapper) {
            localPoint.x = verticalSnapper.localValue;
            StoreUtils.setItemSnapper(this.store, verticalSnapper);
        }
        return localPoint;
    }

    /**
     * Handles dragging of edge point and checks whether it should stick to other item
     * This is the most time consuming function as it needs to look through all items in schemes
     * @param {Point} curvePoint 
     * @param {Boolean} isSource 
     */
    handleEdgeCurvePointDrag(pointIndex, curvePoint, isSource) {
        if (this.item.shape !== 'connector') {
            // should not do anything since this is not a connecytor but a regular curve
            // regular curves should not be allowed to attach to other items
            return;
        }

        const worldCurvePoint = this.schemeContainer.worldPointOnItem(curvePoint.x, curvePoint.y, this.item);

        let distanceThreshold = 0;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = 20 / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;
        const closestPointToItem = this.schemeContainer.findClosestPointToItems(worldCurvePoint.x, worldCurvePoint.y, distanceThreshold, this.item.id, includeOnlyVisibleItems);

        if (closestPointToItem) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.item);
            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;

            const item = this.schemeContainer.findItemById(closestPointToItem.itemId);
            const normal = this.schemeContainer.calculateNormalOnPointInItemOutline(item, closestPointToItem.distanceOnPath);
            curvePoint.bx = normal.x;
            curvePoint.by = normal.y;

            this.eventBus.emitItemsHighlighted([closestPointToItem.itemId]);
            if (isSource) {
                this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
            } else {
                this.item.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                this.item.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
            }
        } else {
            // nothing to attach to so reseting highlights in case it was set previously
            this.eventBus.emitItemsHighlighted([]);
            if (isSource) {
                this.item.shapeProps.sourceItem = null;
                this.item.shapeProps.sourceItemPosition = 0;
            } else {
                this.item.shapeProps.destinationItem = null;
                this.item.shapeProps.destinationItemPosition = 0;
            }
        }
        StoreUtils.updateCurveEditPoint(this.store, pointIndex, curvePoint);
    }

    handleCurveControlPointDrag(x, y, event) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[this.draggedObject.pointIndex];
        const index = this.draggedObject.controlPointIndex;
        const oppositeIndex = index === 1 ? 2: 1;

        // Since control points are relative to their base curve points, we need to calculate their absolute world position
        // This way we can snap them to the grid and then recalculate the relative to base curve point in its local coords

        const snappedLocalAbsoluteCurvePoint = this.snapCurvePoint(
            -1,
            curvePoint.x + this.originalCurvePoints[this.draggedObject.pointIndex][`x${index}`] + localPoint.x - localOriginalPoint.x,
            curvePoint.y + this.originalCurvePoints[this.draggedObject.pointIndex][`y${index}`] + localPoint.y - localOriginalPoint.y,
        );

        curvePoint[`x${index}`] = snappedLocalAbsoluteCurvePoint.x - curvePoint.x;
        curvePoint[`y${index}`] = snappedLocalAbsoluteCurvePoint.y - curvePoint.y;
        
        if (!(event.metaKey || event.ctrlKey || event.shiftKey)) {
            curvePoint[`x${oppositeIndex}`] = -curvePoint[`x${index}`];
            curvePoint[`y${oppositeIndex}`] = -curvePoint[`y${index}`];
        }
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.draggedObject.pointIndex, curvePoint);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
    }

    submitItem() {
        if (this.item.shapeProps.points.length < 2) {
            this.schemeContainer.deleteItem(this.item);
            this.schemeContainer.reindexItems();
            this.reset();
            return;
        }

        this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
        this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
        this.eventBus.emitItemChanged(this.item.id);
        this.eventBus.emitSchemeChangeCommited();
        this.schemeContainer.reindexItems();
        this.schemeContainer.selectItem(this.item);
        this.reset();
    }

    dragScreen(x, y) {
        this.schemeContainer.screenTransform.x = Math.floor(this.originalScreenOffset.x + x - this.originalClickPoint.x);
        this.schemeContainer.screenTransform.y = Math.floor(this.originalScreenOffset.y + y - this.originalClickPoint.y);
    }

    selectByBoundaryBox(box, inclusive, mx, my) {
        const viewportBox = {
            x: this.originalClickPoint.mx,
            y: this.originalClickPoint.my,
            w: mx - this.originalClickPoint.mx,
            h: my - this.originalClickPoint.my
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

        if (!inclusive) {
            StoreUtils.resetCurveEditPointSelection(this.store);
        }

        forEach(this.item.shapeProps.points, (point, pointId) => {
            const wolrdPoint = this.schemeContainer.worldPointOnItem(point.x, point.y, this.item);
            if (myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box)) {
                StoreUtils.selectCurveEditPoint(this.store, pointId, true);
            }
        });
    }

    proposeNewDestinationItemForConnector(item, mx, my) {
        StoreUtils.proposeConnectorDestinationItems(this.store, item.id, mx, my);
    }

    /**
     * Invoked when user selects an item from ConnectorDestinationProposal panel
     * @param {Item} dstItem 
     */
    submitConnectorDestinationItem(item) {
        if (this.item.shape !== 'connector') {
            return;
        }

        let shape = Shape.find(this.item.shape);
        let path = shape.computePath(this.item);
        let shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shadowSvgPath.setAttribute('d', path);

        const pathLength = shadowSvgPath.getTotalLength();
        const p2 = shadowSvgPath.getPointAtLength(pathLength);
        const p1 = shadowSvgPath.getPointAtLength(pathLength - 4);
        //TODO calculate correct placement 
        
        const worldPoint2 = this.schemeContainer.worldPointOnItem(p2.x, p2.y, this.item);
        const worldPoint1 = this.schemeContainer.worldPointOnItem(p1.x, p1.y, this.item);

        const Vx = worldPoint2.x - worldPoint1.x;
        const Vy = worldPoint2.y - worldPoint1.y;

        const destinationItem = this.schemeContainer.addItem(item);

        if (item.shape !== 'uml_actor') {
            // uml_actor item looks ugly when stretched wide
            destinationItem.area.w = 100;
            destinationItem.area.h = 50;
        }

        if (Math.abs(Vx) > Math.abs(Vy)) {
            destinationItem.area.y = worldPoint2.y - destinationItem.area.h / 2;
            if (Vx > 0) {
                //should attach from left side
                destinationItem.area.x = worldPoint2.x;
            } else {
                //should attach from right side
                destinationItem.area.x = worldPoint2.x - destinationItem.area.w;
            }
        } else {
            destinationItem.area.x = worldPoint2.x - destinationItem.area.w / 2;
            if (Vy > 0) {
                //should attach from top
                destinationItem.area.y = worldPoint2.y;
            } else {
                //should attach from bottom
                destinationItem.area.y = worldPoint2.y - destinationItem.area.h;
            }
        }


        const localToDstItemPoint = this.schemeContainer.localPointOnItem(worldPoint2.x, worldPoint2.y, destinationItem);


        shape = Shape.find(destinationItem.shape);
        path = shape.computeOutline(destinationItem);
        shadowSvgPath.setAttribute('d', path);
        const closestPoint = myMath.closestPointOnPath(localToDstItemPoint.x, localToDstItemPoint.y, shadowSvgPath);

        // this is a hack but have to do it as when user cancels state edit curve
        // it actually deletes the last point since it is considered as not submited
        this.item.shapeProps.points.push(utils.clone(this.item.shapeProps.points[this.item.shapeProps.points.length - 1]));
        
        this.item.shapeProps.destinationItem = `#${destinationItem.id}`;
        this.item.shapeProps.destinationItemPosition = closestPoint.distance;
        this.cancel();
    }
}
