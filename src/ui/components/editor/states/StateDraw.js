/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath.js';
import State from './State.js';
import {simplifyPathPoints} from '../items/shapes/Path.vue';
import { readjustItemAreaAndPoints } from './StateEditPath.js';
import { convertCurvePointToRelative } from '../items/shapes/StandardCurves.js';
import shortid from 'shortid';
import { getStroke } from 'perfect-freehand';

const IS_NOT_SOFT = false;
const IS_SOFT = true;

const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

export default class StateDraw extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'draw', listener);
        this.item = null;
        this.isDrawing = false;
        this.color = null;
        this.currentPathId = 0;
        this.isBrush = false;

        /** @type {Array<Array<Point>>} */
        this.recordedPaths = [];
    }

    startBrush() {
        this.reset();
        this.isBrush = true;
    }

    startPencil() {
        this.reset();
        this.isBrush = false;
    }

    reset() {
        this.recordedPaths = [];
        this.item = null;
        this.isDrawing = false;
        this.currentPathId = 0;
    }

    mouseDown(x, y, mx, my, object, event) {
        if (!this.item) {
            this.initFirstClick(x, y);
        } else {
            const point = {
                x: this.round(x),
                y: this.round(y)
            };
            this.recordedPaths.push([point]);
            this.item.shapeProps.paths.push({
                id: shortid.generate(),
                pos: 'relative',
                points: [ convertCurvePointToRelative({
                    ...point,
                    t: 'L'
                }, this.item.area.w, this.item.area.h)]
            });
            this.currentPathId = this.recordedPaths.length - 1;
        }
        this.isDrawing = true;
        this.listener.onItemChanged(this.item.id, 'shapeProps.points');
    }

    initFirstClick(x, y) {
        this.currentPathId = 0;

        const color = this.color || '#000000';
        const item = {
            area: {x: 0, y: 0, w: 100, h: 100, r: 0, px: 0.5, py: 0.5, sx: 1, sy: 1},
            name: this.schemeContainer.generateUniqueName('Drawing'),
            shape: 'path',
            shapeProps: {
                paths: [{
                    id: shortid.generate(),
                    pos: 'relative',
                    closed: false,
                    points: []
                }],
                strokeSize: this.isBrush ? 0 : this.store.getters.drawPencilSize,
                fill: this.isBrush ? {type: 'solid', color} : {type: 'none'},
                strokeColor: color,
            }
        };

        if (this.color) {
            item.shapeProps.strokeColor = this.color;
        }

        this.schemeContainer.addItem(item);

        this.item = item;

        const currentPoint = {x: this.round(x), y: this.round(y)};

        this.item.shapeProps.paths[0].points.push(convertCurvePointToRelative({
            ...currentPoint,
            t: 'L'
        }, this.item.area.w, this.item.area.h));

        this.recordedPaths = [[currentPoint]];
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.isDrawing && this.item) {

            if (event.buttons === 0) {
                // handling situation when user moved mouse outside of editor and released the mouse button there and then came back
                this.isDrawing = false;
                return;
            }

            const currentRecordedPathPoints = this.recordedPaths[this.currentPathId];

            const lastPoint = currentRecordedPathPoints[currentRecordedPathPoints.length - 1];
            const px = this.round(x);
            const py = this.round(y);
            if (!myMath.sameFloatingValue(px, lastPoint.x) || !myMath.sameFloatingValue(py, lastPoint.y) ) {
                this.recordedPaths[this.currentPathId].push({
                    x: px, y: py
                });

                this.buildCurrentItem();
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.isDrawing = false;
        if (this.item && this.item.shapeProps.paths[this.currentPathId].points.length > 0) {
            this.submitDrawing();
            this.listener.onItemChanged(this.item.id, 'shapeProps.paths');
            this.reset();
        }
    }

    cancel() {
        this.listener.onItemsHighlighted({itemIds: [], showPins: false});
        super.cancel();
    }

    pickColor(color) {
        this.color = color;
    }

    buildCurrentItem() {
        if (this.isBrush) {
            this.buildBrushDrawing();
        } else {
            this.bulidRegularDrawing();
        }
    }

    buildBrushDrawing() {
        const inputPoints = this.recordedPaths[this.currentPathId].map(p => [p.x, p.y]);
        const outlinePoints = getStroke(inputPoints, {
            size: this.store.getters.drawBrushSize,
            smoothing: 0.99,
            thinning: 0.12,
            streamline: 0.28,
            start: {
                taper: 31,
                cap: false,
            },
            end: {
                taper: 30,
                cap: false,
            },
        });
        const rawPoints = outlinePoints.map(p => {
            return {
                x: p[0],
                y: p[1],
                t: 'L'
            };
        });

        const simplifiedPoints = simplifyPathPoints(rawPoints, myMath.clamp(this.store.getters.drawEpsilon, 0.5, 1000));
        this.item.shapeProps.paths[this.currentPathId].closed = true;
        this.item.shapeProps.paths[this.currentPathId].points = simplifiedPoints.map(p => convertCurvePointToRelative(p, this.item.area.w, this.item.area.h));
        this.listener.onItemChanged(this.item.id, 'shapeProps.points');
    }

    bulidRegularDrawing() {
        const lastPath = this.item.shapeProps.paths[this.currentPathId]
        const rawPoints = this.recordedPaths[this.currentPathId];
        const simplifiedPoints = simplifyPathPoints(rawPoints, myMath.clamp(this.store.getters.drawEpsilon, 0.5, 1000));

        lastPath.points = simplifiedPoints.map(p => convertCurvePointToRelative(p, this.item.area.w, this.item.area.h));
        this.listener.onItemChanged(this.item.id, 'shapeProps.points');
    }

    submitDrawing() {
        if (this.item) {
            this.buildCurrentItem();
            readjustItemAreaAndPoints(this.item);
            this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            this.schemeContainer.reindexItems();
            this.listener.onSchemeChangeCommitted();
            this.listener.onItemChanged(this.item.id, 'shapeProps.points');
            return this.item;
        }
        return null;
    }
}