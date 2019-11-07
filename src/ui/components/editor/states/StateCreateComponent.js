/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
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
            
            _.forEach(this.schemeContainer.selectItems, item => this.eventBus.emitItemDeselected(item.id));
            this.schemeContainer.selectItem(this.component);
            this.eventBus.emitItemSelected(this.component.id);
            this.eventBus.$emit(this.eventBus.SWITCH_MODE_TO_EDIT);
            this.eventBus.emitItemChanged(this.component.id);
            this.eventBus.emitSchemeChangeCommited();
            this.reset();
        } else {
            this.cancel();
        }
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
    }

    /**
     * Searches for all item names and adds numeric index so that it becomes unique in the scheme
     * @param {string} name 
     */
    findProperComponentName(name) {
        const itemNames = _.map(this.schemeContainer.scheme.items, item => item.name);
        return collections.giveUniqueName(name, itemNames);
    }
}
