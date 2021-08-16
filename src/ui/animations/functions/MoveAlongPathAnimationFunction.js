import EventBus from "../../components/editor/EventBus";
import Shape from "../../components/editor/items/shapes/Shape";

export default {
    name: 'Move along path',
    args: {
        item            : {name: 'Item',              type: 'element',value: null},
        path            : {name: 'Path',              type: 'element',value: null},
        rotateItem      : {name: 'Rotate item',       type: 'boolean',value: false, description: 'Adjust rotation of the item to path'},
        rotationOffset  : {name: 'Rotation offset',   type: 'number', value: 0, description: 'Rotation angle offset', depends: {rotateItem: true}},
    },

    // the following fields are going to be used in animation tracks
    inputs: {
        distance: {name: 'Distance (%)', type: 'number', value: 0, endValue: 100},
        rotation: {name: 'Rotation',     type: 'number', value: 0, endValue: 0}
    },

    // this function is supposed to prepare object that would be passed into execute function
    // if null is returned then the function preparation was not successfull
    create(args, schemeContainer) {
        const item = schemeContainer.findFirstElementBySelector(args.item);
        if (!item) {
            return null;
        }

        const pathItem = schemeContainer.findFirstElementBySelector(args.path);
        if (!pathItem) {
            return null;
        }

        const shape = Shape.find(pathItem.shape);
        if (!shape) {
            return null;
        }

        const path = schemeContainer.getSvgOutlineOfItem(pathItem);
        if (!path) {
            return null;
        }
        return {
            path,
            item,
            pathItem,
            schemeContainer,
            totalLength: path.getTotalLength()
        };
    },

    getFullName(args, schemeContainer) {
        const nameOfItem = (selector) => {
            const item = schemeContainer.findFirstElementBySelector(selector);
            if (item) {
                return item.name;
            }
            return 'unknown';
        }

        const itemName = nameOfItem(args.item);
        const pathItemName = nameOfItem(args.path);
        return `Move "${itemName}" along the path of "${pathItemName}"`;
    },

    // the first argument is the object returned by the "create" function
    // the second argument is an object containing the inputs
    execute({path, item, pathItem, schemeContainer, totalLength}, {distance, rotation}) {
        const point = path.getPointAtLength(distance * totalLength / 100);
        let worldPoint = schemeContainer.worldPointOnItem(point.x, point.y, pathItem);

        // bringing transform back from world to local so that also works correctly for sub-items
        let localPoint = worldPoint;
        if (item.meta && item.meta.parentId) {
            const parentItem = schemeContainer.findItemById(item.meta.parentId);
            if (parentItem) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, parentItem);
            }
        }
        item.area.x = localPoint.x - item.area.w / 2;
        item.area.y = localPoint.y - item.area.h / 2;
        EventBus.emitItemChanged(item.id);
    }
}