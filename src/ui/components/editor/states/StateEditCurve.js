/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import Shape from '../items/shapes/Shape.js';
import { Keys } from '../../../events.js';
import StoreUtils from '../../../store/StoreUtils.js';
import EventBus from '../EventBus.js';

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
        this.parentItem = null;
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
        this.originalCurvePaths = null;

        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    }

    reset() {
        this.eventBus.emitItemsHighlighted([]);
        this.item = null;
        this.parentItem = null;
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
        this.originalCurvePaths = null;
    }

    cancel() {
        this.eventBus.emitItemsHighlighted([]);
        if (this.item) {
            if (this.creatingNewPoints) {
                // deleting last point
                this.item.shapeProps.paths[0].points.splice(this.item.shapeProps.paths[0].points.length - 1 , 1);

                if (this.item.shapeProps.paths[0].points.length > 0) {
                    this.submitItem();
                }
            } else {
                this.schemeContainer.readjustItem(this.item.id, false, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
                this.schemeContainer.updateMultiItemEditBox();
            }
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

    initFirstClick(x, y) {
        this.item.shapeProps.paths = [{
            closed: false,
            points: []
        }];

        this.schemeContainer.addItem(this.item);

        // snapping can only be performed once the item is added to the scheme
        // that is why we have to re-adjust curve points afterwards so that they are snapped
        const snappedCurvePoint = this.snapCurvePoint(-1, -1, x, y);

        this.item.shapeProps.paths[0].points.push({
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });
        this.item.shapeProps.paths[0].points.push({
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });

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
            let realX = x, realY = y;
            if (this.parentItem) {
                const relativePoint = this.schemeContainer.localPointOnItem(x, y, this.parentItem);
                realX = relativePoint.x;
                realY = relativePoint.y;
            }
            const snappedCurvePoint = this.snapCurvePoint(0, this.item.shapeProps.paths[0].points.length - 1, realX, realY);

            // checking if the curve was attached to another item
            if (this.item.shapeProps.destinationItem) {
                if (this.item.shapeProps.sourceItem) {
                    this.item.name = this.createNameFromAttachedItems(this.item.shapeProps.sourceItem, this.item.shapeProps.destinationItem);
                }
                this.submitItem();
                this.reset();
                this.eventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
                return;
            }

            const point = this.item.shapeProps.paths[0].points[this.item.shapeProps.paths[0].points.length - 1];


            point.x = snappedCurvePoint.x;
            point.y = snappedCurvePoint.y;

            //checking whether curve got closed
            if (this.item.shapeProps.paths[0].points.length > 2) {
                if (this.shouldJoinClosedPoints) {
                    // deleting last point
                    this.item.shapeProps.paths[0].points.splice(this.item.shapeProps.paths[0].points.length - 1 , 1);
                    this.item.shapeProps.paths[0].closed = true;
                    this.submitItem();
                    this.reset();
                    this.eventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
                }
            }
            StoreUtils.updateAllCurveEditPoints(this.store, this.item);
            this.candidatePointSubmited = true;
        } else {
            // editing existing curve
            if (isEventRightClick(event)) {
                this.handleRightClick(x, y, mx, my, object);
            } else if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
                this.originalCurvePaths = utils.clone(this.item.shapeProps.paths);
                this.draggedObject = object;

                if (!StoreUtils.getCurveEditPaths(this.store)[object.pathIndex].points[object.pointIndex].selected) {
                    StoreUtils.toggleCurveEditPointSelection(this.store, object.pathIndex, object.pointIndex, isMultiSelectKey(event));
                    EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
                }
            } else if (object && object.type === 'curve-path') {
                this.handlePathClick(object, event);
            } else {
                this.initMulitSelectBox(x, y, mx, my);
            }
        }
    }


    handlePathClick(object, event) {
        if (!isMultiSelectKey(event)) {
            StoreUtils.resetCurveEditPointSelection(this.store);
        }
        for (let i = 0; i < this.item.shapeProps.paths[object.pathIndex].points.length; i++) {
            StoreUtils.selectCurveEditPoint(this.store, object.pathIndex, i, true);
        }
        this.draggedObject = object;
        this.originalCurvePaths = utils.clone(this.item.shapeProps.paths);
        
        EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
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
            const pointIndex = this.item.shapeProps.paths[0].points.length - 1;
            const point = this.item.shapeProps.paths[0].points[pointIndex];

            if (this.candidatePointSubmited && this.item.shape !== 'connector') {
                // convert last point to Beizer and drag its control points
                // but only in case this is a regular curve and not a connector
                point.t = 'B';
                point.x2 = this.round(x - point.x);
                point.y2 = this.round(y - point.y);

                point.x1 = -point.x2;
                point.y1 = -point.y2;
            } else {
                // drag last point
                let realX = x, realY = y;
                if (this.parentItem) {
                    const relativePoint = this.schemeContainer.localPointOnItem(x, y, this.parentItem);
                    realX = relativePoint.x;
                    realY = relativePoint.y;
                }
                const snappedLocalCurvePoint = this.snapCurvePoint(0, pointIndex, realX, realY);
                
                point.x = this.round(snappedLocalCurvePoint.x);
                point.y = this.round(snappedLocalCurvePoint.y);


                this.shouldJoinClosedPoints = false;

                if (this.item.shapeProps.paths[0].points.length > 2) {
                    // checking if the curve point was moved too close to first point,
                    // so that the placement of new points can be stopped and curve will become closed
                    // This needs to be checked in viewport (not in world transform)
                    const p0 = this.item.shapeProps.paths[0].points[0];
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
            this.eventBus.emitItemChanged(this.item.id);
            StoreUtils.updateCurveEditPoint(this.store, this.item, 0, pointIndex, point);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-point') {
            this.handleCurvePointDrag(x, y, this.draggedObject.pathIndex, this.draggedObject.pointIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-path') {
            this.handleCurvePathDrag(x, y, this.draggedObject.pathIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-control-point') {
            this.handleCurveControlPointDrag(x, y, event);
        } else if (this.multiSelectBox) {
            this.wasMouseMoved = true;
            // checking user moved multi select box outside of svg editor and released the button there
            if (event.buttons === 0) {
                // in such case when user moves mouse back - it should finalize the multi select
                // therefore we need to trigger mouseUp artificially
                this.mouseUp(x, y, mx, my, object, event);
            } else {
                // otherwise keep moving multi select box
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

                let realX = x, realY = y;
                if (this.parentItem) {
                    const relativePoint = this.schemeContainer.localPointOnItem(x, y, this.parentItem);
                    realX = relativePoint.x;
                    realY = relativePoint.y;
                }
                const snappedLocalCurvePoint = this.snapCurvePoint(-1, -1, realX, realY);

                this.item.shapeProps.paths[0].points.push({
                    x: this.round(snappedLocalCurvePoint.x),
                    y: this.round(snappedLocalCurvePoint.y),
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
        this.originalCurvePaths = null;

        StoreUtils.clearItemSnappers(this.store);
        this.softReset();
    }

    handleRightClick(x, y, mx, my, object) {
        const selectedPoints = [];
        StoreUtils.getCurveEditPaths(this.store).forEach((path, pathId) => {
            path.points.forEach((point, pointId) => {
                if (point.selected) {
                    selectedPoints.push({pathId, pointId});
                }
            });
        });

        let clickedOnSelectedPoint = false;
        for (let i = 0; i < selectedPoints.length && !clickedOnSelectedPoint; i++) {
            clickedOnSelectedPoint = object.pathIndex === selectedPoints[i].pathId && object.pointIndex === selectedPoints[i].pointId;
        }
        
        if (selectedPoints.length > 1 && clickedOnSelectedPoint) {
            const menuOptions = [{
                name: 'Delete points',
                clicked: () => this.deleteSelectedPoints(selectedPoints)
            }, {
                name: 'Convert to beizer',
                clicked: () => selectedPoints.forEach(p => this.convertPointToBeizer(p.pathId, p.pointId))
            }, {
                name: 'Convert to simple',
                clicked: () => selectedPoints.forEach(p => this.convertPointToSimple(p.pathId, p.pointId))
            }, {
                name: 'Convert to arc',
                clicked: () => selectedPoints.forEach(p => this.convertPointToArc(p.pathId, p.pointId))
            }];
            if (selectedPoints.length === 2) {
                menuOptions.push({
                    name: 'Merge points',
                    clicked: () => this.mergePoints(selectedPoints[0], selectedPoints[1])
                })
            }
            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);
            return;
        }

        if (object && object.type === 'curve-point') {
            // user might have clicked the deselected point or the single selected point.
            // In this case we need to reset everything and treat it as a single point context menu

            StoreUtils.selectCurveEditPoint(this.store, object.pathIndex, object.pointIndex, false);
            EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);

            const point = this.item.shapeProps.paths[object.pathIndex].points[object.pointIndex];

            let nextPoint = null;
            if (object.pointIndex < this.item.shapeProps.paths[object.pathIndex].points.length - 1) {
                nextPoint = this.item.shapeProps.paths[object.pathIndex].points[object.pointIndex + 1];
            }
            let prevPoint = null;
            if (object.pointIndex > 0) {
                prevPoint = this.item.shapeProps.paths[object.pathIndex].points[object.pointIndex - 1];
            }

            const menuOptions = [{
                name: 'Delete point',
                clicked: () => this.deletePoint(object.pathIndex, object.pointIndex)
            }];

            if (! (prevPoint && prevPoint.break) && ! (nextPoint && nextPoint.break)){
                menuOptions.push({
                    name: 'Break curve',
                    clicked: () => this.breakCurve(object.pathIndex, object.pointIndex)
                });
            }

            if (point.t !== 'L') {
                menuOptions.push({
                    name: 'Convert to simple point',
                    clicked: () => this.convertPointToSimple(object.pathIndex, object.pointIndex)
                });
            }
            if (point.t !== 'B') {
                menuOptions.push({
                    name: 'Convert to beizer point',
                    clicked: () => this.convertPointToBeizer(object.pathIndex, object.pointIndex)
                });
            }

            if (point.t !== 'A') {
                menuOptions.push({
                    name: 'Convert to arc point',
                    clicked: () => this.convertPointToArc(object.pathIndex, object.pointIndex)
                });
            }
            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);
        }
    }

    mergePoints(pref1, pref2) {
        if (pref1.pathId === pref2.pathId) {
            this.mergePointsInSamePath(this.item.shapeProps.paths[pref1.pathId], pref1.pointId, pref2.pointId);
        } else {
            this.mergePointsOfTwoPaths(pref1.pathId, pref1.pointId, pref2.pathId, pref2.pointId);
        }
    }

    mergePointsInSamePath(path, pId1, pId2) {
        if (path.closed) {
            return;
        }
        const firstPointId = Math.min(pId1, pId2);
        if (firstPointId !== 0) {
            return;
        }
        const lastPointId = Math.max(pId1, pId2);
        if (lastPointId !== path.points.length - 1) {
            return;
        }
        const firstPoint = path.points[firstPointId];
        const lastPoint = path.points[lastPointId];

        const mx = (firstPoint.x + lastPoint.x) / 2;
        const my = (firstPoint.y + lastPoint.y) / 2;
        firstPoint.x = mx;
        firstPoint.y = my;
        path.points.pop();
        path.closed = true;

        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    mergePointsOfTwoPaths(pathId1, pId1, pathId2, pId2) {
        const path1 = this.item.shapeProps.paths[pathId1];
        const path2 = this.item.shapeProps.paths[pathId2];

        if (path1.closed || path2.closed) {
            return;
        }

        // checking that the specified points are edge points
        if (!(pId1 === 0 || pId1 === path1.points.length - 1)) {
            return;
        }
        if (!(pId2 === 0 || pId2 === path2.points.length - 1)) {
            return;
        }

        const p1 = path1.points[pId1];
        const p2 = path2.points[pId2];
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;

        if (pId2 === 0) {
            if (pId1 === 0) {
                path1.points = path1.points.reverse();
            }
            path1.points.pop();
            path2.points[0].x = mx;
            path2.points[0].y = my;
            path1.points = path1.points.concat(path2.points);
            this.item.shapeProps.paths.splice(pathId2, 1);
        } else if (pId1 === 0) {
            if (pId2 === 0) {
                path2.points = path2.points.reverse();
            }
            path2.points.pop();
            path1.points[0].x = mx;
            path1.points[0].y = my;
            path2.points = path2.points.concat(path1.points);
            this.item.shapeProps.paths.splice(pathId1, 1);
        } else {
            path2.points = path2.points.reverse();
            path1.points.pop();
            path2.points[0].x = mx;
            path2.points[0].y = my;
            path1.points = path1.points.concat(path2.points);
            this.item.shapeProps.paths.splice(pathId2, 1);
        }

        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    breakCurve(pathIndex, pointIndex) {
        const path = this.item.shapeProps.paths[pathIndex];
        if (path.closed) {
            this.breakClosedPath(path, pointIndex);
        } else {
            this.breakPathIntoTwo(path, pointIndex);
        }

        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    breakClosedPath(path, pointIndex) {
        const points = [];
        for (let j = 0; j < path.points.length; j++) {
            const i = (j + pointIndex + 1) % path.points.length;
            if (i !== pointIndex) {
                points.push(path.points[i]);
            }
        }
        path.closed = false;
        path.points = points;
    }

    breakPathIntoTwo(path, pointIndex) {
        if (pointIndex === 0) {
            if (path.points.length < 3) {
                return;
            }
            path.points.splice(0, 1);
        } else if (pointIndex === 1) {
            if (path.points.length < 4) {
                return;
            }
            path.points.splice(0, 2);
        } else if (pointIndex === path.points.length - 1) {
            if (path.points.length < 3) {
                return;
            }
            path.points.splice(pointIndex, 1);
        } else if (pointIndex === path.points.length - 2) {
            if (path.points.length < 4) {
                return;
            }
            path.points.splice(pointIndex, 2);
        } else {
            const secondPath = {
                closed: false,
                points: path.points.splice(pointIndex+1, path.points.length - pointIndex - 1)
            };
            path.points.pop();
            this.item.shapeProps.paths.push(secondPath);
        }
    }

    deletePoint(pathIndex, pointIndex) {
        this.item.shapeProps.paths[pathIndex].points.splice(pointIndex, 1);
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    deleteSelectedPoints(pointReferences) {
        pointReferences.reverse().forEach(selection => {
            this.item.shapeProps.paths[selection.pathId].points.splice(selection.pointId, 1);
        });

        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    insertPointAtCoords(x, y) {
        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return;
        }
        this.shadowSvgPath.setAttribute('d', shape.computeOutline(this.item));
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, this.shadowSvgPath);

        // checking how far away from the curve stroke has the user clicked
        const dx = localPoint.x - closestPoint.x;
        const dy = localPoint.y - closestPoint.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= parseInt(Math.max(0, this.item.shapeProps.strokeSize)) + 1) {
            const {pathId, pointId} = this.findClosestLineSegment(closestPoint.distance, this.item.shapeProps.paths, this.shadowSvgPath);
            this.item.shapeProps.paths[pathId].points.splice(pointId + 1, 0, {
                x: closestPoint.x,
                y: closestPoint.y,
                t: 'L'
            });
            if (this.item.shapeProps.paths[pathId].points[pointId].t === 'B') {
                this.convertPointToBeizer(pathId, pointId + 1);
            }
            this.eventBus.emitItemChanged(this.item.id);
            this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            StoreUtils.updateAllCurveEditPoints(this.store, this.item);
            this.eventBus.emitSchemeChangeCommited();
        }
    }

    findClosestLineSegment(distanceOnPath, paths, svgPath) {
        for (let pathId = paths.length - 1; pathId >= 0; pathId--) {
            for (let i = paths[pathId].points.length - 1; i >= 0; i--) {
                const closestPoint = myMath.closestPointOnPath(paths[pathId].points[i].x, paths[pathId].points[i].y, svgPath);
                if (closestPoint.distance < distanceOnPath) {
                    return {pathId, pointId: i};
                }
            }
        }
        return {pathId: 0, pointId: 0};
    }

    convertPointToSimple(pathId, pointIndex) {
        const point = this.item.shapeProps.paths[pathId].points[pointIndex];
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
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateCurveEditPoint(this.store, this.item, pathId, pointIndex, this.item.shapeProps.paths[pathId].points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
    }

    convertPointToBeizer(pathId, pointIndex) {
        const point = this.item.shapeProps.paths[pathId].points[pointIndex];
        if (!point) {
            return;
        }
        
        let dx = 10, dy = 0;
        if (this.item.shapeProps.paths[pathId].points.length > 2) {
            // calculating dx and dy via previous and next points
            let prevPointId = pointIndex - 1;
            if (prevPointId < 0) {
                prevPointId = this.item.shapeProps.paths[pathId].points.length + prevPointId;
            }
            let nextPointId = pointIndex + 1;
            if (nextPointId >= this.item.shapeProps.paths[pathId].points.length - 1) {
                nextPointId -= this.item.shapeProps.paths[pathId].points.length - 1;
            }

            dx = (this.item.shapeProps.paths[pathId].points[nextPointId].x - this.item.shapeProps.paths[pathId].points[prevPointId].x) / 4;
            dy = (this.item.shapeProps.paths[pathId].points[nextPointId].y - this.item.shapeProps.paths[pathId].points[prevPointId].y) / 4;
        }

        point.x1 = - dx;
        point.y1 = - dy;
        point.x2 = dx;
        point.y2 = dy;
        point.t = 'B';
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateCurveEditPoint(this.store, this.item, pathId, pointIndex, this.item.shapeProps.paths[pathId].points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
    }

    convertPointToArc(pathId, pointIndex) {
        const point = this.item.shapeProps.points[pointIndex];
        let x1 = 10;
        let y1 = 10;
        if (pointIndex <  this.item.shapeProps.points.length - 1) {
            const nextPoint = this.item.shapeProps.points[pointIndex + 1];
            const xm = (nextPoint.x + point.x) / 2;
            const ym = (nextPoint.y + point.y) / 2;
            const vx = xm - point.x;
            const vy = ym - point.y;
            const vpx = vy;
            const vpy = -vx;

            x1 = vpx + xm - point.x;
            y1 = vpy + ym - point.y;
        }

        point.x1 = x1;
        point.y1 = y1;
        point.t = 'A';
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateCurveEditPoint(this.store, this.item, pathId, pointIndex, this.item.shapeProps.points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
    }

    handleCurvePointDrag(x, y, pathIndex, pointIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.paths[pathIndex].points[pointIndex];

        const snappedLocalCurvePoint = this.snapCurvePoint(
            pathIndex,
            pointIndex,
            this.originalCurvePaths[pathIndex].points[pointIndex].x + localPoint.x - localOriginalPoint.x,
            this.originalCurvePaths[pathIndex].points[pointIndex].y + localPoint.y - localOriginalPoint.y
        );

        curvePoint.x = snappedLocalCurvePoint.x;
        curvePoint.y = snappedLocalCurvePoint.y;

        const dx = curvePoint.x - this.originalCurvePaths[pathIndex].points[pointIndex].x;
        const dy = curvePoint.y - this.originalCurvePaths[pathIndex].points[pointIndex].y;

        // dragging the rest of selected points
        StoreUtils.getCurveEditPaths(this.store).forEach((path, _pathIndex) => {
            path.points.forEach(storePoint => {
                if (storePoint.selected && !(storePoint.id === pointIndex && pathIndex === _pathIndex)) {
                    this.item.shapeProps.paths[_pathIndex].points[storePoint.id].x = this.originalCurvePaths[_pathIndex].points[storePoint.id].x + dx;
                    this.item.shapeProps.paths[_pathIndex].points[storePoint.id].y = this.originalCurvePaths[_pathIndex].points[storePoint.id].y + dy;
                    StoreUtils.updateCurveEditPoint(this.store, this.item, _pathIndex, storePoint.id, this.item.shapeProps.paths[_pathIndex].points[storePoint.id]);
                }
            });
        });
        
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.item, pathIndex, pointIndex, curvePoint);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
    }

    handleCurvePathDrag(x, y, pathIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const dx = localPoint.x - localOriginalPoint.x;
        const dy = localPoint.y - localOriginalPoint.y;

        this.item.shapeProps.paths[pathIndex].points.forEach((point, pointIndex) => {
            point.x = this.originalCurvePaths[pathIndex].points[pointIndex].x + dx;
            point.y = this.originalCurvePaths[pathIndex].points[pointIndex].y + dy;
            StoreUtils.updateCurveEditPoint(this.store, this.item, pathIndex, pointIndex, point);
        })

        // dragging the rest of points of other path in case they are selected
        StoreUtils.getCurveEditPaths(this.store).forEach((path, _pathIndex) => {
            path.points.forEach(storePoint => {
                if (storePoint.selected && pathIndex !== _pathIndex) {
                    this.item.shapeProps.paths[_pathIndex].points[storePoint.id].x = this.originalCurvePaths[_pathIndex].points[storePoint.id].x + dx;
                    this.item.shapeProps.paths[_pathIndex].points[storePoint.id].y = this.originalCurvePaths[_pathIndex].points[storePoint.id].y + dy;
                    StoreUtils.updateCurveEditPoint(this.store, this.item, _pathIndex, storePoint.id, this.item.shapeProps.paths[_pathIndex].points[storePoint.id]);
                }
            });
        });
        
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
    }

    snapCurvePoint(pathId, pointId, localX, localY) {
        const worldCurvePoint = this.schemeContainer.worldPointOnItem(localX, localY, this.item);

        let bestSnappedHorizontalProximity = 100000;
        let bestSnappedVerticalProximity = 100000;
        //TODO configure snapping precision
        const maxSnapProximity = 6;
        
        let horizontalSnapper = null;
        let verticalSnapper = null;

        // first it should try to snap to its own curve points and only then to any other snappers of other items
        if (this.isSnappingToItemsEnabled()) {
            this.item.shapeProps.paths.forEach((path, _pathIndex) => {
                path.points.forEach((point, idx) => {
                    if (pathId === _pathIndex && pointId === idx) {
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
        return {
            x: this.round(localPoint.x),
            y: this.round(localPoint.y),
        };
    }

    handleConnectorSourceMouseMove(x, y) {
        const closestPointToItem = this.findClosestAttachmentPoint(x, y);

        if (closestPointToItem) {
            this.eventBus.emitItemsHighlighted([closestPointToItem.itemId], {highlightPins: true});
            this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
            this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
        } else {
            this.eventBus.emitItemsHighlighted([]);
            this.item.shapeProps.sourceItem = null;
            this.item.shapeProps.sourceItemPosition = 0;
        }
    }

    findClosestAttachmentPoint(x, y) {
        let distanceThreshold = 10;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = distanceThreshold / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;
        return this.schemeContainer.findClosestPointToItems(x, y, distanceThreshold, this.item.id, includeOnlyVisibleItems);
    }

    handleCurveControlPointDrag(x, y, event) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.paths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex];
        const index = this.draggedObject.controlPointIndex;
        const oppositeIndex = index === 1 ? 2: 1;

        // Since control points are relative to their base curve points, we need to calculate their absolute world position
        // This way we can snap them to the grid and then recalculate the relative to base curve point in its local coords

        const snappedLocalAbsoluteCurvePoint = this.snapCurvePoint(
            -1,
            -1,
            curvePoint.x + this.originalCurvePaths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex][`x${index}`] + localPoint.x - localOriginalPoint.x,
            curvePoint.y + this.originalCurvePaths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex][`y${index}`] + localPoint.y - localOriginalPoint.y,
        );

        curvePoint[`x${index}`] = snappedLocalAbsoluteCurvePoint.x - curvePoint.x;
        curvePoint[`y${index}`] = snappedLocalAbsoluteCurvePoint.y - curvePoint.y;
        
        if (!(event.metaKey || event.ctrlKey || event.shiftKey)) {
            curvePoint[`x${oppositeIndex}`] = -curvePoint[`x${index}`];
            curvePoint[`y${oppositeIndex}`] = -curvePoint[`y${index}`];
        }
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.item, this.draggedObject.pathIndex, this.draggedObject.pointIndex, curvePoint);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
    }

    submitItem() {
        //TODO reimplement proper clean up when most points are deleted
        // if (this.item.shapeProps.points.length < 2) {
        //     this.schemeContainer.deleteItem(this.item);
        //     this.schemeContainer.reindexItems();
        //     this.reset();
        //     return;
        // }

        this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        this.schemeContainer.reindexItems();
        this.eventBus.emitItemChanged(this.item.id, 'area');
        this.eventBus.emitSchemeChangeCommited();
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
            EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
        }

        this.item.shapeProps.paths.forEach((path, pathId) => {
            path.points.forEach((point, pointId) => {
                const wolrdPoint = this.schemeContainer.worldPointOnItem(point.x, point.y, this.item);
                if (myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box)) {
                    StoreUtils.selectCurveEditPoint(this.store, pathId, pointId, true);
                }
            });
        });
        EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
    }

    proposeNewDestinationItemForConnector(item, mx, my) {
        StoreUtils.proposeConnectorDestinationItems(this.store, item.id, mx, my);
    }
}
