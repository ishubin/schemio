/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath.js';
import utils from '../../../utils.js';
import EventBus from '../EventBus.js';
import State from './State.js';
import {simplifyCurvePoints} from '../items/shapes/Curve.vue';
import { identifyShape } from '../items/shapes/SmartShapeClassifier.js';
import forEach from 'lodash/forEach';

const IS_NOT_SOFT = false;
const IS_SOFT = true;

const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

export default class StateDraw extends State {
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'draw';
        this.item = null;
        this.isDrawing = false;
        this.shouldBreakNextPoint = false;
        this.smartDrawing = false;
        this.smartCancelTimeout = 1000;
        this.smartCancelTimeoutId = null;
    }

    reset() {
        this.item = null;
        this.isDrawing = false;
        this.shouldBreakNextPoint = false;
        this.smartDrawing = false;
    }

    initSmartDraw() {
        this.smartDrawing = true;
    }

    mouseDown(x, y, mx, my, object, event) {
        if (this.smartCancelTimeoutId) {
            clearTimeout(this.smartCancelTimeoutId);
            this.smartCancelTimeoutId = null;
        }

        if (!this.item) {
            this.initFirstClick(x, y);
        } else if (this.item.shapeProps.points.length > 0) {
            this.shouldBreakNextPoint = true;
        }
        this.isDrawing = true;
        EventBus.emitItemChanged(this.item.id, 'shapeProps.points');
    }

    initFirstClick(x, y) {
        const item = {
            name: this.schemeContainer.generateUniqueName('Drawing'),
            shape: 'curve',
            shapeProps: {
                points: [],
                strokeSize: 3,
                closed: false,
                fill: {type: 'none'}
            }
        };

        this.schemeContainer.addItem(item);

        this.item = item;

        this.item.shapeProps.points.push({
            x: this.round(x),
            y: this.round(y),
            t: 'L'
        });
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.isDrawing && this.item) {

            if (event.buttons === 0) {
                // handling situation when user moved mouse outside of editor and released the mouse button there and then came back
                this.isDrawing = false;
                return;
            }

            const lastPoint = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];
            const px = this.round(x);
            const py = this.round(y);
            if (!myMath.sameFloatingValue(px, lastPoint.x) || !myMath.sameFloatingValue(py, lastPoint.y) ) {
                const point = {
                    x: px,
                    y: py,
                    t: 'L'
                };
                if (this.shouldBreakNextPoint) {
                    point.break = true;
                    this.shouldBreakNextPoint = false;
                }
                this.item.shapeProps.points.push(point);
                
                EventBus.emitItemChanged(this.item.id, 'shapeProps.points');
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.isDrawing = false;
        EventBus.emitItemChanged(this.item.id, 'shapeProps.points');

        if (this.smartDrawing && !this.smartCancelTimeoutId) {
            this.smartCancelTimeoutId = setTimeout(() => {
                this.submitDrawing();
                this.smartCancelTimeoutId = null;
            }, this.smartCancelTimeout);
        }
    }
    
    cancel() {
        this.eventBus.emitItemsHighlighted([]);
        this.submitDrawing();
        super.cancel();
    }

    submitDrawing() {
        if (this.item) {
            if (this.item.shapeProps.points.length <= 1) {
                this.schemeContainer.deleteItem(this.item);
                this.schemeContainer.reindexItems();
            } else if (this.smartDrawing) {
               this.processSmartDrawing(); 
            } else {
                this.item.shapeProps.points = simplifyCurvePoints(this.item.shapeProps.points, myMath.clamp(this.store.getters.drawEpsilon, 1, 1000));

                this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
                this.schemeContainer.reindexItems();
                this.schemeContainer.selectItem(this.item);
            }
            this.eventBus.emitSchemeChangeCommited();
            this.item = null;
        }
    }

    processSmartDrawing() {
        const points = simplifyCurvePoints(this.item.shapeProps.points, myMath.clamp(this.store.getters.drawEpsilon, 1, 1000));
        this.schemeContainer.deleteItem(this.item);
        this.item = null;
        this.schemeContainer.reindexItems();

        const smallerCurves = this.breakCurveIntoSmallerCurves(points);

        forEach(smallerCurves, curve => {
            this.processSmartShape(curve.points, curve.area);
        });
    }

    breakCurveIntoSmallerCurves(points) {
        const curves = [];

        let currentCurve = {
            points: [],
            area: null
        };

        curves.push(currentCurve);
        forEach(points, point => {
            if (point.break) {
                currentCurve = {
                    points: [],
                    area: null
                };
                curves.push(currentCurve);
            }
            if (!currentCurve.area) {
                currentCurve.area = {x: point.x, y: point.y, w: 0, h: 0};
            } else {
                if (currentCurve.area.x > point.x) {
                    const oldX = currentCurve.area.x;
                    currentCurve.area.x = point.x;
                    currentCurve.area.w = oldX + currentCurve.area.w - point.x;
                } else if (point.x > currentCurve.area.x + currentCurve.area.w) {
                    currentCurve.area.w = point.x - currentCurve.area.x;
                }
                if (currentCurve.area.y > point.y) {
                    const oldY = currentCurve.area.y;
                    currentCurve.area.y = point.y;
                    currentCurve.area.h = oldY + currentCurve.area.h - point.y;
                } else if (point.y > currentCurve.area.y + currentCurve.area.h) {
                    currentCurve.area.h = point.y - currentCurve.area.y;
                }
            }
            currentCurve.points.push({
                x: point.x,
                y: point.y
            });
        });

        // checking if we can merge curves back
        // in case their area overlap too much
        for (let i = 1; i < curves.length; i++) {
            // checking whether it can merge this curve with previous curve
            // e.g. if it is a connector with separately drawn cap
            // in this case we want it to be together with connector so that its shape can be identified properly
            const overlap = myMath.overlappingArea(curves[i - 1].area, curves[i].area);
            if (overlap) {
                const overlapRatio = (overlap.w + overlap.h) / Math.max(1, curves[i].area.w + curves[i].area.h);
                if (overlapRatio > 0.3) {
                    const lastPoints = curves[i].points;
                    // removing the last curve
                    curves.splice(i, 1);
                    // and merging its points to previous curve

                    forEach(lastPoints, (p, j) => {
                        if (j === 0) {
                            p.break = true;
                        }
                        curves[i - 1].points.push(p);
                    });

                    //TODO instead of recalculating boundar box - we can optimize it by merging areas of the two merged curves, but I am too lazy right now :)
                    curves[i - 1].area = this.getCurveBoundaryBox(curves[i - 1].points);
                }
            }
        }
        return curves;
    }

    processSmartShape(points, area) {
        const shapeMatch = identifyShape(points);
        if (shapeMatch && shapeMatch.score > 0.2) {

            if (area.w > 1 && area.h > 1) {
                const areaRatio = Math.min(area.w, area.h) / Math.max(area.w, area.y);
                if (areaRatio > 0.8 && areaRatio < 1.2) {
                    // making it a perfect square
                    area.h = area.w;
                }
            }

            const item = {
                name: this.schemeContainer.generateUniqueName(shapeMatch.shape),
                shape: shapeMatch.shape,
                area,
                shapeProps: {}
            };

            if (shapeMatch.shapeProps) {
                item.shapeProps = utils.clone(shapeMatch.shapeProps);
            }

            this.schemeContainer.addItem(item);
            if (item.shape === 'connector') {
                this.fitConnectorToItems(item);
                this.schemeContainer.readjustItem(item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            }
            this.schemeContainer.reindexItems();
        } else {
            const item = {
                name: this.schemeContainer.generateUniqueName('Curve'),
                shape: 'curve',
                area,
                shapeProps: {
                    points
                }
            };
            this.schemeContainer.addItem(item);
            this.schemeContainer.readjustItem(item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            this.schemeContainer.reindexItems();
        }
    }

    /**
     * Checks whether it is possible to attach connector edges to some other items
     * @param {*} connectorItem 
     */
    fitConnectorToItems(connectorItem) {
        let distanceThreshold = 0;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = Math.min(50, Math.max(connectorItem.area.w, connectorItem.area.h)) / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true; 
        const points = connectorItem.shapeProps.points;
        const firstPoint = this.schemeContainer.worldPointOnItem(points[0].x, points[0].y, connectorItem);
        const lastPoint = this.schemeContainer.worldPointOnItem(points[points.length-1].x, points[points.length-1].y, connectorItem);

        const fitEdge = (edgePoint, isSource) => {
            let edgeName = isSource ?  'source' : 'destination';

            const closestPointToItem = this.schemeContainer.findClosestPointToItems(edgePoint.x, edgePoint.y, distanceThreshold, connectorItem.id, includeOnlyVisibleItems);
            if (closestPointToItem && closestPointToItem.itemId !== connectorItem.id) {
                connectorItem.shapeProps[`${edgeName}Item`] = '#' + closestPointToItem.itemId;
                connectorItem.shapeProps[`${edgeName}ItemPosition`] = closestPointToItem.distanceOnPath;
            }
        };

        fitEdge(firstPoint, true);
        fitEdge(lastPoint, false);
    }

    getCurveBoundaryBox(points) {
        let minPoint = null;
        let maxPoint = null;

        forEach(points, worldPoint => {

            if (!minPoint) {
                minPoint = {x: worldPoint.x, y: worldPoint.y};
            }
            if (!maxPoint) {
                maxPoint = {x: worldPoint.x, y: worldPoint.y};
            }

            if (minPoint.x > worldPoint.x) {
                minPoint.x = worldPoint.x;
            }
            if (minPoint.y > worldPoint.y) {
                minPoint.y = worldPoint.y;
            }

            if (maxPoint.x < worldPoint.x) {
                maxPoint.x = worldPoint.x;
            }
            if (maxPoint.y < worldPoint.y) {
                maxPoint.y = worldPoint.y;
            }
        });

        return {
            x: minPoint.x,
            y: minPoint.y,
            w: maxPoint.x - minPoint.x,
            h: maxPoint.y - minPoint.y,
        };
    }
}