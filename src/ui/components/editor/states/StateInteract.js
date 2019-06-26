/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import EventBus from '../EventBus.js';
import UserEventBus from '../../../userevents/UserEventBus.js';

/*
This state works as dragging the screen, zooming, selecting elements
*/
class StateInteract extends State {
    /**
     * 
     * @param {*} editor 
     * @param {UserEventBus} userEventBus 
     */
    constructor(editor, userEventBus) {
        super(editor);
        this.name = 'interact';
        this.schemeContainer = editor.schemeContainer;
        this.startedDragging = false;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;
        
        // used in order to track whether mousein or mouseout event can be produced
        this.currentHoveredItem = null;
        this.userEventBus = userEventBus;
    }

    reset() {
        this.startedDragging = false;
    }

    mouseDown(x, y, mx, my, object, event){
        this.initScreenDrag(mx, my);
    }

    initScreenDrag(x, y) {
        this.startedDragging = true;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.editor.vOffsetX, y: this.editor.vOffsetY};
        this.originalZoom = this.editor.vZoom;
    }


    mouseUp(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            if (Math.abs(mx - this.initialClickPoint.x) + Math.abs(my - this.initialClickPoint.y) < 3) {
                if (object && object.item && object.item.interactive) {
                    this.schemeContainer.selectItem(object.item, false);
                    EventBus.$emit(EventBus.ACTIVE_ITEM_SELECTED, object.item);
                } else {
                    //clicked in empty space and didn't drag screen, so we can deselect everything
                    this.schemeContainer.deselectAllItems();
                    EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);
                }
            }
            this.dragScreen(mx, my);
            this.initialClickPoint = null;
            this.startedDragging = false;
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.reset();
            } else {
                this.dragScreen(mx, my);
            }
        } else {
            this.handleItemHoverEvents(object);
        }
    }


    handleItemHoverEvents(object) {
        if (object && object.item) {
            if (!this.currentHoveredItem) {
                this.emit(object.item, 'mousein');
                this.currentHoveredItem = object.item;
            } else if (this.currentHoveredItem.id !== object.item.id) {
                this.emit(this.currentHoveredItem, 'mouseout');
                this.emit(object.item, 'mousein');
                this.currentHoveredItem = object.item;
            }
        } else {
            if (this.currentHoveredItem) {
                this.emit(this.currentHoveredItem, 'mouseout');
                this.currentHoveredItem = null;
            }
        }
    }

    emit(originator, eventName) {
        if (originator && originator.id) {
            this.userEventBus.emitItemEvent(originator.id, eventName);
        }
    }

    dragScreen(x, y) {
        this.editor.updateOffset(
            Math.floor(this.originalOffset.x + x - this.initialClickPoint.x),
            Math.floor(this.originalOffset.y + y - this.initialClickPoint.y)
        );
        this.editor.$forceUpdate();
    }
}

export default StateInteract;
