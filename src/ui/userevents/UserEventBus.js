/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';
import shortid from 'shortid';
import { Logger } from '../logger';

const log = new Logger('UserEventBus');

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
        log.infoEvent(eventName, [itemId]);

        const itemSubs = this.itemEventSubscribers[itemId];
        if (itemSubs && itemSubs[eventName]) {
            forEach(itemSubs[eventName], subscriber => {
                subscriber.callback.apply(null, [this, this.revision, itemId, eventName]);
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
