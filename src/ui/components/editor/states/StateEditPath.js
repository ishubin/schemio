/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import {SubState, DragScreenState, MultiSelectState, isEventMiddleClick, isEventRightClick, isMultiSelectKey} from './State.js';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import { Keys } from '../../../events.js';
import StoreUtils from '../../../store/StoreUtils.js';
import EventBus from '../EventBus.js';
import { localPointOnItem, localPointOnItemToLocalPointOnOtherItem, worldPointOnItem } from '../../../scheme/SchemeContainer.js';
import { convertCurvePointToItemScale, convertCurvePointToRelative, PATH_POINT_CONVERSION_SCALE } from '../items/shapes/StandardCurves.js';
import History from '../../../history/History.js';

const IS_SOFT = true;

const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

function isValidObject(object) {
    return object && (object.type === 'path-point' || object.type === 'path-control-point' || object.type === 'path-segment');
}


function forAllPoints(item, callback) {
    item.shapeProps.paths.forEach((path, pathIndex) => {
        path.points.forEach((point, pointIndex) => {
            callback(point, pathIndex, pointIndex);
        });
    });
}

function findCubicBezierExtremumValues(a, b, c, d) {
    // the idea here is to take a cubic bezier formula for 4 values
    // and then create a differential of it.
    // if differential is equal zero - then that is the extremum point
    // so we need to find such t values that dF(t) gives 0
    // where dF(t) is a differential of the cubic bezier function
    const k1 = d + 3*(b - c) - a,
          k2 = 3 * (a - 2*b + c),
          k3 = 3 * (b - a);

    const D = (4*k2*k2) - 12 * k1 * k3;
    if (D <= 0) {
        return [];
    }
    const sqrtD = Math.sqrt(D);

    const t1 = (-2 * k2 + sqrtD) / (6*k1);
    const t2 = (-2 * k2 - sqrtD) / (6*k1);

    const extremums = [];
    const bezierValue = (t) => {
        return a*(1-t)*(1-t)*(1-t) + b*3*t*(1-t)*(1-t) + 3*c*t*t*(1-t) + t*t*t*d;
    }
    if (t1 >=0 && t1 <= 1) {
        extremums.push(bezierValue(t1));
    }
    if (t2 >=0 && t2 <= 1) {
        extremums.push(bezierValue(t2));
    }
    return extremums;
}

function findQuadraticBezierExtremumValues(a, b, c) {
    // the idea is the same as in cubic bezier function above
    // but since it is only 3 values, we have to take a quadratic bezier function.
    // a quadratic bezier function can only generate one extremum value
    const denom = a - 2*b + c;
    if (myMath.tooSmall(denom)) {
        return [];
    }

    const t = (c - b) / denom;
    if (t >= 0 && t <= 1) {
        return [a*t*t + 2*b*t*(1-t) + c*(1 - t)*(1 - t)];
    }
    return [];
}

// this function is used when state is canceled
// since points could be moved out of the item area we need to readjust item area together with the points
// so that when we select its item - its edit box is displayed correctly (all points should fit in the edit box)
export function readjustItemAreaAndPoints(item) {
    const {w, h} = item.area;
    let bounds = null;

    const updateBoundsX = (x) => {
        bounds.x1 = Math.min(bounds.x1, x);
        bounds.x2 = Math.max(bounds.x2, x);
    }

    const updateBoundsY = (y) => {
        bounds.y1 = Math.min(bounds.y1, y);
        bounds.y2 = Math.max(bounds.y2, y);
    }

    const updateBounds = (x, y) => {
        if (!bounds) {
            bounds = {
                x1: x,
                y1: y,
                x2: x,
                y2: y
            };
        } else {
            updateBoundsX(x);
            updateBoundsY(y);
        }
    };

    const worldPoints = [];

    forAllPoints(item, (p, pathIndex, pointIndex) => {
        if (pointIndex === 0) {
            worldPoints[pathIndex] = [];
        }
        const lp = convertCurvePointToItemScale(p, w, h);
        updateBounds(lp.x, lp.y);

        const wp = worldPointOnItem(lp.x, lp.y, item);
        wp.t = p.t;

        let lp2 = null;
        if (pointIndex === item.shapeProps.paths[pathIndex].points.length - 1) {
            if (item.shapeProps.paths[pathIndex].closed) {
                lp2 = convertCurvePointToItemScale(item.shapeProps.paths[pathIndex].points[0], w, h);
            }
        } else {
            lp2 = convertCurvePointToItemScale(item.shapeProps.paths[pathIndex].points[pointIndex+1], w, h);
        }

        if (p.t === 'B' || (lp2 && lp2.t === 'B')) {
            const wp1 = worldPointOnItem(lp.x + lp.x1, lp.y + lp.y1, item);
            wp.x1 = wp1.x;
            wp.y1 = wp1.y;

            const wp2 = worldPointOnItem(lp.x + lp.x2, lp.y + lp.y2, item);
            wp.x2 = wp2.x;
            wp.y2 = wp2.y;

            if (p.t === 'B' && lp2 && lp2.t === 'B') {
                findCubicBezierExtremumValues(lp.x, lp.x + lp.x2, lp2.x + lp2.x1, lp2.x).forEach(updateBoundsX);
                findCubicBezierExtremumValues(lp.y, lp.y + lp.y2, lp2.y + lp2.y1, lp2.y).forEach(updateBoundsY);
            } else if (p.t === 'B' && lp2) {
                findQuadraticBezierExtremumValues(lp.x, lp.x + lp.x2, lp2.x).forEach(updateBoundsX);
                findQuadraticBezierExtremumValues(lp.y, lp.y + lp.y2, lp2.y).forEach(updateBoundsY);
            } else if (p.t !== 'B' && lp2 && lp2.t === 'B') {
                findQuadraticBezierExtremumValues(lp.x, lp2.x + lp2.x1, lp2.x).forEach(updateBoundsX);
                findQuadraticBezierExtremumValues(lp.y, lp2.y + lp2.y1, lp2.y).forEach(updateBoundsY);
            }
        }
        if (p.t === 'A' && lp2) {
            // the idea here is to calculate bounding points ot a circle
            // first we calculate its radius and then its center
            // once we know radius and a center, we calculate north/west/east/south side points of the circle
            // We then draw an imaginary line that goes from points P1 and P2 and divides the space into two zones
            // We only take those side points into account that lie in the same zone towards the line as the control point of the circle
            wp.h = p.h;
            const L = myMath.distanceBetweenPoints(lp.x, lp.y, lp2.x, lp2.y);
            const H = L * p.h / 100;

            if (!myMath.tooSmall(H) && !myMath.tooSmall(L)) {
                const r = Math.abs(H / 2 + L * L / (8 * H));
                const extremumPoints = [
                    {x: 0, y: r},
                    {x: 0, y: -r},
                    {x: r, y: 0},
                    {x: -r, y: 0},
                ];
                const line = myMath.createLineEquation(lp.x, lp.y, lp2.x, lp2.y);
                const c1 = {
                    x: (lp2.x + lp.x) / 2,
                    y: (lp2.y + lp.y) / 2,
                };

                const v = myMath.rotateVector90CounterClockwise((lp2.x - lp.x) / L, (lp2.y - lp.y) / L);
                const p3 = {
                    x: c1.x + v.x * H,
                    y: c1.y + v.y * H,
                };

                if (H < 0) {
                    v.x = -v.x;
                    v.y = -v.y;
                }
                const cx = c1.x + v.x * (Math.abs(H) - r);
                const cy = c1.y + v.y * (Math.abs(H) - r);

                const sideP3 = myMath.identifyPointSideAgainstLine(p3.x, p3.y, line);

                extremumPoints.forEach(ep => {
                    ep.x += cx;
                    ep.y += cy;
                    if (sideP3 * myMath.identifyPointSideAgainstLine(ep.x, ep.y, line) > 0) {
                        updateBounds(ep.x, ep.y);
                    }
                });
            }
        }
        worldPoints[pathIndex][pointIndex] = wp;
    });


    const boundsWorldPoint = worldPointOnItem(bounds.x1, bounds.y1, item);

    item.area.w = Math.max(0, bounds.x2 - bounds.x1);
    item.area.h = Math.max(0, bounds.y2 - bounds.y1);

    const position = myMath.findTranslationMatchingWorldPoint(boundsWorldPoint.x, boundsWorldPoint.y, 0, 0, item.area, item.meta.transformMatrix);
    item.area.x = position.x;
    item.area.y = position.y;

    forAllPoints(item, (p, pathIndex, pointIndex) => {
        const wp = worldPoints[pathIndex][pointIndex];
        const lp = localPointOnItem(wp.x, wp.y, item);
        lp.t = wp.t;
        if (lp.t === 'B') {
            const lp1 = localPointOnItem(wp.x1, wp.y1, item);
            lp.x1 = lp1.x - lp.x;
            lp.y1 = lp1.y - lp.y;
            const lp2 = localPointOnItem(wp.x2, wp.y2, item);
            lp.x2 = lp2.x - lp.x;
            lp.y2 = lp2.y - lp.y;
        }
        if (p.t === 'A') {
            lp.h = p.h;
        }
        item.shapeProps.paths[pathIndex].points[pointIndex] = convertCurvePointToRelative(lp, item.area.w, item.area.h);
    });
}

function ensureCorrectAreaOfPathItem(item) {
    if (item.area.w > 100 && item.area.h > 100) {
        return;
    }

    const w = Math.max(100, item.area.w);
    const h = Math.max(100, item.area.h);

    if (item.shapeProps.paths.length > 0 && item.shapeProps.paths[0].points.length > 0) {
        const firstLocalPoint = convertCurvePointToItemScale(item.shapeProps.paths[0].points[0], item.area.w, item.area.h);
        const worldPoint = worldPointOnItem(firstLocalPoint.x, firstLocalPoint.y, item);

        forAllPoints(item, (p, pathIndex, pointIndex) => {
            const lp = convertCurvePointToItemScale(p, item.area.w, item.area.h);
            item.shapeProps.paths[pathIndex].points[pointIndex] = convertCurvePointToRelative(lp, w, h);
        });

        item.area.w = w;
        item.area.h = h;

        // the following is need for rotation compensation. if an item is rotated and we change its width and height, then all points will be displaced
        // since they were adjusted already relatively for item area
        const firstConvertedLocalPoint = convertCurvePointToItemScale(item.shapeProps.paths[0].points[0], item.area.w, item.area.h);
        const pos = myMath.findTranslationMatchingWorldPoint(worldPoint.x, worldPoint.y, firstConvertedLocalPoint.x, firstConvertedLocalPoint.y, item.area, item.meta.transformMatrix);
        item.area.x = pos.x;
        item.area.y = pos.y;
    }
}

export function mergeAllItemPaths(mainItem, otherItems) {
    otherItems.sort((a, b) => {
        return a.meta.ancestorIds.length - b.meta.ancestorIds.length;
    });

    ensureCorrectAreaOfPathItem(mainItem);

    for (let i = 0; i < otherItems.length; i++) {
        ensureCorrectAreaOfPathItem(otherItems[i]);
        otherItems[i].shapeProps.paths.forEach(path => {
            const newPath = {
                pos: 'relative',
                closed: path.closed,
                points: []
            };
            path.points.forEach(relativePoint => {
                const point = convertCurvePointToItemScale(relativePoint, otherItems[i].area.w, otherItems[i].area.h);
                const p = localPointOnItemToLocalPointOnOtherItem(point.x, point.y, otherItems[i], mainItem);
                p.t = point.t;
                if (point.hasOwnProperty('x1')) {
                    const p1 = localPointOnItemToLocalPointOnOtherItem(point.x + point.x1, point.y + point.y1, otherItems[i], mainItem);
                    p.x1 = p1.x - p.x;
                    p.y1 = p1.y - p.y;
                }
                if (point.hasOwnProperty('x2')) {
                    const p2 = localPointOnItemToLocalPointOnOtherItem(point.x + point.x2, point.y + point.y2, otherItems[i], mainItem);
                    p.x2 = p2.x - p.x;
                    p.y2 = p2.y - p.y;
                }
                newPath.points.push(convertCurvePointToRelative(p, mainItem.area.w, mainItem.area.h));
            });
            mainItem.shapeProps.paths.push(newPath);
        });
    }
    readjustItemAreaAndPoints(mainItem);
}

const MOUSE_MOVE_THRESHOLD = 3;

class BezierConversionState extends SubState {
    constructor(parentState, point, pathId, pointId) {
        super(parentState, 'bezier-conversion');
        this.point = point;
        this.pathId = pathId;
        this.pointId = pointId;
        this.item = parentState.item;
    }

    mouseMove(x, y, mx, my, object, event) {
        this.updateBezierPoint(x, y);
    }

    updateBezierPoint(x, y) {
        const lp = this.schemeContainer.localPointOnItem(x, y, this.item);
        const relativePoint = convertCurvePointToRelative(this.parentState.snapCurvePoint(-1, -1, lp.x, lp.y), this.item.area.w, this.item.area.h);
        this.point.t = 'B';
        this.point.x2 = this.round(relativePoint.x - this.point.x);
        this.point.y2 = this.round(relativePoint.y - this.point.y);

        this.point.x1 = -this.point.x2;
        this.point.y1 = -this.point.y2;

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.item, this.pathId, this.pointId, this.point);
    }
    
    mouseUp(x, y, mx, my, object, event) {
        this.updateBezierPoint(x, y);
        const newPoint = convertCurvePointToRelative(localPointOnItem(x, y, this.item), this.item.area.w, this.item.area.h);
        newPoint.t = 'L';
        this.item.shapeProps.paths[this.pathId].points.push(newPoint);
        this.migrate(new CreatingPathState(this.parentState, this.pathId));
    }
}

class CreatingPathState extends SubState {
    constructor(parentState, pathId) {
        super(parentState, 'creating-path');
        this.item = parentState.item;
        this.pathId = pathId;
        this.shouldClosePath = false;
        this.mouseIsDown = false;
        this.originalMouseX = 0;
        this.originalMouseY = 0;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.migrate(new DragScreenState(this.parentState));
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        this.originalMouseX = mx;
        this.originalMouseY = my;
        this.mouseIsDown = true;

        if (this.pathId >= this.item.shapeProps.paths.length) {
            this.item.shapeProps.paths.push({
                closed: false,
                points: [],
                pos: 'relative'
            });
        }

        const localPoint = localPointOnItem(x, y, this.item);
        const snappedCurvePoint = this.parentState.snapCurvePoint(this.pathId, 0, localPoint.x, localPoint.y);

        const points = this.item.shapeProps.paths[this.pathId].points;

        const convertedCurvePoint = convertCurvePointToRelative({
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        }, this.item.area.w, this.item.area.h);

        if (points.length === 0) {
            points.push(convertedCurvePoint);
        } else {
            const pointId = points.length - 1;
            points[pointId].x = convertedCurvePoint.x;
            points[pointId].y = convertedCurvePoint.y;

            this.snapToFirstPoint(points[pointId]);
        }

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.parentState.historyCommit();
    }

    snapToFirstPoint(point) {
        if (this.item.shapeProps.paths[this.pathId].points.length > 2) {
            const firstPoint = this.item.shapeProps.paths[this.pathId].points[0];
            const dx = (point.x - firstPoint.x) * this.item.area.w / PATH_POINT_CONVERSION_SCALE;
            const dy = (point.y - firstPoint.y) * this.item.area.h / PATH_POINT_CONVERSION_SCALE;
            
            if (Math.sqrt(dx * dx + dy * dy) * this.getSchemeContainer().screenTransform.scale <= 5) {
                point.x = firstPoint.x;
                point.y = firstPoint.y;
                this.shouldClosePath = true;
            } else {
                this.shouldClosePath = false;
            }
        }

    }
    
    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);
        if (this.item.shapeProps.paths.length > this.pathId && this.item.shapeProps.paths[this.pathId].points.length > 0) {
            const pointId = this.item.shapeProps.paths[this.pathId].points.length - 1;
            const point = this.item.shapeProps.paths[this.pathId].points[pointId];

            if (this.mouseIsDown && Math.max(Math.abs(mx - this.originalMouseX), Math.abs(my - this.originalMouseY)) > MOUSE_MOVE_THRESHOLD) {
                this.migrate(new BezierConversionState(this.parentState, point, this.pathId, pointId));
                return;
            } else {
                const localPoint = localPointOnItem(x, y, this.item);
                const snappedCurvePoint = this.parentState.snapCurvePoint(this.pathId, pointId, localPoint.x, localPoint.y);
                const convertedCurvePoint = convertCurvePointToRelative({
                    x: snappedCurvePoint.x,
                    y: snappedCurvePoint.y,
                    t: 'L'
                }, this.item.area.w, this.item.area.h);

                point.x = convertedCurvePoint.x;
                point.y = convertedCurvePoint.y;

                this.snapToFirstPoint(point);

                this.eventBus.emitItemChanged(this.item.id);
                StoreUtils.updateCurveEditPoint(this.store, this.item, this.pathId, pointId, point);
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);
        this.mouseIsDown = false;
        if (this.shouldClosePath) {
            this.item.shapeProps.paths[this.pathId].closed = true;
            this.shouldClosePath = false;
            this.cancel();
            return;
        }

        const localPoint = localPointOnItem(x, y, this.item);
        const convertedCurvePoint = convertCurvePointToRelative({
            x: localPoint.x,
            y: localPoint.y,
            t: 'L'
        }, this.item.area.w, this.item.area.h);

        this.item.shapeProps.paths[this.pathId].points.push(convertedCurvePoint);

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
    }

    reset() {
        if (this.pathId < this.item.shapeProps.paths.length) {
            if (this.item.shapeProps.paths[this.pathId].points.length > 0) {
                this.item.shapeProps.paths[this.pathId].points.pop();
            }
        }
    }
}

class DragObjectState extends SubState {
    constructor(parentState, draggedObject, originalX, originalY) {
        super(parentState, 'drag-object');
        this.draggedObject = draggedObject;
        this.item = parentState.item;
        this.schemeContainer = parentState.schemeContainer;
        this.originalClickPoint = {
            x: originalX,
            y: originalY
        };
        this.originalCurvePaths = utils.clone(this.item.shapeProps.paths);
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        StoreUtils.clearItemSnappers(this.store);

        if (this.draggedObject && this.draggedObject.type === 'path-point') {
            this.handleCurvePointDrag(x, y, this.draggedObject.pathIndex, this.draggedObject.pointIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'path-segment') {
            this.handleCurvePathDrag(x, y, this.draggedObject.pathIndex);
        } else if (this.draggedObject && this.draggedObject.type === 'path-control-point') {
            this.handleCurveControlPointDrag(x, y, event);
        }
    }
    
    mouseUp(x, y, mx, my, object, event) {
        this.parentState.historyCommit();
        StoreUtils.clearItemSnappers(this.store);
        this.migrateToPreviousSubState();
    }

    snapCurvePoint(pathId, pointId, x, y) {
        return this.parentState.snapCurvePoint(pathId, pointId, x, y);
    }

    _cx(x) {
        return x * PATH_POINT_CONVERSION_SCALE / this.item.area.w;
    }

    _cy(y) {
        return y * PATH_POINT_CONVERSION_SCALE / this.item.area.h;
    }

    cx_(x) {
        return x * this.item.area.w / PATH_POINT_CONVERSION_SCALE;
    }

    cy_(y) {
        return y * this.item.area.h / PATH_POINT_CONVERSION_SCALE;
    }

    handleCurvePointDrag(x, y, pathIndex, pointIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);

        const snappedLocalCurvePoint = this.snapCurvePoint(
            pathIndex,
            pointIndex,
            this.cx_(this.originalCurvePaths[pathIndex].points[pointIndex].x) + localPoint.x - localOriginalPoint.x,
            this.cy_(this.originalCurvePaths[pathIndex].points[pointIndex].y) + localPoint.y - localOriginalPoint.y
        );

        const curvePoint = this.item.shapeProps.paths[pathIndex].points[pointIndex];
        curvePoint.x = this._cx(snappedLocalCurvePoint.x);
        curvePoint.y = this._cy(snappedLocalCurvePoint.y);

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

    handleCurveControlPointDrag(x, y, event) {
        const curvePoint = this.item.shapeProps.paths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex];
        if (curvePoint.t === 'A') {
            this.handleArcControlPointDrag(x, y, event);
            return;
        }

        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);

        const index = this.draggedObject.controlPointIndex;
        const oppositeIndex = index === 1 ? 2: 1;

        // Since control points are relative to their base curve points, we need to calculate their absolute world position
        // This way we can snap them to the grid and then recalculate the relative to base curve point in its local coords

        const snappedLocalAbsoluteCurvePoint = this.snapCurvePoint(
            -1,
            -1,
            this.cx_(curvePoint.x + this.originalCurvePaths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex][`x${index}`]) + localPoint.x - localOriginalPoint.x,
            this.cy_(curvePoint.y + this.originalCurvePaths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex][`y${index}`]) + localPoint.y - localOriginalPoint.y,
        );

        curvePoint[`x${index}`] = this._cx(snappedLocalAbsoluteCurvePoint.x) - curvePoint.x;
        curvePoint[`y${index}`] = this._cy(snappedLocalAbsoluteCurvePoint.y) - curvePoint.y;
        
        if (curvePoint.t === 'B' && !(event.metaKey || event.ctrlKey || event.shiftKey)) {
            curvePoint[`x${oppositeIndex}`] = -curvePoint[`x${index}`];
            curvePoint[`y${oppositeIndex}`] = -curvePoint[`y${index}`];
        }
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.item, this.draggedObject.pathIndex, this.draggedObject.pointIndex, curvePoint);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
    }

    handleArcControlPointDrag(x, y, event) {
        const point = this.item.shapeProps.paths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex];

        let nextPoint = null;
        if (this.draggedObject.pointIndex >= this.item.shapeProps.paths[this.draggedObject.pathIndex].points.length - 1) {
            nextPoint = this.item.shapeProps.paths[this.draggedObject.pathIndex].points[0];
        } else {
            nextPoint = this.item.shapeProps.paths[this.draggedObject.pathIndex].points[this.draggedObject.pointIndex + 1];
        }

        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);

        const p2 = convertCurvePointToItemScale(nextPoint, this.item.area.w, this.item.area.h);
        const p1 = convertCurvePointToItemScale(point, this.item.area.w, this.item.area.h);

        const chordLength = myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y);
        const line = myMath.createLineEquation(p1.x, p1.y, p2.x, p2.y);

        const H = myMath.distanceFromPointToLine(localPoint.x, localPoint.y, line);
        if (!myMath.tooSmall(chordLength)) {
            point.h = -H / chordLength * 100 * myMath.identifyPointSideAgainstLine(localPoint.x, localPoint.y, line);
        }

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateCurveEditPoint(this.store, this.item, this.draggedObject.pathIndex, this.draggedObject.pointIndex, point);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
    }

    handleCurvePathDrag(x, y, pathIndex) {
        const localOriginalPoint = this.schemeContainer.localPointOnItem(this.originalClickPoint.x, this.originalClickPoint.y, this.item);
        const localPoint = this.schemeContainer.localPointOnItem(x, y, this.item);

        const convertedPoint = convertCurvePointToRelative({
            x: localPoint.x - localOriginalPoint.x,
            y: localPoint.y - localOriginalPoint.y
        }, this.item.area.w, this.item.area.h);

        const dx = convertedPoint.x;
        const dy = convertedPoint.y;

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
}


class IdleState extends SubState {
    constructor(parentState, contextMenuHandler) {
        super(parentState, 'idle');
        this.clickedObject = null;
        this.shouldSelectOnlyOne = false;
        this.contextMenuHandler = contextMenuHandler;
    }

    reset() {
        this.clickedObject = null;
        this.shouldSelectOnlyOne = false;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.migrate(new DragScreenState(this.parentState));
        }
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (object && object.type === 'path-segment') {
            this.parentState.insertPointAtCoords(x, y, object.pathIndex, object.segmentIndex);
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        if (isEventMiddleClick(event)) {
            this.migrate(new DragScreenState(this.parentState, {x, y, mx, my}));
            return;
        }

        if (!this.parentState.item.id) {
            this.getSchemeContainer().addItem(this.parentState.item);
            const newSubState = new CreatingPathState(this.parentState, 0);
            this.migrate(newSubState);
            newSubState.mouseDown(x, y, mx, my, object, event);
            return;
        }

        if (isEventRightClick(event)) {
            this.contextMenuHandler(x, y, mx, my, object, event)
        } else {
            if (object) {
                this.clickedObject = object;
            }
            if (object && (object.type === 'path-point' || object.type === 'path-control-point')) {
                if (!StoreUtils.getCurveEditPaths(this.store)[object.pathIndex].points[object.pointIndex].selected) {
                    StoreUtils.selectCurveEditPoint(this.store, object.pathIndex, object.pointIndex, isMultiSelectKey(event));
                    EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
                } else {
                    if (!isMultiSelectKey(event)) {
                        this.shouldSelectOnlyOne = true;
                    }
                }
            } else if (object && object.type === 'path-segment') {
                this.selectPath(object, true);
            }
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.clickedObject && 
            (this.clickedObject.type === 'path-point' || this.clickedObject.type === 'path-control-point' || this.clickedObject.type === 'path-segment')) {
            this.migrate(new DragObjectState(this.parentState, this.clickedObject, x, y));
            this.reset();
            return;
        } else if (this.clickedObject && !isValidObject(this.clickedObject)) {
            this.reset();
            this.migrate(new MultiSelectState(this.parentState, x, y, mx, my, (box, inclusive) => this.selectByBoundaryBox(box, inclusive)));
            return;
        }
    }

    selectByBoundaryBox(box, inclusive) {
        if (!inclusive) {
            StoreUtils.resetCurveEditPointSelection(this.store);
            EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
        }

        this.parentState.item.shapeProps.paths.forEach((path, pathId) => {
            path.points.forEach((point, pointId) => {
                const localPoint = convertCurvePointToItemScale(point, this.parentState.item.area.w, this.parentState.item.area.h);
                const wolrdPoint = this.parentState.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, this.parentState.item);
                if (myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box)) {
                    StoreUtils.selectCurveEditPoint(this.store, pathId, pointId, true);
                }
            });
        });
        EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
    }
    
    mouseUp(x, y, mx, my, object, event) {
        if (this.clickedObject && this.clickedObject.type === 'path-segment') {
            // making sure that only 
            this.selectPath(object, false);
        } else if (this.shouldSelectOnlyOne && this.clickedObject) {
            if (this.clickedObject.type === 'path-point') {
                StoreUtils.selectCurveEditPoint(this.store, object.pathIndex, object.pointIndex, false);
                EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
            }
        } else if (this.clickedObject && !isValidObject(this.clickedObject)) {
            StoreUtils.resetCurveEditPointSelection(this.store);
        }
        this.reset();
    }

    selectPath(object, isInclusive) {
        if (!isInclusive) {
            StoreUtils.resetCurveEditPointSelection(this.store);
        }
        for (let i = 0; i < this.parentState.item.shapeProps.paths[object.pathIndex].points.length; i++) {
            StoreUtils.selectCurveEditPoint(this.store, object.pathIndex, i, true);
        }
        EventBus.$emit(EventBus.CURVE_EDIT_POINTS_UPDATED);
    }
}

export default class StateEditPath extends State {
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'editPath';
        this.item = null;
        this.history = new History();
    }

    reset() {
        this.eventBus.emitItemsHighlighted([]);
        this.item = null;
        this.history = new History({size: 100});
        this.updateHistoryState();
        this.migrateSubState(new IdleState(this, (x, y, mx, my, object, event) => this.contextMenuHandler(x, y, mx, my, object, event)));
        this.resetPreviousSubStates();
    }

    historyCommit() {
        this.history.commit(this.item.shapeProps.paths);
        this.updateHistoryState();
    }

    updateHistoryState() {
        this.store.dispatch('setHistoryUndoable', this.history.undoable());
        this.store.dispatch('setHistoryRedoable', this.history.redoable());
    }

    undo() {
        const paths = this.history.undo();
        this.item.shapeProps.paths = paths;
        EventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.updateHistoryState();
    }

    redo() {
        const paths = this.history.redo();
        this.item.shapeProps.paths = paths;
        EventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.updateHistoryState();
    }

    cancel() {
        if (this.subState) {
            this.subState.reset();
        }
        this.eventBus.emitItemsHighlighted([]);
        if (this.item && this.item.id) {
            const paths = this.item.shapeProps.paths;
            for (let i = paths.length - 1; i >= 0; i--) {
                const points = paths[i].points;
                if (points.length < 2) {
                    paths.splice(i, 1);
                }
            }
            
            if (paths.length === 0) {
                this.schemeContainer.deleteItem(this.item);
            } else {
                const childWorldPositions = [];
                if (this.item.childItems) {
                    this.item.childItems.forEach(childItem => {
                        childWorldPositions.push(worldPointOnItem(0, 0, childItem));
                    });
                }
                readjustItemAreaAndPoints(this.item);
                this.schemeContainer.readjustItem(this.item.id, false, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());

                if (this.item.childItems) {
                    const parentTransform = myMath.standardTransformWithArea(this.item.meta.transformMatrix, this.item.area);

                    // fixing child items positions as the parent item area has changed
                    this.item.childItems.forEach((childItem, i) => {
                        const localPoint = myMath.findTranslationMatchingWorldPoint(childWorldPositions[i].x, childWorldPositions[i].y, 0, 0, childItem.area, parentTransform);
                        if (localPoint) {
                            childItem.area.x = localPoint.x;
                            childItem.area.y = localPoint.y;
                        }
                    });
                }
                this.schemeContainer.reindexItems();
            }
            this.schemeContainer.updateMultiItemEditBox();
        }
        super.cancel();
    }

    setItem(item) {
        this.item = item;
        ensureCorrectAreaOfPathItem(item);
        this.historyCommit();
    }

    getSelectedPoints() {
        const selectedPoints = [];
        StoreUtils.getCurveEditPaths(this.store).forEach((path, pathId) => {
            path.points.forEach((point, pointId) => {
                if (point.selected) {
                    selectedPoints.push({pathId, pointId});
                }
            });
        });
        return selectedPoints;
    }

    contextMenuHandler(x, y, mx, my, object, event) {
        if (!isValidObject(object)) {
            this.eventBus.emitCustomContextMenuRequested(mx, my, [{
                name: 'Add new path',
                clicked: () => this.startCreatingNewPath()
            }]);
        }

        const selectedPoints = this.getSelectedPoints();

        let clickedOnSelectedPoint = false;
        for (let i = 0; i < selectedPoints.length && !clickedOnSelectedPoint; i++) {
            clickedOnSelectedPoint = object.pathIndex === selectedPoints[i].pathId && object.pointIndex === selectedPoints[i].pointId;
        }
        
        if (selectedPoints.length > 1 && clickedOnSelectedPoint) {
            const menuOptions = [{
                name: 'Delete points',
                clicked: () => this.deleteSelectedPoints()
            }, {
                name: 'Convert to bezier',
                clicked: () => selectedPoints.forEach(p => this.convertPointToBezier(p.pathId, p.pointId))
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

        if (object && object.type === 'path-point') {
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
                    name: 'Break path',
                    clicked: () => this.breakPath(object.pathIndex, object.pointIndex)
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
                    name: 'Convert to bezier point',
                    clicked: () => this.convertPointToBezier(object.pathIndex, object.pointIndex)
                });
            }

            if (point.t !== 'A') {
                menuOptions.push({
                    name: 'Convert to arc point',
                    clicked: () => this.convertPointToArc(object.pathIndex, object.pointIndex)
                });
            }

            this.eventBus.emitCustomContextMenuRequested(mx, my, menuOptions);

        } else if (object && object.type === 'path-segment') {
            this.eventBus.emitCustomContextMenuRequested(mx, my, [{
                name: 'Extract path',
                clicked: () => this.extractPath(object.pathIndex)
            }, {
                name: 'Invert path',
                clicked: () => this.invertPath(object.pathIndex)
            }]);
        }
    }

    startCreatingNewPath() {
        if (this.subState && this.subState.name === 'idle') {
            this.migrateSubState(new CreatingPathState(this, this.item.shapeProps.paths.length));
        }
    }

    convertSelectedPointsToSimple() {
        this.getSelectedPoints().forEach(({pathId, pointId}) => this.convertPointToSimple(pathId, pointId));
    }

    convertSelectedPointsToBezier() {
        this.getSelectedPoints().forEach(({pathId, pointId}) => this.convertPointToBezier(pathId, pointId));
    }

    extractPath(pathId) {
        if (this.item.shapeProps.paths.length < 2) {
            return;
        }
        const path = this.item.shapeProps.paths[pathId];
        const newItem = utils.clone(this.item);
        delete newItem.id;
        newItem.meta = {};
        newItem.area = {x: 0, y: 0, w: 100, h: 100, r: 0, sx: 1, sy: 1, px: 0.5, py: 0.5};
        newItem.name = this.item.name + ' segment';
        newItem.description = '';
        newItem.childItems = [];
        newItem._childItems = [];
        newItem.shapeProps.paths = [{
            pos: 'relative',
            closed: path.closed,
            points: path.points.map(relativePoint => {
                const lp = convertCurvePointToItemScale(relativePoint, this.item.area.w, this.item.area.h);

                const wp = worldPointOnItem(lp.x, lp.y, this.item);
                wp.t = lp.t;
                if (lp.hasOwnProperty('x1')) {
                    const wp1 = worldPointOnItem(lp.x + lp.x1, lp.y + lp.y1, this.item);
                    wp.x1 = wp1.x - wp.x;
                    wp.y1 = wp1.y - wp.y;
                }
                if (lp.hasOwnProperty('x2')) {
                    const wp2 = worldPointOnItem(lp.x + lp.x2, lp.y + lp.y2, this.item);
                    wp.x2 = wp2.x - wp.x;
                    wp.y2 = wp2.y - wp.y;
                }
                return convertCurvePointToRelative(wp, newItem.area.w, newItem.area.h);
            })
        }];

        readjustItemAreaAndPoints(newItem);

        this.item.shapeProps.paths.splice(pathId, 1);
        this.cancel();
        const item = this.schemeContainer.addItem(newItem);
        this.schemeContainer.selectItem(item);
    }

    invertPath(pathId) {
        this.item.shapeProps.paths[pathId].points.reverse();
        this.item.shapeProps.paths[pathId].points.forEach(p => {
            if (p.t === 'B') {
                const xt = p.x1;
                const yt = p.y1;
                p.x1 = p.x2;
                p.y1 = p.y2;
                p.x2 = xt;
                p.y2 = yt;
            }
        });
        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    mergePoints(pref1, pref2) {
        if (pref1.pathId === pref2.pathId) {
            this.mergePointsInSamePath(this.item.shapeProps.paths[pref1.pathId], pref1.pointId, pref2.pointId);
        } else {
            this.mergePointsOfTwoPaths(pref1.pathId, pref1.pointId, pref2.pathId, pref2.pointId);
        }
        this.historyCommit();
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

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
    }

    breakPath(pathIndex, pointIndex) {
        const path = this.item.shapeProps.paths[pathIndex];
        if (path.closed) {
            this.breakClosedPath(path, pointIndex);
        } else {
            this.breakPathIntoTwo(path, pointIndex);
        }

        this.eventBus.emitItemChanged(this.item.id);
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
        this.historyCommit();
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
                pos: 'relative',
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

    deleteSelectedPoints() {
        const selectedPoints = this.getSelectedPoints();
        selectedPoints.reverse().forEach(selection => {
            this.item.shapeProps.paths[selection.pathId].points.splice(selection.pointId, 1);
        });

        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
        this.historyCommit();
    }

    insertPointAtCoords(x, y, pathId, segmentId) {
        const p = convertCurvePointToRelative(localPointOnItem(x, y, this.item), this.item.area.w, this.item.area.h);
        this.item.shapeProps.paths[pathId].points.splice(segmentId + 1, 0, {
            x: p.x,
            y: p.y,
            t: 'L'
        });
        if (this.item.shapeProps.paths[pathId].points[segmentId].t === 'B') {
            this.convertPointToBezier(pathId, segmentId + 1);
        }
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateAllCurveEditPoints(this.store, this.item);
        this.eventBus.emitSchemeChangeCommited();
        this.historyCommit();
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
        this.historyCommit();
    }

    convertPointToBezier(pathId, pointIndex) {
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
        this.historyCommit();
    }

    convertPointToArc(pathId, pointIndex) {
        const point = this.item.shapeProps.paths[pathId].points[pointIndex];
        if (point.t !== 'A') {
            point.h = 50;
        }
        point.t = 'A';
        this.eventBus.emitItemChanged(this.item.id);
        this.schemeContainer.readjustItem(this.item.id, IS_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
        StoreUtils.updateCurveEditPoint(this.store, this.item, pathId, pointIndex, this.item.shapeProps.paths[pathId].points[pointIndex]);
        this.eventBus.emitSchemeChangeCommited();
        this.historyCommit();
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
}
