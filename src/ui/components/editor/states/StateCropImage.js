import shortid from 'shortid';
import myMath from "../../../myMath";
import { localPointOnItem } from "../../../scheme/SchemeContainer";
import utils from "../../../utils";
import State from "./State";
import { dragMultiItemEditBoxByDragger } from "./StateDragItem";

const IS_SOFT = true;
const IS_NOT_SOFT = false;

export default class StateCropImage extends State {
    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus, store, listener) {
        super(eventBus, store, 'crop-image', listener);
        this.item = null;
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
        if (object.type === 'multi-item-edit-box-resize-dragger') {
            this.initMultiItemBoxResize(object.draggerEdges, x, y, mx, my);

        } else if (object.type === 'multi-item-edit-box-reset-image-crop-link'){
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
        this.schemeContainer.updateMultiItemEditBox();
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
        this.initOriginalAreasForMultiItemEditBox(this.editBox);
        this.draggerEdges = draggerEdges;
    }

    initOriginalAreasForMultiItemEditBox(multiItemEditBox) {
        this.editBoxOriginalArea = utils.clone(multiItemEditBox.area);
    }


    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging) {
            if (this.draggerEdges) {
                this.dragMultiItemEditBoxByDragger(x, y, this.draggerEdges, event);
            }
        }
    }

    dragMultiItemEditBoxByDragger(x, y, draggerEdges, event) {
        dragMultiItemEditBoxByDragger(
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

        this.schemeContainer.updateMultiItemEditBoxItems(this.editBox, IS_SOFT, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        }, this.getUpdatePrecision());

        if (!myMath.tooSmall(this.item.area.w)) {
            this.item.shapeProps.crop.x = (localPoint.x - x0) / this.item.area.w;
            this.item.shapeProps.crop.w = w0 / this.item.area.w - this.item.shapeProps.crop.x - 1;
        }
        if (!myMath.tooSmall(this.item.area.h)) {
            this.item.shapeProps.crop.y = (localPoint.y - y0) / this.item.area.h;
            this.item.shapeProps.crop.h = h0 / this.item.area.h - this.item.shapeProps.crop.y - 1;
        }

        if (changeCommitted) {
            this.listener.onSchemeChangeCommitted();
        }
    }

    resetCrop() {
        this.item.area.x -= this.item.shapeProps.crop.x * this.item.area.w;
        this.item.area.y -= this.item.shapeProps.crop.y * this.item.area.h;

        this.item.area.w = this.item.area.w * (1 + this.item.shapeProps.crop.x + this.item.shapeProps.crop.w);
        this.item.area.h = this.item.area.h * (1 + this.item.shapeProps.crop.y + this.item.shapeProps.crop.h);
        this.item.shapeProps.crop.x = 0;
        this.item.shapeProps.crop.y = 0;
        this.item.shapeProps.crop.w = 0;
        this.item.shapeProps.crop.h = 0;

        this.listener.onSchemeChangeCommitted();
        this.cancel();
    }
}