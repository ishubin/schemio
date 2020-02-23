/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 import EventBus from '../EventBus';

class State {
    /**
     * @param {object} editor 
     * @param {EventBus} EventBus 
     */
    constructor(editor, eventBus) {
        this.editor = editor;
        this.schemeContainer = editor.schemeContainer;
        this.eventBus = eventBus;
        this.name = '';
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {
        this.reset();
        this.eventBus.$emit(this.eventBus.CANCEL_CURRENT_STATE);
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

            this.schemeContainer.screenTransform.x = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.y = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
            this.schemeContainer.screenTransform.scale = nz;
            this.eventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, this.schemeContainer.screenTransform);
        } else {
            if (this.schemeContainer.screenTransform.scale > 0.05) {
                nz = this.schemeContainer.screenTransform.scale / 1.02;
                this.schemeContainer.screenTransform.x = mx - nz * (mx - xo) / this.schemeContainer.screenTransform.scale;
                this.schemeContainer.screenTransform.y = my - nz * (my - yo) / this.schemeContainer.screenTransform.scale;
                this.schemeContainer.screenTransform.scale = nz;
                this.eventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, this.schemeContainer.screenTransform);
            }
        }
    }

    dragScreenOffset(dx, dy) {
        // TODO camera limitatio0n in view mode
        // if (this.mode === 'view') {
        //     this.vOffsetX = Math.max(this.cameraLimit.x1, Math.min(this.vOffsetX + dx, this.cameraLimit.x2));
        //     this.vOffsetY = Math.max(this.cameraLimit.y1, Math.min(this.vOffsetY + dy, this.cameraLimit.y2));
        // } else {
        //     this.vOffsetX += dx;
        //     this.vOffsetY += dy;
        // }
        let sx = this.schemeContainer.screenTransform.x + dx;
        let sy = this.schemeContainer.screenTransform.y + dy;

        this.schemeContainer.screenTransform.x = Math.max(this.schemeContainer.screenSettings.x1, Math.min(sx, this.schemeContainer.screenSettings.x2));
        this.schemeContainer.screenTransform.y = Math.max(this.schemeContainer.screenSettings.y1, Math.min(sy, this.schemeContainer.screenSettings.y2));
        this.eventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, this.schemeContainer.screenTransform);
    }

    snapX(value) {
        return this.snapToGrid(value);
    }

    snapY(value) {
        return this.snapToGrid(value);
    }

    snapToGrid(value) {
        if (this.editor.shouldSnapToGrid) {
            return Math.round(value / 20) * 20;
        }
        return Math.round(value);
    }

    updateCursor(cursor) {
        this.editor.cursor = cursor;
    }

}

export default State;
