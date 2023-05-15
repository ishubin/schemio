/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath.js';
import State from './State.js';
import {simplifyPathPoints} from '../items/shapes/Path.vue';
import { readjustItemAreaAndPoints } from './StateEditPath.js';
import { convertCurvePointToRelative } from '../items/shapes/StandardCurves.js';
import shortid from 'shortid';

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
        this.strokeColor = null;
        this.currentPathId = 0;
    }

    reset() {
        this.item = null;
        this.isDrawing = false;
        this.currentPathId = 0;
    }

    mouseDown(x, y, mx, my, object, event) {
        if (!this.item) {
            this.initFirstClick(x, y);
        } else {
            this.item.shapeProps.paths.push({
                id: shortid.generate(),
                pos: 'relative',
                closed: false,
                points: [ convertCurvePointToRelative({
                    x: this.round(x),
                    y: this.round(y),
                    t: 'L'
                }, this.item.area.w, this.item.area.h)]
            });
            this.currentPathId = this.item.shapeProps.paths.length - 1;
        }
        this.isDrawing = true;
        this.listener.onItemChanged(this.item.id, 'shapeProps.points');
    }

    initFirstClick(x, y) {
        this.currentPathId = 0;
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
                strokeSize: 3,
                closed: false,
                fill: {type: 'none'}
            }
        };

        if (this.strokeColor) {
            item.shapeProps.strokeColor = this.strokeColor;
        }

        this.schemeContainer.addItem(item);

        this.item = item;

        this.item.shapeProps.paths[0].points.push(convertCurvePointToRelative({
            x: this.round(x),
            y: this.round(y),
            t: 'L'
        }, this.item.area.w, this.item.area.h));
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.isDrawing && this.item) {

            if (event.buttons === 0) {
                // handling situation when user moved mouse outside of editor and released the mouse button there and then came back
                this.isDrawing = false;
                return;
            }

            const lastPoint = this.item.shapeProps.paths[this.currentPathId].points[this.item.shapeProps.paths[this.currentPathId].points.length - 1];
            const px = this.round(x);
            const py = this.round(y);
            if (!myMath.sameFloatingValue(px, lastPoint.x) || !myMath.sameFloatingValue(py, lastPoint.y) ) {
                const point = {
                    x: px,
                    y: py,
                    t: 'L'
                };
                this.item.shapeProps.paths[this.currentPathId].points.push(convertCurvePointToRelative(point, this.item.area.w, this.item.area.h));

                this.listener.onItemChanged(this.item.id, `shapeProps.paths`);
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.isDrawing = false;
        this.listener.onItemChanged(this.item.id, 'shapeProps.paths');
    }

    cancel() {
        this.listener.onItemsHighlighted({itemIds: [], showPins: false});
        const item = this.submitDrawing();
        if (item) {
            this.schemeContainer.selectItem(item);
        }
        super.cancel();
    }

    pickColor(color) {
        this.strokeColor = color;

        if (this.item && this.item.shapeProps.paths[this.currentPathId].points.length > 0) {
            if (this.item.shapeProps.paths[this.currentPathId].points.length === 0) {
            } else {
                this.submitDrawing();
                this.reset();
            }
        } else if (this.item) {
            this.item.shapeProps.strokeColor = color;
        }
    }

    submitDrawing() {
        if (this.item) {
            //TODO proper cleanup of all paths if they have less than two points
            this.item.shapeProps.paths.forEach(path => {
                path.points = simplifyPathPoints(path.points, myMath.clamp(this.store.getters.drawEpsilon, 1, 1000));
            });
            readjustItemAreaAndPoints(this.item);
            this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());
            this.schemeContainer.reindexItems();
            this.listener.onSchemeChangeCommitted();
            return this.item;
        }
        return null;
    }

}