/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import UserEventBus from '../../../userevents/UserEventBus.js';
import Events from '../../../userevents/Events.js';
import EventBus from '../EventBus.js';
import {ItemInteractionMode} from '../../../scheme/Item.js';
import { Keys } from '../../../events';

const MOUSE_IN = Events.standardEvents.mousein.id;
const MOUSE_OUT = Events.standardEvents.mouseout.id;
const CLICKED = Events.standardEvents.clicked.id;

/*
This state works as dragging the screen, zooming, selecting elements
*/
class StateInteract extends State {
    /**
     * 
     * @param {EventBus} EventBus 
     * @param {UserEventBus} userEventBus 
     */
    constructor(eventBus, store, userEventBus) {
        super(eventBus, store);
        this.name = 'interact';
        this.startedDragging = false;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;
        
        // used in order to track whether mousein or mouseout event can be produced
        this.currentHoveredItem = null;
        this.userEventBus = userEventBus;
    }

    reset() {
        this.initialClickPoint = null;
        this.startedDragging = false;
    }

    mouseDown(x, y, mx, my, object, event){
        this.initScreenDrag(mx, my);
    }

    initScreenDrag(x, y) {
        this.startedDragging = true;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
        this.originalZoom = this.schemeContainer.screenTransform.scale;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.MINUS) {
            this.zoomOutByKey();
        } else if (key === Keys.EQUALS) {
            this.zoomInByKey();
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            if (Math.abs(mx - this.initialClickPoint.x) + Math.abs(my - this.initialClickPoint.y) < 3) {
                if (object && object.item) {
                    this.eventBus.$emit(EventBus.ANY_ITEM_CLICKED, object.item);
                    this.emit(object.item, CLICKED);
                    this.handleItemClick(object.item, mx, my);
                } else {
                    // checking whether user clicked on the item link or not
                    // if it was item link - then we don't want to remove them from DOM
                    if (!event.target || !event.target.closest('.item-link')) {
                        this.eventBus.$emit(EventBus.VOID_CLICKED);
                    }
                }
            }
            this.reset();
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            event.preventDefault();
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

    handleItemClick(item, mx, my) {
        if (item.links && item.links.length > 0) {
            this.eventBus.$emit(EventBus.ITEM_LINKS_SHOW_REQUESTED, item);
        }

        /*
        This is very dirty but it is the simplest way to check if the item has a proper description
        If would only check for non-empty strings, then it would still show side panel 
        even when description is an empty parahraph like "<p></p>"
        This happens when you use rich text editor and delete the entire description.
        Obviously it would be better to check for actual text elements inside the strings but it is also an overkill.
        */
        if (item.description.trim().length > 8) {
            if (item.interactionMode === ItemInteractionMode.SIDE_PANEL) {
                this.eventBus.$emit(EventBus.ITEM_SIDE_PANEL_TRIGGERED, item);
            } else if (item.interactionMode === ItemInteractionMode.TOOLTIP) {
                this.eventBus.$emit(EventBus.ITEM_TOOLTIP_TRIGGERED, item, mx, my);
            }
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

    emit(element, eventName) {
        if (element && element.id) {
            this.userEventBus.emitItemEvent(element.id, eventName);
        }
    }

    dragScreen(x, y) {
        this.dragScreenTo(
            Math.floor(this.originalOffset.x + x - this.initialClickPoint.x),
            Math.floor(this.originalOffset.y + y - this.initialClickPoint.y)
        );
    }
}

export default StateInteract;
