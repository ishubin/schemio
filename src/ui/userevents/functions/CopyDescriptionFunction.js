/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Copy description',

    description: 'Copies description from the source item to destination items. It does not replace exsiting description, but adds to the existing one',
    args: {
        destination : {name: 'Destination',  type: 'element',value: null, description: 'Other item or an item group to which you want to copy description from the source'},
    },

    argsToShortString(args) {
        if (args.destination) {
            return `${args.destination}`;
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
            if (!item.description) {
                resultCallback();
                return;
            }
            dstItems.forEach(dstItem => {
                dstItem.description += item.description;
            });
        } catch (err) {
            console.error(err);
        }
        resultCallback();
    }
};



