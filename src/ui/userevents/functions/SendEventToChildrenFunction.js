/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Send event to children',
    description: `Sends specified event to all children of an item.
This can be used for cross-component communication.
Using this function you can send event into dynamic component`,
    args: {
        event: {name: 'Event', type: 'string', value: 'Unknown event...'},
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item.shape === 'component') {
            if (Array.isArray(item._childItems)) {
                item._childItems.forEach(childItem => {
                    if (childItem.meta.isComponentContainer) {
                        sendEventToItems(childItem.childItems, args.event, userEventBus);
                        sendEventToItems(childItem._childItems, args.event, userEventBus);
                    }
                });
            }
        }
        sendEventToItems(item.childItems, args.event, userEventBus);
        sendEventToItems(item._childItems, args.event, userEventBus);
        resultCallback();
    }
}

function sendEventToItems(items, event, userEventBus) {
    if (!Array.isArray(items)) {
        return;
    }
    items.forEach(item => {
        userEventBus.emitItemEvent(item.id, event);
    });
}