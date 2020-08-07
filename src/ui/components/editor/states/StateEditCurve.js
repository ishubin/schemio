/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import Shape from '../items/shapes/Shape.js';
import {enrichItemWithDefaults} from '../../../scheme/Item';

const IS_NOT_SOFT = false;
const IS_SOFT = true;


function isEventRightClick(event) {
    return event.button === 2;
}


export default class StateEditCurve extends State {
    constructor(eventBus) {
        super(eventBus);
        this.name = 'edit-curve';
        this.item = null;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.originalClickPoint = {x: 0, y: 0};
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
        this.draggedObject = null;
        this.draggedObjectOriginalPoint = null;
        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

        // Viewport transform correction 
        this.viewportTop = 0;
        this.viewportLeft = 0;
    }

    setViewportCorrection(viewportTop, viewportLeft) {
        this.viewportLeft = viewportLeft;
        this.viewportTop = viewportTop;
    }

    reset() {
        this.eventBus.emitItemsHighlighted([]);
        this.item = null;
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.draggedObject = null;
        this.draggedObjectOriginalPoint = null;
    }

    cancel() {
        this.eventBus.emitItemsHighlighted([]);
        if (this.creatingNewPoints) {
            // deleting last point
            this.item.shapeProps.points.splice(this.item.shapeProps.points.length - 1 , 1);
        }
        if (this.item.shapeProps.points.length > 0) {
            this.submitItem();
        }
        super.cancel();
    }

    setItem(item) {
        this.item = item;
        if (this.schemeContainer.findItemById(item.id)) {
            this.addedToScheme = true;
            this.creatingNewPoints = false;
        }
        this.updateCursor('crosshair');
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
            shape: 'curve',
            name: `${sourceItem.name} :: `,
            area: {x: 0, y: 0, w: 200, h: 200, r: 0, type: sourceItem.area.type}
        };
        enrichItemWithDefaults(curveItem);
        curveItem = this.schemeContainer.addItem(curveItem);
        curveItem.shapeProps.sourceItem = `#${sourceItem.id}`;

        const closestPoint = this.findClosestPointToItem(sourceItem, localPoint);
        curveItem.shapeProps.sourceItemPosition = closestPoint.distanceOnPath;
        curveItem.shapeProps.points = [{
            t: 'L', x: closestPoint.x, y: closestPoint.y
        }, {
            t: 'L', x: worldPoint.x, y: worldPoint.y
        }];

        this.item = curveItem;
        this.addedToScheme = true;
        this.creatingNewPoints = true;
        this.updateCursor('crosshair');
        return this.item;
    }

    findClosestPointToItem(item, localPoint) {
        const shape = Shape.find(item.shape);
        if (shape) {
            const path = shape.computeOutline(item);
            if (path) {
                const worldPoint = this.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, item);
                return this.schemeContainer.closestPointToSvgPath(item, path, worldPoint);
            }
        }
        return {
            x: item.area.w / 2,
            y: item.area.h / 2
        };
    }

    initFirstClick(x, y) {
        this.item.shapeProps.points = [{
            x, y, t: 'L'
        }, {
            x, y, t: 'L'
        }];

        this.schemeContainer.addItem(this.item);

        // in case user tried to attach source to another item
        this.handleEdgeCurvePointDrag(this.item.shapeProps.points[0], true);
        this.addedToScheme = true;
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (this.item.area.type === 'viewport') {
            x = mx - this.viewportLeft;
            y = my - this.viewportTop;
        }

        if (this.creatingNewPoints) {
            return;
        }
        if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
            return;
        }
        this.insertPointAtCoords(x, y);
    }

    mouseDown(x, y, mx, my, object, event) {
        if (this.item.area.type === 'viewport') {
            x = mx - this.viewportLeft;
            y = my - this.viewportTop;
        }

        this.originalClickPoint.x = x;
        this.originalClickPoint.y = y;

        if (!this.addedToScheme) {
            this.initFirstClick(x, y);
        } else if (this.creatingNewPoints) {

            // checking if the curve was attached to another item
            if (this.item.shapeProps.destinationItem) {
                if (this.item.shapeProps.sourceItem) {
                    this.item.name = this.createNameFromAttachedItems(this.item.shapeProps.sourceItem, this.item.shapeProps.destinationItem);
                }
                this.submitItem();
                return;
            }

            const point = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];
            point.x = x;
            point.y = y;

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

            this.candidatePointSubmited = true;
        } else {
            // editing existing curve
            if (isEventRightClick(event)) {
                this.handleRightClick(x, y, mx, my, object);
            } else if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
                this.draggedObjectOriginalPoint = utils.clone(this.item.shapeProps.points[object.pointIndex]);
                this.draggedObject = object;
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
        if (this.item.area.type === 'viewport') {
            x = mx - this.viewportLeft;
            y = my - this.viewportTop;
        }

        if (this.addedToScheme && this.creatingNewPoints) {
            const point = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];
            if (this.candidatePointSubmited) {
                // convert last point to Beizer and drag its control points
                point.t = 'B';
                point.x2 = x;
                point.y2 = y;

                point.x1 = 2*point.x - point.x2;
                point.y1 = 2*point.y - point.y2;
            } else {
                // drag last point
                point.x = x;
                point.y = y;
                this.shouldJoinClosedPoints = false;
                if (this.item.shapeProps.points.length > 2) {
                    const p0 = this.item.shapeProps.points[0];
                    const dx = point.x - p0.x;
                    const dy = point.y - p0.y;
                    
                    if (Math.sqrt(dx * dx + dy * dy) < 15) {
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
                this.handleEdgeCurvePointDrag(point, false);
            }
            this.eventBus.emitItemChanged(this.item.id);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-point') {
            this.handleCurvePointDrag(x, y, this.draggedObject.pointIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-control-point') {
            this.handleCurveControlPointDrag(x, y, event);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.item.area.type === 'viewport') {
            x = mx - this.viewportLeft;
            y = my - this.viewportTop;
        }

        this.eventBus.emitItemsHighlighted([]);

        if (this.addedToScheme && this.creatingNewPoints) {
            if (this.candidatePointSubmited) {
                this.candidatePointSubmited = false;
                this.item.shapeProps.points.push({
                    x, y, t: 'L'
                });
                this.eventBus.emitItemChanged(this.item.id);
            }
        }

        this.draggedObject = null;
        this.draggedObjectOriginalPoint = null;
    }

    handleRightClick(x, y, mx, my, object) {
        if (object && object.type === 'curve-point') {
            const point = this.item.shapeProps.points[object.pointIndex];
            if (!point) {
                return;
            }

            const menuOptions = [{
                name: 'Delete point',
                clicked: () => this.deletePoint(object.pointIndex)
            }];
            if (point.t === 'L') {
                menuOptions.push({
                    name: 'Convert to beizer point',
                    clicked: () => this.convertPointToBeizer(object.pointIndex)
                });
            }
            if (point.t === 'B') {
                menuOptions.push({
                    name: 'Convert to simple point',
                    clicked: () => this.convertPointToSimple(object.pointIndex)
                });
            }
            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);
        }
    }

    deletePoint(pointIndex) {
        this.item.shapeProps.points.splice(pointIndex, 1);
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
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
            this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
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
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
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

        point.x1 = point.x - dx;
        point.y1 = point.y - dy;
        point.x2 = point.x + dx;
        point.y2 = point.y + dy;
        point.t = 'B';
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
    }

    handleCurvePointDrag(x, y, pointIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[pointIndex];

        curvePoint.x = this.draggedObjectOriginalPoint.x + localPoint.x - localOriginalPoint.x;
        curvePoint.y = this.draggedObjectOriginalPoint.y + localPoint.y - localOriginalPoint.y;
        
        if (pointIndex === 0 || pointIndex === this.item.shapeProps.points.length - 1) {
            this.handleEdgeCurvePointDrag(curvePoint, pointIndex === 0);
        }

        if (curvePoint.t === 'B') {
            curvePoint.x1 = this.draggedObjectOriginalPoint.x1 + localPoint.x - localOriginalPoint.x;
            curvePoint.y1 = this.draggedObjectOriginalPoint.y1 + localPoint.y - localOriginalPoint.y;
            curvePoint.x2 = this.draggedObjectOriginalPoint.x2 + localPoint.x - localOriginalPoint.x;
            curvePoint.y2 = this.draggedObjectOriginalPoint.y2 + localPoint.y - localOriginalPoint.y;
        }
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
    }

    /**
     * Handles dragging of edge point and checks whether it should stick to other item
     * This is the most time consuming function as it needs to look through all items in schemes
     * @param {Point} curvePoint 
     * @param {Boolean} isSource 
     */
    handleEdgeCurvePointDrag(curvePoint, isSource) {
        const worldCurvePoint = this.schemeContainer.worldPointOnItem(curvePoint.x, curvePoint.y, this.item);
        const distanceThreshold = 10;

        const includeOnlyVisibleItems = true;
        const closestPointToItem = this.schemeContainer.findClosestPointToItems(worldCurvePoint.x, worldCurvePoint.y, distanceThreshold, this.item.id, includeOnlyVisibleItems, this.item.area.type);
        if (closestPointToItem) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.item);
            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;
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
    }

    handleCurveControlPointDrag(x, y, event) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[this.draggedObject.pointIndex];
        
        const index = this.draggedObject.controlPointIndex;
        const oppositeIndex = index === 1 ? 2: 1;
        
        curvePoint[`x${index}`] = this.draggedObjectOriginalPoint[`x${index}`] + localPoint.x - localOriginalPoint.x;
        curvePoint[`y${index}`] = this.draggedObjectOriginalPoint[`y${index}`] + localPoint.y - localOriginalPoint.y;
        
        if (!(event.metaKey || event.ctrlKey || event.shiftKey)) {
            curvePoint[`x${oppositeIndex}`] = curvePoint.x * 2 - curvePoint[`x${index}`];
            curvePoint[`y${oppositeIndex}`] = curvePoint.y * 2 - curvePoint[`y${index}`];
        }
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT);
    }

    submitItem() {
        if (this.item.shapeProps.points.length < 2) {
            this.schemeContainer.deleteItem(this.item);
            this.schemeContainer.reindexItems();
            this.reset();
            return;
        }

        this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT);
        this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
        this.eventBus.emitItemChanged(this.item.id);
        this.eventBus.emitSchemeChangeCommited();
        this.schemeContainer.reindexItems();
        this.schemeContainer.selectItem(this.item);
        this.reset();
    }

}
