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

    /**
     *
     * @param {Item} item
     * @param {*} args
     * @param {*} schemeContainer
     * @param {*} userEventBus
     * @param {*} resultCallback
     */
    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item.meta && item.meta.parentId) {
            sendEventToParent(item, args.event, userEventBus, schemeContainer);
        }
        if (item.meta.getParentEnvironment) {
            const env = item.meta.getParentEnvironment();
            if (env && env.item && env.userEventBus) {
                env.userEventBus.emitItemEvent(env.item.id, args.event);
            }
        }
        resultCallback();
    }
}

export function sendEventToParent(item, event, userEventBus, schemeContainer, eventArgs) {
    let args = [];
    if (Array.isArray(eventArgs)) {
        args = eventArgs;
    }
    userEventBus.emitItemEvent(item.meta.parentId, event, ...args);
}