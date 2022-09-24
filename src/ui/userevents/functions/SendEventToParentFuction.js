/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Send to parent',
    description: `Sends custom events to parent of this item.
It can be used for cross-component communication`,
    args: {
        event: {name: 'Event', type: 'string', value: 'Unknown event...'},
    },

    argsToShortString(args) {
        return args.event;
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item.meta && item.meta.parentId) {
            userEventBus.emitItemEvent(item.meta.parentId, args.event);

            const parent = schemeContainer.findItemById(item.meta.parentId);
            if (!parent) {
                return;
            }
            // retransmitting event to component holder
            if (parent.meta.isComponentContainer && parent.meta.parentId) {
                userEventBus.emitItemEvent(parent.meta.parentId, args.event);
            }
        }
        resultCallback();
    }
}
