
function calculateItemPositionToMatchAnotherItem(item, destinationItem, schemeContainer) {
    const worldPoint = schemeContainer.worldPointOnItem(0, 0, destinationItem);
    return schemeContainer.relativePointForItem(worldPoint.x, worldPoint.y, item);
}


export default {
    name: 'Replace Item',
    args: {
        destinationItem : {name: 'Destination Item',  type: 'element',value: null, description: 'Other item which this item should replace'},
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
                schemeContainer.reindexItemTransforms(item);
            }
        }
        resultCallback();
    }
};


