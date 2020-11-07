/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 import EventBus from '../EventBus';

class State {
    /**
     * @param {EventBus} EventBus 
     */
    constructor(eventBus) {
        this.schemeContainer = null;
        this.eventBus = eventBus;
        this.name = '';
        this.editor = null;

        // Viewport transform correction 
        this.viewportCorrectionTop = 0;
        this.viewportCorrectionLeft = 0;
    }

    setViewportCorrection(viewportTop, viewportLeft) {
        this.viewportCorrectionLeft = viewportLeft;
        this.viewportCorrectionTop = viewportTop;
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

        if (bbox) {
            // recalculating min/max offset on the screen so that bbox is always visible
            const minScreenX = - bbox.x * scale;
            const minScreenY = - bbox.y * scale;
            const maxScreenX = this.schemeContainer.screenSettings.width - (bbox.x + bbox.w) * scale;
            const maxScreenY = this.schemeContainer.screenSettings.height - (bbox.y + bbox.h) * scale;

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
