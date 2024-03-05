/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import StoreUtils from '../../../store/StoreUtils';
import Shape from '../items/shapes/Shape.js';
import { traverseItems } from '../../../scheme/Item.js';
import EditorEventBus from '../EditorEventBus.js';

export default class StateCreateItem extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'create-item', listener);
        this.item = null;
        /** @type {CompiledItemTemplate} */
        this.template = null;
        this.addedToScheme = false;
        this.originalPoint = null;
    }

    reset() {
        this.item = null;
        this.template = null;
        this.addedToScheme = false;
    }

    /**
     * @param {Item} item
     * @param {CompiledItemTemplate|undefined} template
     */
    setItem(item, template) {
        this.item = item;
        this.template = template;

        const shape = Shape.find(item.shape);
        if (shape && shape.shapeEvents && shape.shapeEvents.beforeCreate) {
            shape.shapeEvents.beforeCreate(this.store, item);
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        const newOffset = this.snapPoints({
            vertical: [{x, y}],
            horizontal: [{x, y}]
        }, new Set(), 0, 0);

        this.originalPoint = {x: x + newOffset.dx, y: y + newOffset.dy};
        this.item.name = this.schemeContainer.generateUniqueName(this.item.name);
        this.item.area.w = 0;
        this.item.area.h = 0;
        this.schemeContainer.addNonIndexableItem(this.item);
        this.addedToScheme = true;
        this.schemeContainer.setActiveBoundaryBox(this.item.area);
    }

    mouseMove(x, y, mx, my, object, event) {
        StoreUtils.clearItemSnappers(this.store);
        if (this.addedToScheme) {
            if (event.buttons === 0) {
                // no buttons are pressed so it should cancel the dragging state
                this.submitItemAndFinishCreating();
                return;
            }

            const newOffset = this.snapPoints({
                vertical: [{x, y}],
                horizontal: [{x, y}]
            }, new Set(), 0, 0);
            this.updateItemArea(x + newOffset.dx, y + newOffset.dy, event);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.addedToScheme) {
            const newOffset = this.snapPoints({
                vertical: [{x, y}],
                horizontal: [{x, y}]
            }, new Set(), 0, 0);
            this.updateItemArea(x + newOffset.dx, y + newOffset.dy, event);
            this.submitItemAndFinishCreating();
        } else {
            this.cancel();
        }
        StoreUtils.clearItemSnappers(this.store);
    }

    submitItemAndFinishCreating() {
        this.schemeContainer.setActiveBoundaryBox(null);

        if (this.template) {
            const templatedItem = this.schemeContainer.generateItemFromTemplate(this.template, this.template.getDefaultArgs(), this.item.area.w, this.item.area.h);
            templatedItem.area.x = this.item.area.x;
            templatedItem.area.y = this.item.area.y;
            templatedItem.area.w = this.item.area.w;
            templatedItem.area.h = this.item.area.h;
            this.schemeContainer.deleteItem(this.item);
            this.schemeContainer.addItem(templatedItem);
            this.item = templatedItem;
        }

        if (this.store.state.autoRemount && this.item.shape !== 'hud') {
            const parentItem = this.schemeContainer.findItemSuitableForParent(this.item);
            this.schemeContainer.deselectAllItems();
            if (parentItem) {
                this.schemeContainer.remountItemInsideOtherItem(this.item.id, parentItem.id);
            }
        }
        this.schemeContainer.reindexItems();
        this.schemeContainer.selectItem(this.item);
        this.listener.onItemChanged(this.item.id);
        this.listener.onSchemeChangeCommitted();
        if (this.template) {
            EditorEventBus.item.templateSelected.$emit(this.editorId, this.item, this.template.templateRef);
        }
        this.cancel();
    }


    updateItemArea(x, y, event) {
        if (x > this.originalPoint.x) {
            this.item.area.w = this.round(x - this.originalPoint.x);
            this.item.area.x = this.round(this.originalPoint.x);
        } else {
            this.item.area.w = this.round(this.originalPoint.x - x);
            this.item.area.x = this.round(x);
        }

        if (y > this.originalPoint.y) {
            this.item.area.h = this.round(y - this.originalPoint.y);
            this.item.area.y = this.round(this.originalPoint.y);
        } else {
            this.item.area.h = this.round(this.originalPoint.y - y);
            this.item.area.y = this.round(y);
        }

        if (event.metaKey || event.ctrlKey) {
            this.item.area.w = Math.max(this.item.area.w, this.item.area.h);
            this.item.area.h = this.item.area.w;
        }


        if (this.template) {
            this.schemeContainer.regenerateTemplatedItem(this.item, this.template, this.item.args.templateArgs, this.item.area.w, this.item.area.h);
            traverseItems([this.item], item => this.listener.onItemChanged(item.id));
        } else {
            this.listener.onItemChanged(this.item.id);
        }
    }
}