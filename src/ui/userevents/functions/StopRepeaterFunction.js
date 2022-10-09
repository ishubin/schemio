/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Stop repeater',
    args: {
        name   : {name: 'Name', type: 'string', value: '', description: 'Unique name of the repeater, which should be stopped'},
    },

    argsToShortString(args) {
        return args.name ?  args.name : '...';
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName) {
        const suffix = args.name ? args.name : eventName;
        const startedField = `repeaterStarted_${suffix}`
        const stoppedField = `repeaterStopped_${suffix}`
        if (item.meta[startedField]) {
            item.meta[stoppedField] = true;
        }
        resultCallback();
    }
}

