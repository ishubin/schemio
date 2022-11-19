/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from '../../../myMath';
import StoreUtils from '../../../store/StoreUtils';
import '../../../typedef';
import forEach from 'lodash/forEach';
import { Keys } from '../../../events';

const SUB_STATE_STACK_LIMIT = 10;

const zoomOptions = [ 0.1, 0.25, 0.35, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 7.5, 10 ];

/**
 * Checkes whether keys like shift, meta (mac), ctrl were pressed during the mouse event
 * @param {MouseEvent} event
 */
export function isMultiSelectKey(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey;
}

export function isEventMiddleClick(event) {
    return event.button === 1;
}

export function isEventRightClick(event) {
    return event.button === 2;
}

class State {
    /**
     * @param {Vuex.Store} store - a Vuex store object
     */
    constructor(store, name, listener) {
        this.schemeContainer = null;
        this.name = name || '';
        this.store = store;

        this.subState = null;
        this.previousSubStates = [];
        this.listener = listener;
    }

    migrateSubState(newSubState) {
        if (this.subState) {
            this.previousSubStates.push(this.subState);
            if (this.previousSubStates.length > SUB_STATE_STACK_LIMIT) {
                this.previousSubStates.shift();
            }
        }
        this.subState = newSubState;
        this.subState.listener = this.listener;
        this.store.dispatch('setEditorSubStateName', this.subState ? this.subState.name : 'null');
        this.listener.onSubStateMigrated();
    }

    migrateToPreviousSubState() {
        if (this.previousSubStates.length > 0) {
            this.subState = this.previousSubStates.pop();
            this.subState.listener = this.listener;
            this.store.dispatch('setEditorSubStateName', this.subState ? this.subState.name : 'null');
            this.listener.onSubStateMigrated();
        }
    }

    resetPreviousSubStates() {
        this.previousSubStates = [];
    }

    setSchemeContainer(schemeContainer) {
        this.schemeContainer = schemeContainer;
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {
        this.reset();
        this.listener.onCancel(this.name);
    }

    keyPressed(key, keyOptions) {
        if (this.subState) this.subState.keyPressed(key, keyOptions);
    }

    keyUp(key, keyOptions) {
        if (this.subState) this.subState.keyUp(key, keyOptions);
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (this.subState) this.subState.mouseDoubleClick(x, y, mx, my, object, event);
    }

    mouseDown(x, y, mx, my, object, event) {
        if (this.subState) this.subState.mouseDown(x, y, mx, my, object, event);
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.subState) this.subState.mouseMove(x, y, mx, my, object, event);
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.subState) this.subState.mouseUp(x, y, mx, my, object, event);
    }


    /**
     *
     * @param {*} x
     * @param {*} y
     * @param {*} mx
     * @param {*} my
     * @param {MouseEvent} event
     */
    mouseWheel(x, y, mx, my, event) {
        if (event) {
            // explanation to this check is here https://stackoverflow.com/a/62415754/2704008
            const isTouchPad = event.wheelDeltaY ? event.wheelDeltaY === -3 * event.deltaY : event.deltaMode === 0
            if (event.deltaX !== 0 || event.deltaY !== 0) {
                if (isTouchPad) {
                    this.dragScreenOffset(event.deltaX, -event.deltaY);
                } else {
                    this.zoomByWheel(mx, my, event.deltaY);
                }
            }
        }
    }

    zoomByWheel(mx, my, delta) {
        const zoomRatio = 1.1;
        var nz = 0;
        var xo = this.schemeContainer.screenTransform.x;
        var yo = this.schemeContainer.screenTransform.y;
        if (delta < 0) {
            nz = this.schemeContainer.screenTransform.scale * zoomRatio;
            const sx = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
            const sy = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.scale = nz;
            this.dragScreenTo(sx, sy);

        } else if (this.schemeContainer.screenTransform.scale > 0.05) {
            nz = this.schemeContainer.screenTransform.scale / zoomRatio;
            const sx = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
            const sy = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.scale = nz;
            this.dragScreenTo(sx, sy);
        }
    }

    resetZoom() {
        this.changeZoomTo(1);
    }

    zoomOut() {
        const currentZoom = this.schemeContainer.screenTransform.scale;
        let selectedZoom = zoomOptions[0];
        let found = false;
        for (let i = 0; i < zoomOptions.length && !found; i++) {
            if (zoomOptions[i] < currentZoom) {
                selectedZoom = zoomOptions[i];
            } else {
                found = true;
            }
        }
        this.changeZoomTo(selectedZoom);
    }

    zoomIn() {
        const currentZoom = this.schemeContainer.screenTransform.scale;
        let selectedZoom = zoomOptions[zoomOptions.length - 1];
        let found = false;
        let i = zoomOptions.length - 1;
        while(!found) {
            if (zoomOptions[i] > currentZoom) {
                selectedZoom = zoomOptions[i];
            } else {
                found = true;
            }
            i = i - 1;
            if (i < 0) {
                found = true;
            }
        }
        this.changeZoomTo(selectedZoom);
    }

    changeZoomTo(newScale) {
        // calculating old center of the scheme

        let schemeContainer = this.schemeContainer;
        const xo = schemeContainer.screenTransform.x;
        const yo = schemeContainer.screenTransform.y;

        const svgRect = document.getElementById(`svg-plot-${this.schemeContainer.editorId}`).getBoundingClientRect();
        const cx = svgRect.width / 2;
        const cy = svgRect.height / 2;

        const sx = cx - newScale * (cx - xo) / schemeContainer.screenTransform.scale;
        const sy = cy - newScale * (cy - yo) / schemeContainer.screenTransform.scale;

        schemeContainer.screenTransform.scale = newScale;

        schemeContainer.screenTransform.x = sx;
        schemeContainer.screenTransform.y = sy;

        this.listener.onScreenTransformUpdated(this.schemeContainer.screenTransform);
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
        const bbox = this.schemeContainer.screenSettings.boundingBox;
        const scale = this.schemeContainer.screenTransform.scale;

        const padding = 10; // we use padding to so that small part of the scheme stays visible and user does not get lost

        if (bbox) {
            const minScreenX = - (bbox.x + bbox.w) * scale + padding;
            const maxScreenX = this.schemeContainer.screenSettings.width - bbox.x * scale - padding;
            const minScreenY = - (bbox.y + bbox.h) * scale + padding;
            const maxScreenY = this.schemeContainer.screenSettings.height - bbox.y * scale - padding;

            this.schemeContainer.screenTransform.x = Math.max(minScreenX, Math.min(sx, maxScreenX));
            this.schemeContainer.screenTransform.y = Math.max(minScreenY, Math.min(sy, maxScreenY));
        } else {
            this.schemeContainer.screenTransform.x = sx;
            this.schemeContainer.screenTransform.y = sy;
        }

        this.listener.onScreenTransformUpdated(this.schemeContainer.screenTransform);
    }

    isSnappingToItemsEnabled() {
        return this.store.state.snap.items;
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

        let snappedDx = dx;
        let snappedDy = dy;


        //TODO configure snapping precision
        const maxSnapProximity = 6;

        let zoomScale = this.schemeContainer.screenTransform.scale;

        let horizontalSnapper = null;
        let bestHorizontalProximity = 1000;
        let verticalSnapper = null;
        let bestVerticalProximity = 1000;

        if (this.isSnappingToItemsEnabled()) {
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
        }

        if (horizontalSnapper) {
            StoreUtils.setItemSnapper(this.store, horizontalSnapper.snapper);
            snappedDy = horizontalSnapper.dy;
        } else if (this.store.state.snap.grid) {
            //snap to grid
            let bestGridProximity = 1000;
            forEach(points.horizontal, point => {
                const snappedValue = this.snapToGrid(point.y + dy);
                const proximity = Math.abs(snappedValue - point.y);
                if (proximity < bestGridProximity) {
                    bestGridProximity = proximity;
                    snappedDy = snappedValue - point.y;
                }
            });
        }

        if (verticalSnapper) {
            StoreUtils.setItemSnapper(this.store, verticalSnapper.snapper);
            snappedDx = verticalSnapper.dx;
        } else if (this.store.state.snap.grid) {
            //snap to grid
            let bestGridProximity = 1000;
            forEach(points.vertical, point => {
                const snappedValue = this.snapToGrid(point.x + dx);
                const proximity = Math.abs(snappedValue - point.x);
                if (proximity < bestGridProximity) {
                    bestGridProximity = proximity;
                    snappedDx = snappedValue - point.x;
                }
            });
        }
        return {
            dx: snappedDx,
            dy: snappedDy
        };
    }

    /**
     * Based on zoom it calculates a precision with which we should round the updated value
     * This is needed to avoid issues with floating values calculation so that users don't get uggly values with many digits after point.
     *
     * @returns precision for which we should round the value
     */
    getUpdatePrecision() {
        const scale = this.schemeContainer.screenTransform.scale;
        if (scale < 0.5) {
            return 0;
        }
        return Math.max(0, Math.round(Math.log10(this.schemeContainer.screenTransform.scale * 100) - 1));
    }

    round(value) {
        return myMath.roundPrecise(value, this.getUpdatePrecision());
    }
}


export class SubState extends State {
    constructor(parentState, name) {
        super(parentState.store, name);
        this.schemeContainer = parentState.schemeContainer;
        this.parentState = parentState;
    }

    migrate(newSubState) {
        this.parentState.migrateSubState(newSubState);
    }

    migrateSubState(newSubState) {
        this.parentState.migrateSubState(newSubState);
    }

    migrateToPreviousSubState() {
        this.parentState.migrateToPreviousSubState();
    }

    cancel() {
        this.parentState.cancel();
    }

    getSchemeContainer() {
        return this.parentState.schemeContainer;
    }
}

export class DragScreenState extends SubState {
    constructor(parentState, originalClickPoint) {
        super(parentState, 'drag-screen');
        this.schemeContainer = parentState.schemeContainer;
        this.originalClickPoint = originalClickPoint;
        this.originalScreenOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    keyUp(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.migrateToPreviousSubState();
        }
    }
    mouseDown(x, y, mx, my, object, event) {
        this.originalClickPoint = {x, y, mx, my};
        this.originalScreenOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (this.originalClickPoint) {
            this.schemeContainer.screenTransform.x = Math.floor(this.originalScreenOffset.x + mx - this.originalClickPoint.mx);
            this.schemeContainer.screenTransform.y = Math.floor(this.originalScreenOffset.y + my - this.originalClickPoint.my);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.listener.onScreenTransformUpdated(this.schemeContainer.screenTransform);
        this.migrateToPreviousSubState();
    }
}

export class MultiSelectState extends SubState {
    constructor(parentState, x, y, mx, my, selectorCallback) {
        super(parentState, 'multi-select');
        this.clickedObject = null;
        this.shouldSelectOnlyOne = false;
        this.multiSelectBox = {x, y, w: 0, h: 0};
        this.originalClickPoint = {x, y, mx, my};
        this.item = parentState.item;
        this.schemeContainer = parentState.schemeContainer;
        this.selectorCallback = selectorCallback;
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event);
            return;
        }

        if (x > this.originalClickPoint.x) {
            this.multiSelectBox.x = this.originalClickPoint.x;
            this.multiSelectBox.w = x - this.originalClickPoint.x;
        } else {
            this.multiSelectBox.x = x;
            this.multiSelectBox.w = this.originalClickPoint.x - x;
        }
        if (y > this.originalClickPoint.y) {
            this.multiSelectBox.y = this.originalClickPoint.y;
            this.multiSelectBox.h = y - this.originalClickPoint.y;
        } else {
            this.multiSelectBox.y = y;
            this.multiSelectBox.h = this.originalClickPoint.y - y;
        }
        StoreUtils.setMultiSelectBox(this.store, this.multiSelectBox);
    }

    mouseUp(x, y, mx, my, object, event) {
        this.selectorCallback(this.multiSelectBox, isMultiSelectKey(event));
        StoreUtils.setMultiSelectBox(this.store, null);
        this.migrateToPreviousSubState();
    }

}

export default State;
