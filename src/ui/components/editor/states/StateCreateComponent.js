/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import Shape from '../items/shapes/Shape';
import _ from 'lodash';
import collections from '../../../collections.js';

export default class StateCreateComponent extends State {
    constructor(editor, eventBus) {
        super(editor, eventBus);
        this.name = 'create-component';
        this.component = null;
        this.addedToScheme = false;
        this.originalPoint = null;
        this.schemeContainer = editor.schemeContainer;
    }

    reset() {
        this.component = null;
        this.addedToScheme = false;
        this.updateCursor('default');
    }

    setComponent(component) {
        this.component = component;
        this.updateCursor('crosshair');
    }

    mouseDown(x, y, mx, my, object, event) {
        this.originalPoint = {x: this.snapX(x), y: this.snapY(y)};
        this.component.name = this.findProperComponentName(this.component.name);
        this.schemeContainer.addItem(this.component);
        this.refreshControlPoints(this.component);
        this.addedToScheme = true;
        this.schemeContainer.setActiveBoundaryBox(this.component.area);
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.addedToScheme) {
            this.updateComponentArea(this.snapX(x), this.snapY(y));
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.addedToScheme) {
            this.updateComponentArea(this.snapX(x), this.snapY(y));
            this.schemeContainer.setActiveBoundaryBox(null);
            
            const parentItem = this.findItemSuitableForParent(this.schemeContainer.selectedItems, this.component.area);
            this.schemeContainer.deselectAllItems();
            if (parentItem) {
                this.schemeContainer.remountItemInsideOtherItem(this.component.id, parentItem.id);
            }
            this.schemeContainer.selectItem(this.component);
            this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
            this.eventBus.emitItemChanged(this.component.id);
            this.eventBus.emitSchemeChangeCommited();
            this.reset();
        } else {
            this.cancel();
        }
    }

    /**
     * Searches for item that is able to fit item inside it and that has the min area out of all specified items
     * @param {*} items 
     * @param {*} area 
     * @returns {Item}
     */
    findItemSuitableForParent(items, area) {
        let maxArea = -1;
        let itemFound = null;

        _.forEach(items, item => {
            const points = [
                { x: area.x,  y: area.y },
                { x: area.x + area.w,  y: area.y },
                { x: area.x + area.w,  y: area.y + area.h},
                { x: area.x,  y: area.y + area.h},
            ];

            let fitsInside = true;
            for (let i = 0; i < points.length && fitsInside; i++) {
                const localPoint = this.schemeContainer.localPointOnItem(points[i].x, points[i].y, item);
                fitsInside = localPoint.x >= 0 && localPoint.y >= 0 && localPoint.x <= item.area.w && localPoint.y <= item.area.h;
            }

            if (fitsInside) {
                if (maxArea < 0 || maxArea > item.area.w*item.area.h) {
                    itemFound = item;
                    maxArea = item.area.w * item.area.h;
                }
            }
        });

        return itemFound;
    }

    updateComponentArea(x, y) {
        if (x > this.originalPoint.x) {
            this.component.area.w = x - this.originalPoint.x;
            this.component.area.x = this.originalPoint.x;
        } else {
            this.component.area.w = this.originalPoint.x - x;
            this.component.area.x = x;
        }

        if (y > this.originalPoint.y) {
            this.component.area.h = y - this.originalPoint.y;
            this.component.area.y = this.originalPoint.y;
        } else {
            this.component.area.h = this.originalPoint.y - y;
            this.component.area.y = y;
        }
        this.refreshControlPoints(this.component);
    }

    refreshControlPoints(item) {
        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            item.meta.controlPoints = shape.controlPoints.make(item);
        }
    }

    /**
     * Searches for all item names and adds numeric index so that it becomes unique in the scheme
     * @param {string} name 
     */
    findProperComponentName(name) {
        const itemNames = _.map(this.schemeContainer.getItems(), item => item.name);
        return collections.giveUniqueName(name, itemNames);
    }
}
