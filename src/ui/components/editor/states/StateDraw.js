/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath.js';
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
        this.smartCancelTimeout = 500;
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
            this.item = null;
        }
    }

    processSmartDrawing() {
        this.item.shapeProps.points = simplifyCurvePoints(this.item.shapeProps.points, myMath.clamp(this.store.getters.drawEpsilon, 1, 1000));

        const shapeMatch = identifyShape(this.item.shapeProps.points);
        if (shapeMatch && shapeMatch.score > 0.2) {
            const area = this.getCurveBoundaryBox(this.item);
            this.schemeContainer.deleteItem(this.item);

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

            this.schemeContainer.addItem(item);
            this.schemeContainer.reindexItems();
            this.schemeContainer.selectItem(item);
        } else {
            this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            this.schemeContainer.reindexItems();
            this.schemeContainer.selectItem(this.item);
        }
    }

    getCurveBoundaryBox(curveItem) {
        let minPoint = null;
        let maxPoint = null;

        forEach(curveItem.shapeProps.points, point => {
            const worldPoint = this.schemeContainer.worldPointOnItem(point.x, point.y, curveItem);

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