/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { worldPointOnItem } from "../../scheme/ItemMath";

function calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer) {
    const worldPoint = worldPointOnItem(0, 0, destinationItem);
    return schemeContainer.relativePointForItem(worldPoint.x, worldPoint.y, item);
}


export default {
    name: 'Replace Item',

    description: 'Hides destination item and moves your item to it. This is usefull in case you want to design mocked interface',

    args: {
        destinationItem : {name: 'Destination Item',  type: 'element',value: null, description: 'Other item which this item should replace'},
    },

    argsToShortString(args, schemeContainer) {
        if (args.destinationItem) {
            if (args.destinationItem.startsWith('tag:')) {
                return args.destinationItem;
            }
            const refItem = schemeContainer.findFirstElementBySelector(args.destinationItem);
            if (refItem) {
                return refItem.name;
            }
        }
        return '...';
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            const destinationItem = schemeContainer.findFirstElementBySelector(args.destinationItem, item);
            let destinationPosition = null;
            if (destinationItem && destinationItem.id !== item.id) {
                destinationPosition = calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer);
                destinationItem.visible = false;
                item.visible = true;
                item.area.x = destinationPosition.x;
                item.area.y = destinationPosition.y;
                schemeContainer.updateChildTransforms(item);
                schemeContainer.readjustItemAndDescendants(item.id);
            }
        }
        resultCallback();
    }
};


