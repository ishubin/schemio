import shortid from 'shortid';
import myMath from "../../../myMath";
import utils from "../../../utils";
import State from "./State";
import { dragEditBoxByDragger } from "./StateDragItem";
import { localPointOnItem } from '../../../scheme/ItemMath';

export default class StateImageBox extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'image-box', listener);

        /** @type {Item} */
        this.item = null;

        /** @type {EditBox} */
        this.editBox = null;

        /** @type {Area} */
        this.originalImageBox = {x: 0, y: 0, w: 1, h: 1};
        this.originalPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.startedDragging = true;
        // array of edge names. used to resize multi item edit box using its edge draggers
        this.draggerEdges = null;

        /** @type {ItemArea} */
        this.editBoxOriginalArea = null;

        this.modificationContextId = null;
    }

    reset() {
        this.originalPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.startedDragging = true;
        this.draggerEdges = null;
        this.editBoxOriginalArea = null;
        this.modificationContextId = null;
    }

    /**
     * @param {Item} item
     */
    setImageItem(item) {
        this.item = item;
        if (!item.shapeProps.fill.imageBox) {
            item.shapeProps.fill.imageBox = {x: 0, y: 0, w: 1, h: 1};
        }
        this.originalImageBox = utils.clone(item.shapeProps.fill.imageBox);
    }

    setImageEditBox(editBox) {
        this.editBox = editBox;
    }

    mouseDown(x, y, mx, my, object, event) {
        this.modificationContextId = shortid.generate();
        if (object.type === 'edit-box-resize-dragger') {
            this.initMultiItemBoxResize(object.draggerEdges, x, y, mx, my);
        } else if (object.type === 'edit-box-reset-image-crop-link'){
            this.resetImageBox();
        } else {
            this.cancel();
        }
    }

    cancel() {
        this.submit();
        super.cancel();
    }

    submit() {
        this.schemeContainer.reindexItems();
        this.schemeContainer.updateEditBox();
    }

    initDragging(x, y, mx, my) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.originalPoint.mx = mx;
        this.originalPoint.my = my;
        this.startedDragging = true;
    }

    initMultiItemBoxResize(draggerEdges, x, y, mx, my) {
        this.initDragging(x, y, mx, my);
        this.initOriginalAreasForEditBox(this.editBox);
        this.draggerEdges = draggerEdges;
    }

    initOriginalAreasForEditBox(editBox) {
        this.editBoxOriginalArea = utils.clone(editBox.area);
    }


    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging) {
            if (this.draggerEdges) {
                if (event.buttons === 0) {
                    this.mouseUp(x, y, mx, my, object, event);
                    return;
                }
                this.dragEditBoxByDragger(x, y, this.draggerEdges, event);
                this.updateItemImageBox();
            }
        }
    }

    dragEditBoxByDragger(x, y, draggerEdges, event) {
        dragEditBoxByDragger(
            this.editBox,
            this.editBoxOriginalArea,
            this.originalPoint,
            this.store,
            null, // no snapper
            x, y, draggerEdges);
    }

    updateItemImageBox() {
        const p0 = localPointOnItem(this.editBox.area.x, this.editBox.area.y, this.item);
        const p1 = localPointOnItem(this.editBox.area.x + this.editBox.area.w, this.editBox.area.y + this.editBox.area.h, this.item);

        if (!myMath.tooSmall(this.item.area.w)) {
            this.item.shapeProps.fill.imageBox.x = p0.x / this.item.area.w;
            this.item.shapeProps.fill.imageBox.w = Math.abs(p1.x - p0.x) / this.item.area.w;
        }
        if (!myMath.tooSmall(this.item.area.h)) {
            this.item.shapeProps.fill.imageBox.y = p0.y / this.item.area.h;
            this.item.shapeProps.fill.imageBox.h = Math.abs(p1.y - p0.y) / this.item.area.h;
        }

        this.listener.onItemChanged(this.item.id, 'shapeProps.fill');
        this.listener.onSchemeChangeCommitted();
    }

    mouseUp(x, y, mx, my, object, event) {
        this.updateItemImageBox();
        this.reset();
    }

    resetImageBox() {
        this.item.shapeProps.fill.imageBox = {x: 0, y: 0, w: 1, h: 1};

        this.listener.onSchemeChangeCommitted();
        this.cancel();
    }
}