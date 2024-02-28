/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    name: 'Copy links',

    description: 'Copies all links from the source item to destination items. It does not replace exsiting links, but adds new links from the source item',
    args: {
        destination : {name: 'Destination',  type: 'element',value: null, description: 'Other item or an item group to which you want to copy links from the source'},
    },

    argsToShortString(args, schemeContainer) {
        if (args.destination) {
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
            if (!Array.isArray(item.links) || item.links.length === 0) {
                resultCallback();
                return;
            }
            dstItems.forEach(dstItem => {
                if (!Array.isArray(dstItem.links)) {
                    dstItem.links = [];
                }
                dstItem.links = dstItem.links.concat(item.links);
            });
        } catch (err) {
            console.error(err);
        }
        resultCallback();
    }
};


