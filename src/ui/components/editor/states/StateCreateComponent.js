/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import EventBus from '../EventBus.js';
import _ from 'lodash';

export default class StateCreateComponent extends State {
    constructor(editor) {
        super(editor);
        this.name = 'create-component';
        this.component = null;
        this.addedToScheme = false;
        this.originalPoint = null;
        this.schemeContainer = editor.schemeContainer;
    }

    reset() {
        this.component = null;
        this.addedToScheme = false;
    }

    setComponent(component) {
        this.component = component;
    }

    mouseDown(x, y, mx, my, object, event) {
        this.originalPoint = {x: this.snapX(x), y: this.snapY(y)};
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
            
            _.forEach(this.schemeContainer.selectItems, item => EventBus.emitItemDeselected(item.id));
            this.schemeContainer.selectItem(this.component);
            EventBus.emitItemSelected(this.component.id);
            EventBus.$emit(EventBus.SWITCH_MODE_TO_EDIT);
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
}
