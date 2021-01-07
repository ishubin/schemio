/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import EventBus from '../EventBus';
import myMath from '../../../myMath';
import StoreUtils from '../../../store/StoreUtils';
import '../../../typedef';
import forEach from 'lodash/forEach';

class State {
    /**
     * @param {EventBus} EventBus 
     * @param {Vuex.Store} store - a Vuex store object
     */
    constructor(eventBus, store) {
        this.schemeContainer = null;
        this.eventBus = eventBus;
        this.name = '';
        this.editor = null;
        this.store = store;

    }

    setSchemeContainer(schemeContainer) {
        this.schemeContainer = schemeContainer;
    }

    setEditor(editor) {
        this.editor = editor;
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {
        this.reset();
        this.eventBus.$emit(this.eventBus.CANCEL_CURRENT_STATE, this.name);
    }

    keyPressed(key, keyOptions){}
    keyUp(key, keyOptions){}

    mouseDown(worldX, worldY, screenX, screenY, object, event) {}
    mouseUp(worldX, worldY, screenX, screenY, object, event) {}
    mouseMove(worldX, worldY, screenX, screenY, object, event) {}
    mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {}


    mouseWheel(x, y, mx, my, event) {
        if (event) {
            if (event.deltaX !== 0 || event.deltaY !== 0) {
                if (event.metaKey || event.ctrlKey) {
                    this.zoomByWheel(mx, my, event.deltaY);
                } else {
                    this.dragScreenOffset(event.deltaX, event.deltaY);
                }
            }
        }
    }

    zoomByWheel(mx, my, delta) {
        var nz = 0;
        var xo = this.schemeContainer.screenTransform.x;
        var yo = this.schemeContainer.screenTransform.y;
        if (delta < 0) {
            nz = this.schemeContainer.screenTransform.scale * 1.02;
            const sx = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
            const sy = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.scale = nz;
            this.dragScreenTo(sx, sy);

        } else if (this.schemeContainer.screenTransform.scale > 0.05) {
            nz = this.schemeContainer.screenTransform.scale / 1.02;
            const sx = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
            const sy = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.scale = nz;
            this.dragScreenTo(sx, sy);
        }
    }

    dragScreenOffset(dx, dy) {
        let sx = this.schemeContainer.screenTransform.x + dx;
        let sy = this.schemeContainer.screenTransform.y + dy;
        this.dragScreenTo(sx, sy);
    }

    /**
     * Changes screen offset coords and checks bounding box of all items in relative transform so that they are always visible on the screen
     * @param {*} sx 
     * @param {*} sy 
     */
    dragScreenTo(sx, sy) {
        // getting bounding box of items in relative transform
        // viewport items should be ignored
        const bbox = this.schemeContainer.screenSettings.boundingBox;
        const scale = this.schemeContainer.screenTransform.scale;

        const padding = 10; // we use padding to so that small part of the scheme stays visible and user does not get lost
        const paddingTop = 70; // we need to compensate for the header

        if (bbox) {
            const minScreenX = - (bbox.x + bbox.w) * scale + padding;
            const maxScreenX = this.schemeContainer.screenSettings.width - bbox.x * scale - padding;
            const minScreenY = - (bbox.y + bbox.h) * scale + paddingTop;
            const maxScreenY = this.schemeContainer.screenSettings.height - bbox.y * scale - padding;

            this.schemeContainer.screenTransform.x = Math.max(minScreenX, Math.min(sx, maxScreenX));
            this.schemeContainer.screenTransform.y = Math.max(minScreenY, Math.min(sy, maxScreenY)); 
        } else {
            this.schemeContainer.screenTransform.x = sx;
            this.schemeContainer.screenTransform.y = sy; 
        }

        this.eventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, this.schemeContainer.screenTransform);
    }

    snapX(value) {
        return this.snapToGrid(value);
    }

    snapY(value) {
        return this.snapToGrid(value);
    }

    snapToGrid(value) {
        const snap = myMath.getSnappingWidthForScale(this.schemeContainer.screenTransform.scale);
        if (this.store.state.snap.grid) {
            return Math.round(value / snap) * snap;
        }
        return value;
    }

    /**
     * Checks snapping of item and returns new offset that should be applied to item
     * 
     * @param {SnappingPoints} points - points of an item by which it should snap it to other items
     * @param {Set} excludeItemIds - items that should be excluded from snapping (so that they don't snap to themselve)
     * @param {Number} dx - pre-snap candidate offset on x axis
     * @param {Number} dy - pre-snap candidate offset on y axis
     * @returns {Offset} offset with dx and dy fields specifying how these points should be moved to be snapped
     */
    snapPoints(points, excludeItemIds, dx, dy) {
        if (!points) {
            return {dx, dy};
        }

        let snappedDx = this.snapToGrid(dx);
        let snappedDy = this.snapToGrid(dy);

        if (!this.store.state.snap.items) {
            return {
                dx: snappedDx,
                dy: snappedDy,
            }
        }

        //TODO configure snapping precision
        const maxSnapProximity = 6;

        let zoomScale = this.schemeContainer.screenTransform.scale;

        let horizontalSnapper = null;
        let bestHorizontalProximity = 1000;

        forEach(this.schemeContainer.relativeSnappers.horizontal, snapper => {
            if (!excludeItemIds.has(snapper.item.id)) {
                forEach(points.horizontal, point => {
                    let proximity = Math.abs(snapper.value - point.y - dy);
                    if (proximity*zoomScale < maxSnapProximity && proximity < bestHorizontalProximity) {
                        horizontalSnapper = {
                            snapper,
                            dy: snapper.value - point.y
                        };
                        bestHorizontalProximity = proximity;
                    }
                });
            }
        });

        let verticalSnapper = null;
        let bestVerticalProximity = 1000;
        forEach(this.schemeContainer.relativeSnappers.vertical, snapper => {
            if (!excludeItemIds.has(snapper.item.id)) {
                forEach(points.vertical, point => {
                    let proximity = Math.abs(snapper.value - point.x - dx);
                    if (proximity*zoomScale < maxSnapProximity && proximity < bestVerticalProximity) {
                        verticalSnapper = {
                            snapper,
                            dx: snapper.value - point.x
                        };
                        bestVerticalProximity = proximity;
                    }
                });
            }
        });

        if (horizontalSnapper) {
            StoreUtils.setItemSnapper(this.store, horizontalSnapper.snapper);
            snappedDy = horizontalSnapper.dy;
        }

        if (verticalSnapper) {
            StoreUtils.setItemSnapper(this.store, verticalSnapper.snapper);
            snappedDx = verticalSnapper.dx;
        }
        return {
            dx: snappedDx,
            dy: snappedDy
        };
    }

    updateCursor(cursor) {
        this.editor.cursor = cursor;
    }

}

export default State;
