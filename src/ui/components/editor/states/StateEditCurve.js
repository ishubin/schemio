/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import {forEach} from 'lodash';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import Shape from '../items/shapes/Shape.js';


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
    }

    reset() {
        this.item = null;
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.draggedObject = null;
        this.draggedObjectOriginalPoint = null;
    }

    cancel() {
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

    initFirstClick(x, y) {
        this.item.shapeProps.points = [{
            x, y, t: 'L'
        }, {
            x, y, t: 'L'
        }];

        this.schemeContainer.addItem(this.item);
        this.addedToScheme = true;
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

        if (!this.addedToScheme) {
            this.initFirstClick(x, y);
        } else if (this.creatingNewPoints) {
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
            if (isEventRightClick(event)) {
                this.handleRightClick(x, y, mx, my, object);
            } else if (object && (object.type === 'curve-point' || object.type === 'curve-control-point')) {
                this.draggedObjectOriginalPoint = utils.clone(this.item.shapeProps.points[object.pointIndex]);
                this.draggedObject = object;
            }
        }
    }

    mouseMove(x, y, mx, my, object, event) {
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
                        this.shouldJoinClosedPoints = true;
                    }
                }
            }
            this.eventBus.emitItemChanged(this.item.id);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-point') {
            this.handleCurvePointDrag(x, y);
        } else if (this.draggedObject && this.draggedObject.type === 'curve-control-point') {
            this.handleCurveControlPointDrag(x, y, event);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
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
    }

    convertPointToBeizer(pointIndex) {
        const point = this.item.shapeProps.points[pointIndex];
        if (!point) {
            return;
        }
        
        let dx = 10, dy = 0;
        if (this.item.shapeProps.points.length > 2) {
            // calculating dx and dy via previos and next points
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
    }

    handleCurvePointDrag(x, y) {
        const localOiriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[this.draggedObject.pointIndex];
        curvePoint.x = this.draggedObjectOriginalPoint.x + localPoint.x - localOiriginalPoint.x;
        curvePoint.y = this.draggedObjectOriginalPoint.y + localPoint.y - localOiriginalPoint.y;
        if (curvePoint.t === 'B') {
            curvePoint.x1 = this.draggedObjectOriginalPoint.x1 + localPoint.x - localOiriginalPoint.x;
            curvePoint.y1 = this.draggedObjectOriginalPoint.y1 + localPoint.y - localOiriginalPoint.y;
            curvePoint.x2 = this.draggedObjectOriginalPoint.x2 + localPoint.x - localOiriginalPoint.x;
            curvePoint.y2 = this.draggedObjectOriginalPoint.y2 + localPoint.y - localOiriginalPoint.y;
        }
        this.eventBus.emitItemChanged(this.item.id);
    }

    handleCurveControlPointDrag(x, y, event) {
        const localOiriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);
        const curvePoint = this.item.shapeProps.points[this.draggedObject.pointIndex];
        
        const index = this.draggedObject.controlPointIndex;
        const oppositeIndex = index === 1 ? 2: 1;
        
        curvePoint[`x${index}`] = this.draggedObjectOriginalPoint[`x${index}`] + localPoint.x - localOiriginalPoint.x;
        curvePoint[`y${index}`] = this.draggedObjectOriginalPoint[`y${index}`] + localPoint.y - localOiriginalPoint.y;
        
        if (!(event.metaKey || event.ctrlKey || event.shiftKey)) {
            curvePoint[`x${oppositeIndex}`] = curvePoint.x * 2 - curvePoint[`x${index}`];
            curvePoint[`y${oppositeIndex}`] = curvePoint.y * 2 - curvePoint[`y${index}`];
        }
        this.eventBus.emitItemChanged(this.item.id);
    }

    submitItem() {
        this.readjustItemArea();
        this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
        this.eventBus.emitItemChanged(this.item.id);
        this.eventBus.emitSchemeChangeCommited();
        this.schemeContainer.selectItem(this.item);
        this.reset();
    }

    readjustItemArea() {
        if (this.item.shapeProps.points.length < 1) {
            return;
        }

        let minX = this.item.shapeProps.points[0].x + this.item.area.x,
            minY = this.item.shapeProps.points[0].y + this.item.area.y,
            maxX = minX,
            maxY = minY;

        forEach(this.item.shapeProps.points, point => {
            minX = Math.min(minX, point.x + this.item.area.x);
            minY = Math.min(minY, point.y + this.item.area.y);
            maxX = Math.max(maxX, point.x + this.item.area.x);
            maxY = Math.max(maxY, point.y + this.item.area.y);
            if (point.t === 'B') {
                minX = Math.min(minX, point.x1 + this.item.area.x, point.x2 + this.item.area.x);
                minY = Math.min(minY, point.y1 + this.item.area.y, point.y2 + this.item.area.y);
                maxX = Math.max(maxX, point.x1 + this.item.area.x, point.x2 + this.item.area.x);
                maxY = Math.max(maxY, point.y1 + this.item.area.y, point.y2 + this.item.area.y);
            }
        });

        const dx = this.item.area.x - minX;
        const dy = this.item.area.y - minY;
        this.item.area.x = minX;
        this.item.area.y = minY;
        this.item.area.w = maxX - minX;
        this.item.area.h = maxY - minY;

        forEach(this.item.shapeProps.points, point => {
            point.x += dx;
            point.y += dy;
            if (point.t === 'B') {
                point.x1 += dx;
                point.y1 += dy;
                point.x2 += dx;
                point.y2 += dy;
            }
        });
    }
}
