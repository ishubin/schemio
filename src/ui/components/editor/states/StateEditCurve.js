/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import {forEach} from 'lodash';


export default class StateEditCurve extends State {
    constructor(editor, eventBus) {
        super(editor, eventBus);
        this.name = 'edit-curve';
        this.item = null;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
        this.schemeContainer = editor.schemeContainer;
        this.originalClickPoint = {x: 0, y: 0};
        this.candidatePointSubmited = false;
        this.shouldJoinClosedPoints = false;
    }

    reset() {
        this.item = null;
        this.addedToScheme = false;
        this.creatingNewPoints = true;
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
                maxY = Math.max(maxY, point.y2 + this.item.area.y, point.y2 + this.item.area.y);
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
