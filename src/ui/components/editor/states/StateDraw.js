/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath.js';
import EventBus from '../EventBus.js';
import State from './State.js';
import {simplifyCurvePoints} from '../items/shapes/Curve.vue';
import { identifyShape } from '../items/shapes/SmartShapeClassifier.js';

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
    }

    reset() {
        this.item = null;
        this.isDrawing = false;
        this.shouldBreakNextPoint = false;
    }

    mouseDown(x, y, mx, my, object, event) {
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
    }
    
    cancel() {
        this.eventBus.emitItemsHighlighted([]);
        if (this.item) {
            if (this.item.shapeProps.points.length <= 1) {
                this.schemeContainer.deleteItem(this.item);
                this.schemeContainer.reindexItems();
            } else {
                this.item.shapeProps.points = simplifyCurvePoints(this.item.shapeProps.points, myMath.clamp(this.store.getters.drawEpsilon, 1, 1000));

                const ishape = identifyShape(this.item.shapeProps.points);
                console.log('Shape identified', ishape);

                this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
                this.schemeContainer.reindexItems();
                this.schemeContainer.selectItem(this.item);
            }
        }
        
        super.cancel();
    }
}