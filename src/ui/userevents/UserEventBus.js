import _ from 'lodash';

export default class UserEventBus {
    constructor() {
        this.itemEventSubscribers = {};
    }

    subscribeItemEvent(itemId, eventName, args, callback) {
        if (!this.itemEventSubscribers.hasOwnProperty(itemId)) {
            this.itemEventSubscribers[itemId] = {};
        }

        if (!this.itemEventSubscribers[itemId].hasOwnProperty(eventName)) {
            this.itemEventSubscribers[itemId][eventName] = [];
        }

        this.itemEventSubscribers[itemId][eventName].push({args, callback});
    }


    emitItemEvent(itemId, eventName, args) {
        if (args === undefined) {
            args = [];
        }

        const itemSubs = this.itemEventSubscribers[itemId];
        if (itemSubs && itemSubs[eventName]) {
            _.forEach(itemSubs[eventName], subscriber => {
                //TODO check arguments
                subscriber.callback.apply(null, args);
            })
        }
    }

    clear() {
        this.itemEventSubscribers = {}
    }
};