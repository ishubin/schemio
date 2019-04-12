import EventBus from '../EventBus.js';

class State {
    constructor(editor) {
        this.editor = editor;
        this.name = '';
    }

    reset() {}

    // invoked when user cancels the state (e.g. press Esc key)
    cancel() {
        this.reset();
        EventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
    }

    keyPressed(key, keyOptions){}

    mouseDown(localX, localY, originalX, originalY, object, event) {}
    mouseUp(localX, localY, originalX, originalY, object, event) {}
    mouseMove(localX, localY, originalX, originalY, object, event) {}


    mouseWheel(x, y, mx, my, event) {
        if (event) {
            if (event.deltaX !== 0 || event.deltaY !== 0) {
                if (event.metaKey || event.ctrlKey) {
                    this.zoomByWheel(mx, my, event.deltaY);
                } else {
                    this.editor.dragOffset(event.deltaX, event.deltaY);
                    this.editor.$forceUpdate();
                }
            }
        }
    }

    zoomByWheel(mx, my, delta) {
        var nz = 0;
        var xo = this.editor.vOffsetX;
        var yo = this.editor.vOffsetY;
        if (delta < 0) {
            nz = this.editor.vZoom * 1.05;

            this.editor.updateOffset(
                mx - nz * (mx - xo) / this.editor.vZoom,
                my - nz * (my - yo) / this.editor.vZoom
            );
            this.editor.updateZoom(nz);
        } else {
            if (this.editor.vZoom > 0.05) {
                nz = this.editor.vZoom / 1.05;

                this.editor.updateOffset(
                    mx - nz * (mx - xo) / this.editor.vZoom,
                    my - nz * (my - yo) / this.editor.vZoom
                );
                this.editor.updateZoom(nz);
            }
        }
        this.editor.$forceUpdate();
    }

    snapX(value) {
        return this.snapToGrid(value);
    }

    snapY(value) {
        return this.snapToGrid(value);
    }

    snapToGrid(value) {
        return Math.round(value / 20) * 20;
    }

}

export default State;
