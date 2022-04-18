import { jsonDiff } from "../json-differ";
import forEach from "lodash/forEach";
import map from "lodash/map";
import Shape from "../components/editor/items/shapes/Shape";
import utils from "../utils";
import { textSlotProperties } from "./Item";

// Test Case: Adding, deleting and changing order (delete a2, move a3 to pos 0, add a10 at pos 4, move a8 to pos 5)
//
// old: a1, a2, a3, a4, a5, a6, a7, a8, a9
// new: a3, a1, a4, a5, a10, a6, a8, a7, a9
//
// expected result:
//   - delete a2
//   - add a10 at pos 4
//   - move a3 to pos 0
//   - move a8 to pos 6
//
// STEP 1: first find all deleted items
// - a2 old_pos = 1
//
// STEP 2: find all added items
// - a10 new_pos = 4
//
// STEP 3: Create a list of old items without deleted ones
// a1, a3, a4, a5, a6, a6, a8, a9
//
//
// STEP 4: Add new items to the list above
// a1, a3, a4, a5, a10, a6, a7, a8, a9
//
// STEP 5: now index new list and compare it with the new list.
// old: a1, a3, a4, a5, a10, a6, a7, a8, a9
// new: a3, a1, a4, a5, a10, a6, a8, a7, a9
// - a1:  old_prev = null, new_prev = a3,   old_pos = 0, new_pos = 1
// - a3:  old_prev = a1,   new_prev = null, old_pos = 1, new_pos = 0
// - a4:  old_prev = a3,   new_prev = a3,   old_pos = 2, new_pos = 2
// - a5:  old_prev = a4,   new_prev = a4,   old_pos = 3, new_pos = 3
// - a10: old_prev = a5,   new_prev = a5,   old_pos = 4, new_pos = 4
// - a6:  old_prev = a10,  new_prev = a10,  old_pos = 5, new_pos = 5
// - a7:  old_prev = a6,   new_prev = a8,   old_pos = 6, new_pos = 7
// - a8:  old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 6
// - a9:  old_prev = a8,   new_prev = a7,   old_pos = 8, new_pos = 8
//
// STEP 6: filtering by old_prev != new_prev and old_pos != new_pos
// - a1:  old_prev = null, new_prev = a3,   old_pos = 0, new_pos = 1
// - a3:  old_prev = a1,   new_prev = null, old_pos = 1, new_pos = 0
// - a7:  old_prev = a6,   new_prev = a8,   old_pos = 6, new_pos = 7
// - a8:  old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 6
//
// STEP 7: sorting by new_pos ascending
// - a3:  old_prev = a1,   new_prev = null, old_pos = 1, new_pos = 0
// - a1:  old_prev = null, new_prev = a3,   old_pos = 0, new_pos = 1
// - a8:  old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 6
// - a7:  old_prev = a6,   new_prev = a8,   old_pos = 6, new_pos = 7
//
// STEP 8: iterate through that list and remove items that were moved by the previously inserted element using condition 
// when old_pos[i] == new_pos[i-1] and new_pos[i] = old_pos[i] + 1
// - a3:  old_prev = a1,   new_prev = null, old_pos = 1, new_pos = 0
// - a8:  old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 6
//
// Result:
// - Delete a2
// - Add a10 at pos 4
// - Move a3 to pos 0
// - Move a8 to pos 6


// Test Case 2: Moving item from further range (a7 move in front of a3)
//
// old: a1, a2, a3, a4, a5, a6, a7, a8, a9
// new: a1, a2, a7, a3, a4, a5, a6, a8, a9
//
// STEPS 1-4 we can skip since nothing was deleted or added
//
// STEP 5:
// a1: old_prev = null, new_prev = null, old_pos = 0, new_pos = 0
// a2: old_prev = a1,   new_prev = a1,   old_pos = 1, new_pos = 1
// a3: old_prev = a2,   new_prev = a7,   old_pos = 2, new_pos = 3
// a4: old_prev = a3,   new_prev = a3,   old_pos = 3, new_pos = 4
// a5: old_prev = a4,   new_prev = a4,   old_pos = 4, new_pos = 5
// a6: old_prev = a5,   new_prev = a5,   old_pos = 5, new_pos = 6
// a7: old_prev = a6,   new_prev = a2,   old_pos = 6, new_pos = 2
// a8: old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 7
// a9: old_prev = a8,   new_prev = a8,   old_pos = 8, new_pos = 8
//
// STEP 6: filtering by (old_prev != new_prev and old_pos != new_pos)
// a3: old_prev = a2,   new_prev = a7,   old_pos = 2, new_pos = 3
// a7: old_prev = a6,   new_prev = a2,   old_pos = 6, new_pos = 2
//
// STEP 7: sorting by new_pos ascending
// a7: old_prev = a6,   new_prev = a2,   old_pos = 6, new_pos = 2
// a3: old_prev = a2,   new_prev = a7,   old_pos = 2, new_pos = 3
//
// STEP 8: iterate through that list and remove items that were moved by the previously inserted element using condition 
//         when old_pos[i] == new_pos[i-1] and new_pos[i] = old_pos[i] + 1
// - a7: old_prev = a6,   new_prev = a2,   old_pos = 6, new_pos = 2
//
// Result: only single record of moving item a7 to position 2


const excludeFieldInScheme = new Set(['id', 'items', 'publicLink', 'modifiedTime']);

function schemeFieldCheck(path) {
    if (excludeFieldInScheme.has(path[0])) {
        return false;
    }
    return true;
}


function traverseItems(items, callback) {
    _traverseItems(items, null, callback);
}
function _traverseItems(items, parentItem, callback) {
    let previousItem = null;
    forEach(items, (item, i) => {
        callback(item, parentItem, previousItem, i);
        if (item.childItems) {
            _traverseItems(item.childItems, item, callback);
        }
        previousItem = item;
    });
}


const defaultItemFields = [
    'area',
    'name',
    'description',
    'opacity',
    'selfOpacity',
    'visible',
    'blendMode',
    'cursor',
    'shape',
    'clip',
    'effects',
    'interactionMode',
];

function valueEquals(value1, value2) {
    return JSON.stringify(value1) === JSON.stringify(value2);
}

function generateSetPatchOperations(originArr, modArr) {
    //TODO implement tags and groups deduplication
    // There is a potential problem that could be caused by duplicated value
    // but, since for tags and groups it does not make sense to have duplicated values
    // we can solve in a different way: just restrict adding duplicated tags and groups
    // in a first place when editing items in the app
    const ops = [];
    const originSet = new Set();
    const modSet = new Set();
    forEach(originArr, value => originSet.add(value));
    forEach(modArr, value => {
        if (!originSet.has(value)) {
            ops.push({
                op: 'add',
                value
            });
        }
        modSet.add(value);
    });

    forEach(originArr, value => {
        if (!modSet.has(value)) {
            ops.push({
                op: 'delete',
                value
            });
        }
    })
    return ops;
}


function behaviorActionFieldChecker(originAction, modAction) {
    const changes = [];

    const checkField = (fieldPath) => {
        const modValue = utils.getObjectProperty(modAction, fieldPath);
        if (!valueEquals(utils.getObjectProperty(originAction, fieldPath), modValue)) {
            changes.push({
                path: fieldPath,
                op: 'replace',
                value: utils.clone(modValue)
            });
        }
    };

    checkField(['element']);
    checkField(['method']);

    forEach(modAction.args, (argValue, argName) => {
        checkField(['args', argName]);
    })
    return changes;
}

function generateBehaviorActionsChanges(originActions, modActions) {
    const originIndex = indexIdArray(originActions);
    const modIndex = indexIdArray(modActions);

    return generateIdArrayPatch(originActions, originIndex, modIndex, {
        isTree: false,
        fieldChecker: behaviorActionFieldChecker
    });
}

function behaviorEventFieldChecker(originEvent, modEvent) {
    const changes = [];

    if (originEvent.event !== modEvent.event) {
        changes.push({
            path: ['event'],
            op: 'replace',
            value: modEvent.event
        })
    }

    const actionOps = generateBehaviorActionsChanges(originEvent.actions, modEvent.actions);
    if (actionOps.length > 0) {
        changes.push({
            path: ['actions'],
            op: 'idArrayPatch',
            changes: actionOps
        });
    }
    return changes;
}

function generateBehaviorEventsChanges(originEvents, modEvents) {
    const originIndex = indexIdArray(originEvents);
    const modIndex = indexIdArray(modEvents);

    return generateIdArrayPatch(originEvents, originIndex, modIndex, {
        isTree: false,
        fieldChecker: behaviorEventFieldChecker
    });
}

const linkFields = ['title', 'url', 'type'];
function generateItemLinksChanges(originLinks, modLinks) {
    const originIndex = indexIdArray(originLinks);
    const modIndex = indexIdArray(modLinks);

    if (!originLinks) {
        originLinks = [];
    }
    return generateIdArrayPatch(originLinks, originIndex, modIndex, {
        isTree: false,
        fieldChecker(originLink, modLink) {
            const changes = [];
            forEach(linkFields, field => {
                if (originLink[field] !== modLink[field]) {
                    changes.push({
                        path: [field],
                        op: 'replace',
                        value: utils.clone(modLink[field])
                    });
                }
            })
            return changes;
        }
    });
}

function checkForItemFieldChanges(originItem, modItem) {
    const changes = [];

    const checkField = (fieldPath) => {
        const modValue = utils.getObjectProperty(modItem, fieldPath);
        if (!valueEquals(utils.getObjectProperty(originItem, fieldPath), modValue)) {
            changes.push({
                path: fieldPath,
                op: 'replace',
                value: utils.clone(modValue)
            });
        }
    };

    forEach(defaultItemFields, fieldName => {
        checkField([fieldName]);
    });

    const shape = Shape.find(modItem.shape);
    if (shape) {
        forEach(Shape.getShapeArgs(shape), (arg, argName) => {
            checkField(['shapeProps', argName]);
        });


        forEach(shape.getTextSlots(modItem), textSlot => {
            checkField(['textSlots', textSlot.name, 'text']);
            forEach(textSlotProperties, prop => {
                checkField(['textSlots', textSlot.name, prop.field]);
            });
        });
    }

    const setPatchCheck = (field) => {
        const ops = generateSetPatchOperations(originItem[field], modItem[field]);
        if (ops.length > 0) {
            changes.push({
                path: [field],
                op: 'setPatch',
                changes: ops
            });
        }
    };

    setPatchCheck('tags');
    setPatchCheck('groups');

    let originItemBehaviorEvents = [];
    let modItemBehaviorEvents = [];

    if (originItem.behavior) {
        originItemBehaviorEvents = originItem.behavior.events;
    }
    if (modItem.behavior){
        modItemBehaviorEvents = modItem.behavior.events;
    }
    const behaviorEventsChanges = generateBehaviorEventsChanges(originItemBehaviorEvents, modItemBehaviorEvents);
    
    if (behaviorEventsChanges.length > 0) {
        changes.push({
            path: ['behavior', 'events'],
            op: 'idArrayPatch',
            changes: behaviorEventsChanges
        });
    }

    const linksChanges = generateItemLinksChanges(originItem.links, modItem.links);
    if (linksChanges.length > 0) {
        changes.push({
            path: ['links'],
            op: 'idArrayPatch',
            changes: linksChanges
        });
    }

    return changes;
}

/**
 * 
 * @param {Array} items 
 * @returns {Map}
 */
function indexIdArray(items) {
    const index = new Map();

    traverseItems(items, (item, parentItem, previousItem, sortOrder) => {
        let parentId = null;
        if (parentItem) {
            parentId = parentItem.id;
        }

        index.set(item.id, {
            id: item.id,
            item,
            parentId,
            previousId: previousItem ? previousItem.id : null,
            sortOrder,
        });
    });

    return index;
}

function fromJsonDiff(diffChanges) {
    return map(diffChanges.changes, c => {
        return {
            path: c.path,
            op: 'replace',
            value: c.value
        };
    });
}

/**
 * 
 * @param {Array} originItems 
 * @param {Map} originIndex 
 * @param {Map} modIndex 
 * @param {Object} options - function for generating field changes for items
 */
function generateIdArrayPatch(originItems, originIndex, modIndex, options) {
    const scopedOperations = new Map();
    const registerScopedOperation = (parentId, op) => {
        if (!scopedOperations.has(parentId)) {
            scopedOperations.set(parentId, []);
        }
        scopedOperations.get(parentId).push(op);
    };

    // key - parentId, value = Array of added items in that parent scope
    const addedItemsInScope = new Map();

    // searching for added items
    modIndex.forEach((itemEntry, itemId) => {
        const originEntry = originIndex.get(itemId);
        if (!originEntry || originEntry.parentId !== itemEntry.parentId) {

            if (!addedItemsInScope.has(itemEntry.parentId)) {
                addedItemsInScope.set(itemEntry.parentId, []);
            }

            // faking that this item was added
            // so that we can use it for sortOrder compensation later
            addedItemsInScope.get(itemEntry.parentId).push(itemEntry);

            // but we don't want to report it as added item
            if (!originEntry) {
                registerScopedOperation(itemEntry.parentId, {
                    id: itemId,
                    op: 'add',
                    value: itemEntry.item,
                    parentId: itemEntry.parentId,
                    sortOrder: itemEntry.sortOrder,
                });
            } else {
                registerScopedOperation(itemEntry.parentId, {
                    id: itemId,
                    op: 'mount',
                    parentId: itemEntry.parentId,
                    sortOrder: itemEntry.sortOrder,
                });
                registerScopedOperation(originEntry.parentId, {
                    id: itemId,
                    op: 'demount',
                    parentId: originEntry.parentId,
                    sortOrder: originEntry.sortOrder,
                });
            }
        }
    });

    const scanThroughArrayOfItems = (items, parentId) => {
        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemEntry = originIndex.get(item.id);

            // ignoring all deleted items
            if (modIndex.has(item.id)) {
                const modEntry = modIndex.get(item.id);

                if (modEntry.parentId === itemEntry.parentId) {
                    entries.push(itemEntry);
                    
                    // also checking for field changes for items that were not removed
                    if (options.fieldChecker) {
                        const fieldChanges = options.fieldChecker(item, modEntry.item);
                        if (fieldChanges.length > 0) {
                            registerScopedOperation(item.parentId, {
                                id     : item.id,
                                op     : 'modify',
                                changes: fieldChanges
                            })
                        }
                    }
                }
            } else {
                const originEntry = originIndex.get(item.id);
                registerScopedOperation(originEntry.parentId, {
                    id: item.id,
                    op: 'delete',
                    parentId: originEntry.parentId,
                    sortOrder: originEntry.sortOrder,
                });
            }

            if (item.childItems) {
                scanThroughArrayOfItems(item.childItems, item.id);
            }
        }

        // STEP 4 adding added items
        const addedItemEntries = addedItemsInScope.get(parentId);
        if (addedItemEntries) {
            forEach(addedItemEntries, itemEntry => {
                entries.splice(Math.min(itemEntry.sortOrder, entries.length), 0, itemEntry);
            });
        }
        // STEP 5-6: reindexing entries and filtering by old_prev != new_prev and old_pos != new_pos || old_parentId != new_parentId
        // a1: old_prev = null, new_prev = null, old_pos = 0, new_pos = 0
        // a2: old_prev = a1,   new_prev = a1,   old_pos = 1, new_pos = 1
        // a3: old_prev = a2,   new_prev = a7,   old_pos = 2, new_pos = 3

        const filteredEntries = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // resetting previousId and sortOrder since it was changed by simulating deletion and additions
            if (i > 0) {
                entry.previousId = entries[i-1].item.id;
            } else {
                entry.previousId = null;
            }
            entry.sortOrder = i;

            const modifiedEntry     = modIndex.get(entry.id);
            entry.newSortOrder      = modifiedEntry.sortOrder;
            entry.newParentId       = modifiedEntry.parentId;

            if (entry.previousId !== modifiedEntry.previousId && entry.sortOrder != entry.newSortOrder || entry.parentId !== entry.newParentId) {
                filteredEntries.push(entry);
            }
        }
        
        // STEP 7: sorting by new_pos ascending
        filteredEntries.sort((a, b) => a.newSortOrder - b.newSortOrder);

        // STEP 8: iterate through that list and remove items that were moved by the previously inserted element using condition 
        //         when old_pos[i] == new_pos[i-1] and new_pos[i] = old_pos[i] + 1 and the parentId did not change

        for (let i = filteredEntries.length - 1; i > 0; i--) {
            if (filteredEntries[i].sortOrder === filteredEntries[i-1].newSortOrder && filteredEntries[i].newSortOrder === filteredEntries[i].sortOrder + 1 && filteredEntries[i].parentId === filteredEntries[i].newParentId) {
                filteredEntries.splice(i, 1);
            }
        }
        // done, now we have our pure sort order changes
        // - a3:  old_prev = a1,   new_prev = null, old_pos = 1, new_pos = 0
        // - a8:  old_prev = a7,   new_prev = a6,   old_pos = 7, new_pos = 6
        
        forEach(filteredEntries, entry => {
            registerScopedOperation(entry.parentId, {
                id       : entry.id,
                op       : 'reorder',
                parentId : entry.newParentId,
                sortOrder: entry.newSortOrder
            });
        });
    };

    scanThroughArrayOfItems(originItems, null);
    
    let operations = [];

    scopedOperations.forEach(ops => {
        ops.sort((a, b) => {
            if (a.op === 'modify') {
                return 2;
            }
            return a.sortOrder < b.sortOrder ? -1 : 1;
        });

        ops.forEach(op => {
            if (op.op === 'demount')  {
                delete op.sortOrder;
            } else if (op.op === 'delete') {
                delete op.sortOrder;
                delete op.parentId;
            }

            if (!options.isTree && op.hasOwnProperty('parentId')) {
                delete op.parentId;
            }
        })

        operations = operations.concat(ops);
    })

    return operations;
}

export function generateSchemePatch(originScheme, modifiedScheme) {
    const ops = fromJsonDiff(jsonDiff(originScheme, modifiedScheme, { fieldCheck: schemeFieldCheck }));

    const originIndex = indexIdArray(originScheme.items);
    const modIndex = indexIdArray(modifiedScheme.items);

    const itemOps = generateIdArrayPatch(originScheme.items, originIndex, modIndex, {
        isTree: true,
        fieldChecker: checkForItemFieldChanges
    });

    if (itemOps.length > 0) {
        ops.push({
            path: ['items'],
            op: 'idArrayPatch',
            changes: itemOps
        });
    }

    return {
        version: '1',
        protocol: 'schemio/patch',
        changes: ops
    };
}
