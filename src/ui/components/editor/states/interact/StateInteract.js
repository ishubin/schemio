import State from '../State.js';
import UserEventBus from '../../../../userevents/UserEventBus.js';
import Events from '../../../../userevents/Events.js';
import {hasItemDescription, ItemInteractionMode} from '../../../../scheme/Item.js';
import { getBoundingBoxOfItems } from '../../../../scheme/ItemMath.js';
import { IdleInteractState } from './IdleInteractState.js';

const CLICKED = Events.standardEvents.clicked.id;

const screenBoundsUpdateTimeoutMillis = 500;

/*
This state works as dragging the screen, zooming, selecting elements
*/
export class StateInteract extends State {
    /**
     *
     * @param {UserEventBus} userEventBus
     */
    constructor(editorId, store, userEventBus, listener) {
        super(editorId, store,  'interact', listener);
        this.subState = null;
        this.userEventBus = userEventBus;
        this.screenBoundsUpdateTimer = null;
        this.screenBounds = null;
        this.screenBoundsPadding = {x: 10, y: 10};
    }

    cancel() {
        super.cancel();
        if (this.screenBoundsUpdateTimer) {
            clearTimeout(this.screenBoundsUpdateTimer);
            this.screenBoundsUpdateTimer = null;
        }
    }

    reset() {
        if (this.screenBoundsUpdateTimer) {
            clearTimeout(this.screenBoundsUpdateTimer);
            this.screenBoundsUpdateTimer = null;
        }
        this.screenBounds = null;
        this.updateScreenBounds();
        this.migrateSubState(new IdleInteractState(this, this.listener, this.userEventBus));
    }

    scheduleScreenBoundsUpdate() {
        if (this.screenBoundsUpdateTimer) {
            clearTimeout(this.screenBoundsUpdateTimer);
        }
        this.screenBoundsUpdateTimer = setTimeout(() => this.updateScreenBounds(), screenBoundsUpdateTimeoutMillis);
    }

    onItemChanged(itemId) {
        this.scheduleScreenBoundsUpdate();
    }

    getScreenBounds() {
        return this.screenBounds;
    }

    getScreenBoundsPadding() {
        return this.screenBoundsPadding;
    }

    updateScreenBounds() {
        let boundsItem = null;
        const filteredItems = [];

        /**
         * @param {Array<Item>} items
         */
        const collectItemsForBounds = (items) => {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.shape === 'dummy' && item.shapeProps.screenBounds) {
                    boundsItem = item;
                    return false;
                }

                if (item.visible && item.shape !== 'hud') {
                    filteredItems.push(item);
                    if (!item.clip) {
                        if (Array.isArray(item.childItems)) {
                            collectItemsForBounds(item.childItems);
                        }
                        if (Array.isArray(item._childItems)) {
                            collectItemsForBounds(item._childItems);
                        }
                    }
                }
            }

            return true;
        };

        collectItemsForBounds(this.schemeContainer.scheme.items);

        const boundingBox = getBoundingBoxOfItems(boundsItem ? [boundsItem] : filteredItems);
        this.screenBounds = boundingBox;
        if (boundsItem) {
            this.screenBoundsPadding.x = 0;
            this.screenBoundsPadding.y = 0;
        } else {
            this.screenBoundsPadding.x = this.schemeContainer.screenSettings.width * 0.95;
            this.screenBoundsPadding.y = this.schemeContainer.screenSettings.height * 0.95;
        }
        this.dragScreenTo(this.schemeContainer.screenTransform.x, this.schemeContainer.screenTransform.y);
    }

    handleItemClick(item, mx, my, componentItem) {
        if (componentItem) {
            this.emitInComponent(componentItem, item, CLICKED);
        }
        this.emit(item, CLICKED);
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

    emit(element, eventName, ...args) {
        if (element && element.id) {
            this.userEventBus.emitItemEvent(element.id, eventName, ...args);
        }
    }

    /**
     *
     * @param {Item} componentItem
     * @param {Item} item
     * @param {String} eventName
     * @param  {...any} args
     */
    emitInComponent(componentItem, item, eventName, ...args) {
        if (item && item.id) {
            componentItem.meta.componentUserEventBus.emitItemEvent(item.id, eventName, ...args);
        }
    }
}
