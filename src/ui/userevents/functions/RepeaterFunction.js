/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Repeat',
    args: {
        name   : {name: 'Name', type: 'string', value: '', description: 'Unique name of the repeater, with which it can be identified in the "Stop repeater" function'},
        forever: {name: 'Run forever', type: 'boolean', value: true},
        count  : {name: 'Number of repeatitions', type: 'number', value: 10, min: 0, depends: {forever: false}},
    },

    argsToShortString(args) {
        return args.forever ?  'forever' : `${args.count} times`;
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName) {
        if (!subscribedItem) {
            // this happens in case this repeater function was executed in a component diagram
            // which got destroyed
            resultCallback();
            return;
        }
        const suffix = args.name ? args.name : eventName;
        const startedField = `repeaterStarted_${suffix}`;
        const stoppedField = `repeaterStopped_${suffix}`;
        const counterField = `repeaterCounter_${suffix}`;
        const timeField = `repeaterStartTime_${suffix}`;

        const reset = () => {
            delete subscribedItem.meta[counterField];
            delete subscribedItem.meta[timeField];
            delete subscribedItem.meta[startedField];
            delete subscribedItem.meta[stoppedField];
        }

        if (!subscribedItem.meta.hasOwnProperty(counterField)) {
            if (args.forever) {
                subscribedItem.meta[counterField] = -1;
            } else {
                subscribedItem.meta[counterField] = args.count;
            }
            subscribedItem.meta[timeField] = Date.now();
        }

        if (subscribedItem.meta[counterField] === 0 || subscribedItem.meta[stoppedField]) {
            reset();
        } else {
            const invocationCount = args.forever ? Math.abs(subscribedItem.meta[counterField]) : Math.abs(args.count - subscribedItem.meta[counterField]);
            // protection from useless eternal loop, checking if it is running more than 30 times a second
            const timeEllapsed = Date.now() - subscribedItem.meta[timeField];
            if (timeEllapsed > 0 && invocationCount * 1000 / timeEllapsed > 30) {
                reset();
                resultCallback();
                return;
            }
            subscribedItem.meta[counterField] -= 1;
            subscribedItem.meta[startedField] = true;
            setTimeout(() => {
                userEventBus.emitItemEvent(subscribedItem.id, eventName);
            });
        }

        resultCallback();
    }
}
