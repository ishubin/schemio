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
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'crop-image';
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
    }

    setImageEditBox(editBox) {
        this.editBox = editBox;
    }

    mouseDown(x, y, mx, my, object, event) {
        this.modificationContextId = shortid.generate();
        if (object.type === 'multi-item-edit-box-resize-dragger') {
            this.initMultiItemBoxResize(object.draggerEdges, x, y, mx, my);
        }
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
        this.reset();

        const worldPoint = myMath.worldPointInArea(0, 0, this.editBox.area);
        const wpRight = myMath.worldPointInArea(this.editBox.area.w, 0, this.editBox.area);
        const wpDown = myMath.worldPointInArea(0, this.editBox.area.h, this.editBox.area);

        const localPoint = localPointOnItem(worldPoint.x, worldPoint.y, this.item);
        const localPointRight = localPointOnItem(wpRight.x, wpRight.y, this.item);
        const localPointDown = localPointOnItem(wpDown.x, wpDown.y, this.item);

        if (!myMath.tooSmall(this.item.area.w)) {
            this.item.shapeProps.crop.x = Math.max(0, localPoint.x / this.item.area.w);
            this.item.shapeProps.crop.w = Math.max(0, (localPointRight.x - this.item.area.w) / this.item.area.w);
        }
        if (!myMath.tooSmall(this.item.area.h)) {
            this.item.shapeProps.crop.y = Math.max(0, localPoint.y / this.item.area.h);
            this.item.shapeProps.crop.h = Math.max(0, (localPointDown.y - this.item.area.h) / this.item.area.h);
        }

        this.schemeContainer.updateMultiItemEditBoxItems(this.editBox, IS_SOFT, {
            moved: false,
            rotated: false,
            resized: true,
            id: this.modificationContextId
        }, this.getUpdatePrecision());
    }
}