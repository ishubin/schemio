/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import UserEventBus from '../../../userevents/UserEventBus.js';
import Events from '../../../userevents/Events.js';

const MOUSE_IN = Events.standardEvents.mousein.id;
const MOUSE_OUT = Events.standardEvents.mouseout.id;
const CLICKED = Events.standardEvents.clicked.id;
const SELECTED = Events.standardEvents.selected.id;
const DESELECTED = Events.standardEvents.deselected.id;

/*
This state works as dragging the screen, zooming, selecting elements
*/
class StateInteract extends State {
    /**
     * 
     * @param {*} editor 
     * @param {UserEventBus} userEventBus 
     */
    constructor(editor, eventBus, userEventBus) {
        super(editor, eventBus);
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
                if (object && object.item) {
                    this.emit(object.item, CLICKED);

                    if (object.item.interactive) {
                        this.emit(object.item, SELECTED);
                        _.forEach(this.schemeContainer.selectedItems, item => {
                            if (item.id !== object.item.id) {
                                this.emit(item, DESELECTED);
                                this.eventBus.emitItemDeselected(item.id);
                            }
                        });
                        this.schemeContainer.selectItem(object.item, false);
                        this.eventBus.emitItemSelected(object.item.id);
                    }
                } else {
                    //clicked in empty space and didn't drag screen, so we can deselect everything
                    _.forEach(this.schemeContainer.selectedItems, item => {
                        this.eventBus.emitItemDeselected(item.id)
                        this.emit(item, DESELECTED);
                    });
                    this.schemeContainer.deselectAllItems();
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
                this.emit(object.item, MOUSE_IN);
                this.currentHoveredItem = object.item;
            } else if (this.currentHoveredItem.id !== object.item.id) {
                this.emit(this.currentHoveredItem, MOUSE_OUT);
                this.emit(object.item, MOUSE_IN);
                this.currentHoveredItem = object.item;
            }
        } else {
            if (this.currentHoveredItem) {
                this.emit(this.currentHoveredItem, MOUSE_OUT);
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
