/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { findLoadedComponentEnvironment } from "../../components/editor/Component";

export default {
    name: 'Send event to children',
    description: `Sends specified event to all children of an item.
This can be used for cross-component communication.
Using this function you can send event into dynamic component`,
    args: {
        event: {name: 'Event', type: 'string', value: 'Unknown event...'},
    },

    argsToShortString(args) {
        return args.event;
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        sendEventToChildren(item, args.event, userEventBus, []);
        resultCallback();
    }
}

export function sendEventToChildren(item, event, userEventBus, eventArgs) {
    if (item.shape === 'component' && item.shapeProps.kind === 'external') {
        const env = findLoadedComponentEnvironment(item);
        if (env && env.schemeContainer && env.userEventBus) {
            sendEventToItems(env.schemeContainer.scheme.items, event, env.userEventBus, eventArgs);
        }
    }
    sendEventToItems(item.childItems, event, userEventBus, eventArgs);
    sendEventToItems(item._childItems, event, userEventBus, eventArgs);
}

function sendEventToItems(items, event, userEventBus, eventArgs) {
    if (!Array.isArray(items)) {
        return;
    }
    items.forEach(item => {
        let args = [];
        if (Array.isArray(eventArgs)) {
            args = eventArgs;
        }
        userEventBus.emitItemEvent(item.id, event, ...args);
    });
}