/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import UserEventBus from '../../../userevents/UserEventBus.js';
import Events from '../../../userevents/Events.js';
import {hasItemDescription, ItemInteractionMode} from '../../../scheme/Item.js';
import { Keys } from '../../../events';

const MOUSE_IN = Events.standardEvents.mousein.id;
const MOUSE_OUT = Events.standardEvents.mouseout.id;
const CLICKED = Events.standardEvents.clicked.id;

const MAX_TRACK_MOUSE_POSITIONS = 5;

/*
This state works as dragging the screen, zooming, selecting elements
*/
class StateInteract extends State {
    /**
     *
     * @param {UserEventBus} userEventBus
     */
    constructor(store, userEventBus, listener) {
        super(store,  'interact', listener);
        this.startedDragging = false;
        this.initialClickPoint = null;
        this.originalOffset = {x:0, y: 0};
        this.originalZoom = 1.0;

        // used in order to track whether mousein or mouseout event can be produced
        this.currentHoveredItem = null;
        this.hoveredItemIds = new Set();
        this.userEventBus = userEventBus;
        this.inertiaDrag = {
            speed: 0,
            direction: {x: 0, y: 0},
            positionTracker: {
                idx: 0,
                positions: []
            }
        };
    }

    softReset() {
        this.initialClickPoint = null;
        this.startedDragging = false;
    }

    reset() {
        this.softReset();
        this.hoveredItemIds = new Set();
    }

    mouseDown(x, y, mx, my, object, event){
        super.mouseDown(x, y, mx, my, object, event);
        this.initScreenDrag(mx, my);
    }

    initScreenDrag(x, y) {
        this.startedDragging = true;
        this.initialClickPoint = {x, y};
        this.originalOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
        this.originalZoom = this.schemeContainer.screenTransform.scale;
        this.inertiaDrag.positionTracker.idx = 0;
        this.inertiaDrag.positionTracker.positions = [];
        this.inertiaDrag.speed = 0;
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.MINUS) {
            this.zoomOut();
        } else if (key === Keys.EQUALS) {
            this.zoomIn();
        } else if (key === Keys.CTRL_ZERO) {
            this.resetZoom();
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.startedDragging && this.initialClickPoint) {
            this.initScreenInertia();

            if (Math.abs(mx - this.initialClickPoint.x) + Math.abs(my - this.initialClickPoint.y) < 3) {
                if (object && object.item) {
                    this.listener.onItemClicked(object.item);
                    this.emit(object.item, CLICKED);
                    this.handleItemClick(object.item, mx, my);
                } else {
                    // checking whether user clicked on the item link or not
                    // if it was item link - then we don't want to remove them from DOM
                    if (!event.target || !event.target.closest('.item-link')) {
                        this.listener.onVoidClicked();
                    }
                }
            }
            this.softReset();
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (event.touches && event.touches.length === 2) {
            this.mobilePinchToZoom(event);
            return;
        }
        if (this.startedDragging && this.initialClickPoint) {
            event.preventDefault();
            if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.softReset();
            } else {
                this.dragScreen(mx, my);
            }
        } else {
            this.handleItemHoverEvents(object);
        }
    }

    handleItemClick(item, mx, my) {
        if (item.links && item.links.length > 0) {
            this.listener.onItemLinksShowRequested(item);
        }
        if (hasItemDescription(item)) {
            if (item.interactionMode === ItemInteractionMode.SIDE_PANEL) {
                this.listener.onItemSidePanelRequested(item);
            } else if (item.interactionMode === ItemInteractionMode.TOOLTIP) {
                this.listener.onItemTooltipRequested(item, mx, my);
            }
        }
    }

    sendItemEventById(itemId, event) {
        const item = this.schemeContainer.findItemById(itemId);
        if (item) {
            this.emit(item, event);
        }
    }

    handleItemHoverEvents(object) {
        if (object && object.type === 'item' && object.item) {
            if (!this.currentHoveredItem) {
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    this.hoveredItemIds = new Set(object.item.meta.ancestorIds.concat([object.item.id]));
                    object.item.meta.ancestorIds.forEach(itemId => {
                        this.sendItemEventById(itemId, MOUSE_IN);
                    });
                } else {
                    this.hoveredItemIds = new Set([object.item.id]);
                }
                this.emit(object.item, MOUSE_IN);
                this.currentHoveredItem = object.item;

            } else if (this.currentHoveredItem.id !== object.item.id) {
                let allNewIds = new Set();
                if (object.item.meta && Array.isArray(object.item.meta.ancestorIds)) {
                    allNewIds = new Set(object.item.meta.ancestorIds);
                }
                allNewIds.add(object.item.id);

                this.hoveredItemIds.forEach(itemId => {
                    if (!allNewIds.has(itemId)) {
                        this.hoveredItemIds.delete(itemId);
                        this.sendItemEventById(itemId, MOUSE_OUT);
                    }
                });

                allNewIds.forEach(itemId => {
                    if (!this.hoveredItemIds.has(itemId)) {
                        this.hoveredItemIds.add(itemId);
                        this.sendItemEventById(itemId, MOUSE_IN);
                    }
                });
                this.currentHoveredItem = object.item;
            }
        } else {
            this.hoveredItemIds.forEach(itemId => {
                this.sendItemEventById(itemId, MOUSE_OUT);
            });
            this.hoveredItemIds.clear();
            this.currentHoveredItem = null;
        }
    }

    emit(element, eventName) {
        if (element && element.id) {
            this.userEventBus.emitItemEvent(element.id, eventName);
        }
    }

    dragScreen(x, y) {
        this.registerInertiaPositions(x, y);

        if (!this.schemeContainer.scheme.settings.screen.draggable) {
            return;
        }
        this.dragScreenTo(
            Math.floor(this.originalOffset.x + x - this.initialClickPoint.x),
            Math.floor(this.originalOffset.y + y - this.initialClickPoint.y)
        );
    }

    registerInertiaPositions(x, y) {
        if (this.inertiaDrag.positionTracker.positions.length < MAX_TRACK_MOUSE_POSITIONS) {
            this.inertiaDrag.positionTracker.positions.push({x, y, time: performance.now()});
        } else {
            this.inertiaDrag.positionTracker.positions[this.inertiaDrag.positionTracker.idx] = {x, y, time: performance.now()};
        }
        this.inertiaDrag.positionTracker.idx = (this.inertiaDrag.positionTracker.idx + 1) % MAX_TRACK_MOUSE_POSITIONS;
    }

    initScreenInertia() {
        const positions = this.inertiaDrag.positionTracker.positions;
        if (positions.length > 2) {
            positions.sort((a, b) => {
                return b.time - a.time
            });

            let nx = 0, ny = 0;
            let speed = 0;

            const movingWeights = [1.0, 0.5, 0.3, 0.1, 0.05];
            let totalWeights = 0;

            for (let i = 0; i < positions.length - 1; i++) {
                const p2 = positions[i+1];
                const p1 = positions[i];
                const d = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
                if (d > 0.01) {
                    nx += (p1.x - p2.x) / d;
                    ny += (p1.y - p2.y) / d;
                }

                const timeDelta = p1.time - p2.time;
                if (timeDelta > 0.01) {
                    const currentSpeed = d / timeDelta;
                    if (i === 0 && currentSpeed < 0.5) {
                        this.inertiaDrag.speed = 0;
                        return;
                    }

                    speed += currentSpeed * movingWeights[i];
                    totalWeights += movingWeights[i];
                }
            }

            nx = nx / (positions.length - 1);
            ny = ny / (positions.length - 1);
            this.inertiaDrag.direction.x = nx;
            this.inertiaDrag.direction.y = ny;
            if (totalWeights > 0) {
                this.inertiaDrag.speed = Math.min(10, speed / totalWeights);
            } else {
                this.inertiaDrag.speed = 0;
            }
        } else {
            this.inertiaDrag.speed = 0;
        }
    }

    loop(deltaTime) {
        if (!this.startedDragging && this.inertiaDrag.speed > 0) {
            const sx = this.schemeContainer.screenTransform.x + this.inertiaDrag.speed * deltaTime * this.inertiaDrag.direction.x / 2;
            const sy = this.schemeContainer.screenTransform.y + this.inertiaDrag.speed * deltaTime * this.inertiaDrag.direction.y / 2;
            this.dragScreenTo(sx, sy);
            this.inertiaDrag.speed = Math.max(0, this.inertiaDrag.speed - deltaTime / 200);
        }
    }
}

export default StateInteract;
