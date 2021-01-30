/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import Shape from '../items/shapes/Shape';
import forEach from 'lodash/forEach';
import EventBus from '../EventBus.js';
import StoreUtils from '../../../store/StoreUtils';

export default class StateCreateItem extends State {
    constructor(eventBus, store) {
        super(eventBus, store);
        this.name = 'create-item';
        this.item = null;
        this.addedToScheme = false;
        this.originalPoint = null;
    }

    reset() {
        this.item = null;
        this.addedToScheme = false;
        this.updateCursor('default');
    }

    setItem(item) {
        this.item = item;
        this.updateCursor('crosshair');
    }

    mouseDown(x, y, mx, my, object, event) {
        const newOffset = this.snapPoints({
            vertical: [{x, y}],
            horizontal: [{x, y}]
        }, new Set(), 0, 0);

        this.originalPoint = {x: x + newOffset.dx, y: y + newOffset.dy};
        this.item.name = this.schemeContainer.generateUniqueName(this.item.name);
        this.schemeContainer.addItem(this.item);
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
            this.updateItemArea(x + newOffset.dx, y + newOffset.dy);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.addedToScheme) {
            const newOffset = this.snapPoints({
                vertical: [{x, y}],
                horizontal: [{x, y}]
            }, new Set(), 0, 0);
            this.updateItemArea(x + newOffset.dx, y + newOffset.dy);
            this.submitItemAndFinishCreating();
        } else {
            this.cancel();
        }
        StoreUtils.clearItemSnappers(this.store);
    }

    submitItemAndFinishCreating() {
        this.schemeContainer.setActiveBoundaryBox(null);
        
        if (this.store.state.itemCreating.autoRemount && this.item.shape !== 'hud') {
            const parentItem = this.findItemSuitableForParent(this.item.area);
            this.schemeContainer.deselectAllItems();
            if (parentItem) {
                this.schemeContainer.remountItemInsideOtherItem(this.item.id, parentItem.id);
            }
        }
        this.schemeContainer.selectItem(this.item);
        this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
        this.eventBus.emitItemChanged(this.item.id);
        this.eventBus.emitSchemeChangeCommited();
        this.reset();
    }

    /**
     * Searches for item that is able to fit item inside it and that has the min area out of all specified items
     * @param {*} area 
     * @returns {Item}
     */
    findItemSuitableForParent(area) {
        const points = [
            { x: area.x,  y: area.y },
            { x: area.x + area.w,  y: area.y },
            { x: area.x + area.w,  y: area.y + area.h},
            { x: area.x,  y: area.y + area.h},
        ];

        const items = this.schemeContainer.getItems();

        // doing backwards search as getItems() returns a list of all items ordered by their layering position on screen
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];

            // connectors should not be parent of any other items
            if (item.visible && item.shape !== 'connector' && item.id !== this.item.id) {
                let fitsInside = true;
                for (let i = 0; i < points.length && fitsInside; i++) {
                    const localPoint = this.schemeContainer.localPointOnItem(points[i].x, points[i].y, item);
                    fitsInside = localPoint.x >= 0 && localPoint.y >= 0 && localPoint.x <= item.area.w && localPoint.y <= item.area.h;
                }

                if (fitsInside) {
                    return item;
                }
            }
        }

        return null;
    }

    updateItemArea(x, y) {
        if (x > this.originalPoint.x) {
            this.item.area.w = x - this.originalPoint.x;
            this.item.area.x = this.originalPoint.x;
        } else {
            this.item.area.w = this.originalPoint.x - x;
            this.item.area.x = x;
        }

        if (y > this.originalPoint.y) {
            this.item.area.h = y - this.originalPoint.y;
            this.item.area.y = this.originalPoint.y;
        } else {
            this.item.area.h = this.originalPoint.y - y;
            this.item.area.y = y;
        }
        EventBus.emitItemChanged(this.item.id);
    }
}
