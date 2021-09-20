import utils from "../utils";
import forEach from "lodash/forEach";
import { jsonDiff } from '../json-differ';
import SchemeContainer from "./SchemeContainer";
import EventBus from "../components/editor/EventBus";


const validItemFieldPaths = new Set(['name', 'description', 'area', 'effects', 'opacity', 'selfOpacity', 'textSlots', 'visible', 'shapeProps', 'blendMode']);

export const ChangeType = {
    MODIFICATION: 1,
    DELETION: 2,
    ADDITION: 3,
};

function jsonDiffItemWhitelistCallback(item) {
    return (path) => {
        if (!validItemFieldPaths.has(path[0])) {
            return false;
        }
        return true;
    };
}


export function generateDiffSchemeContainerWithChangeLog(originScheme, modifiedScheme) {
    const originSchemeContainer = new SchemeContainer(utils.clone(originScheme), EventBus);
    const modifiedSchemeContainer = new SchemeContainer(utils.clone(modifiedScheme), EventBus);

    const changeLog = [];

    forEach(modifiedSchemeContainer.getItems(), modifiedItem => {
        const originItem = originSchemeContainer.findItemById(modifiedItem.id);
        if (!originItem) {
            // it was added in the modified scheme
            modifiedItem.meta.diff = {
                change: ChangeType.ADDITION
            };
            changeLog.push({
                change: ChangeType.ADDITION,
                itemId: modifiedItem.id,
                name  : modifiedItem.name
            });
            return;
        } else {
            const diff = jsonDiff(originItem, modifiedItem, {
                fieldCheck: jsonDiffItemWhitelistCallback(modifiedItem),
            });
            if (diff.changes && diff.changes.length > 0) {
                modifiedItem.meta.diff = {
                    change: ChangeType.MODIFICATION,
                    modifications: diff.changes
                };

                changeLog.push({
                    change       : ChangeType.MODIFICATION,
                    itemId       : modifiedItem.id,
                    name         : modifiedItem.name,
                    modifications: diff.changes
                });
            }
        }
    });
    
    // detecting deletions
    function traverseItems(items, callback) {
        if (!items) {
            return;
        }
        forEach(items, item => {
            if (callback(item)) {
                traverseItems(item.childItems, callback);
            }
        });
    }

    function addItemToModifiedScheme(item) {
        let itemArray = modifiedSchemeContainer.scheme.items;
        if (item.meta.parentId) {
            const parentItem = modifiedSchemeContainer.findItemById(item.meta.parentId);
            if (!parentItem) {
                // it is not possible to add item back to the scheme as its parent is gone too
                return;
            }
            itemArray = parentItem.childItems;
        }
        itemArray.push(item);
    }

    traverseItems(originSchemeContainer.scheme.items, item => {
        const modifiedItem = modifiedSchemeContainer.findItemById(item.id);
        if (!modifiedItem) {
            item.meta.diff = {
                change: ChangeType.DELETION,
            };

            changeLog.push({
                change: ChangeType.DELETION,
                itemId: item.id,
                name  : item.name
            });

            // marking all its children as "deletion"
            traverseItems(item.childItems, subItem => {
                subItem.meta.diff = {
                    change: ChangeType.DELETION
                };
                changeLog.push({
                    change: ChangeType.DELETION,
                    itemId: subItem.id,
                    name  : subItem.name
                });
            });

            addItemToModifiedScheme(item);

            return false;
        }
        return true;
    });

    return {
        schemeContainer: new SchemeContainer(utils.clone(modifiedSchemeContainer.scheme), EventBus),
        changeLog
    };
}