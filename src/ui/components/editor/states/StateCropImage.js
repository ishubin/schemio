import shortid from 'shortid';
import myMath from "../../../myMath";
import utils from "../../../utils";
import State from "./State";
import { dragEditBoxByDragger } from "./StateDragItem";
import EditorEventBus from '../EditorEventBus';

const IS_SOFT = true;
const IS_NOT_SOFT = false;

export default class StateCropImage extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'crop-image', listener);
        /** @type {Item} */
        this.item = null;
        /** @type {EditBox} */
        this.editBox = null;
        this.originalPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.startedDragging = true;
        // array of edge names. used to resize multi item edit box using its edge draggers
        this.draggerEdges = null;
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
        this.originalItemCrop = utils.clone(item.shapeProps.crop);
        this.originalItemArea = utils.clone(item.area);
        this.origianlItemTransformMatrix = utils.clone(item.meta.transformMatrix);
    }

    setImageEditBox(editBox) {
        this.editBox = editBox;
    }

    mouseDown(x, y, mx, my, object, event) {
        this.modificationContextId = shortid.generate();
        if (object.type === 'edit-box-resize-dragger') {
            this.initMultiItemBoxResize(object.draggerEdges, x, y, mx, my);

        } else if (object.type === 'edit-box-reset-image-crop-link'){
            this.resetCrop();
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
                this.dragEditBoxByDragger(x, y, this.draggerEdges, event);
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

    mouseUp(x, y, mx, my, object, event) {
        const changeCommitted = this.startedDragging;
        this.reset();

        const worldPoint = myMath.worldPointInArea(0, 0, this.editBox.area);
        const localPoint = myMath.localPointInArea(worldPoint.x, worldPoint.y, this.originalItemArea, this.origianlItemTransformMatrix);

        const x0 = -this.originalItemCrop.x * this.originalItemArea.w;
        const y0 = -this.originalItemCrop.y * this.originalItemArea.h;
        const w0 = this.originalItemArea.w * (1 + this.originalItemCrop.x + this.originalItemCrop.w);
        const h0 = this.originalItemArea.h * (1 + this.originalItemCrop.y + this.originalItemCrop.h);

        this.schemeContainer.updateEditBoxItems(this.editBox, IS_SOFT, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        }, this.getUpdatePrecision());

        if (!myMath.tooSmall(this.item.area.w)) {
            this.item.shapeProps.crop.x = myMath.roundPrecise((localPoint.x - x0) / this.item.area.w, 3);
            this.item.shapeProps.crop.w = myMath.roundPrecise(w0 / this.item.area.w - this.item.shapeProps.crop.x - 1, 3);
        }
        if (!myMath.tooSmall(this.item.area.h)) {
            this.item.shapeProps.crop.y = myMath.roundPrecise((localPoint.y - y0) / this.item.area.h, 3);
            this.item.shapeProps.crop.h = myMath.roundPrecise(h0 / this.item.area.h - this.item.shapeProps.crop.y - 1, 3);
        }

        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'shapeProps.crop');

        if (changeCommitted) {
            this.listener.onSchemeChangeCommitted();
        }
    }

    resetCrop() {
        this.item.area.x -= myMath.roundPrecise2(this.item.shapeProps.crop.x * this.item.area.w);
        this.item.area.y -= myMath.roundPrecise2(this.item.shapeProps.crop.y * this.item.area.h);

        this.item.area.w = myMath.roundPrecise2(this.item.area.w * (1 + this.item.shapeProps.crop.x + this.item.shapeProps.crop.w));
        this.item.area.h = myMath.roundPrecise2(this.item.area.h * (1 + this.item.shapeProps.crop.y + this.item.shapeProps.crop.h));
        this.item.shapeProps.crop.x = 0;
        this.item.shapeProps.crop.y = 0;
        this.item.shapeProps.crop.w = 0;
        this.item.shapeProps.crop.h = 0;

        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'shapeProps.crop');

        this.listener.onSchemeChangeCommitted();
        this.cancel();
    }
}