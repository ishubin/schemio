/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Wait',

    description: 'Waits for specified amount of time until the next function',

    args: {
        time: {type: 'number', value: 0.1, name: 'Time (s)', description: 'Number of seconds for which it should wait until executing next action in the list'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        setTimeout(resultCallback, args.time * 1000.0);
    }
};
