import _ from 'lodash';
import shortid from 'shortid';

/**
 * This UserEventBus is used in order to track and handle events that emitted in interactive mode
 * when user interacts with elements
 */
export default class UserEventBus {
    constructor() {
        this.itemEventSubscribers = {};
        this.revision = shortid.generate();
    }

    subscribeItemEvent(itemId, eventName, callback) {
        if (!this.itemEventSubscribers.hasOwnProperty(itemId)) {
            this.itemEventSubscribers[itemId] = {};
        }

        if (!this.itemEventSubscribers[itemId].hasOwnProperty(eventName)) {
            this.itemEventSubscribers[itemId][eventName] = [];
        }

        this.itemEventSubscribers[itemId][eventName].push({callback});
    }


    /**
     * Emits event that originated for a specific item
     * @param {string} itemId 
     * @param {string} eventName 
     */
    emitItemEvent(itemId, eventName) {
        const itemSubs = this.itemEventSubscribers[itemId];
        if (itemSubs && itemSubs[eventName]) {
            _.forEach(itemSubs[eventName], subscriber => {
                subscriber.callback.apply(null, [this, this.revision]);
            });
        }
    }

    clear() {
        this.itemEventSubscribers = {}
        this.revision = shortid.generate();
    }


    isActionAllowed(revision) {
        return this.revision === revision;
    }
};
