/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Events from "../Events";
import { compileActions } from '../Compiler.js';

export default {
    name: 'Copy events',

    description: 'Copies all events except init from the source item to destination items',
    args: {
        destination : {name: 'Destination',  type: 'element',value: null, description: 'Other item or an item group to which you want to copy events from the source'},
    },

    argsToShortString(args, schemeContainer) {
        if (args.destination) {
            if (args.destination.startsWith('tag:')) {
                return args.destination;
            }
            const refItem = schemeContainer.findFirstElementBySelector(args.destination);
            if (refItem) {
                return refItem.name;
            }
        }
        return '...';
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            resultCallback();
            return;
        }

        try {
            const dstItems = schemeContainer.findElementsBySelector(args.destination);
            if (item.behavior && Array.isArray(item.behavior.events)) {
                dstItems.forEach(dstItem => {
                    item.behavior.events.forEach(event => {
                        if (event.event !== Events.standardEvents.init.id) {
                            const eventCallback = compileActions(schemeContainer, null, dstItem, event.actions);
                            userEventBus.subscribeItemEvent(dstItem.id, dstItem.name, event.event, eventCallback);
                        }
                    });
                });
            }
        } catch (err) {
            console.error(err);
        }
        resultCallback();
    }
};

