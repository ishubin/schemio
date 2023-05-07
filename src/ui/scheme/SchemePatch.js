import forEach from "lodash/forEach";
import utils from "../utils";

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

export const PatchSchema = [{
    name: 'items',
    op: 'patch-id-array',
    childrenField: 'childItems',

    fields: [{
        names: [ 'area', 'name', 'opacity', 'selfOpacity', 'visible', 'blendMode', 'cursor', 'shape', 'clip', 'interactionMode', ],
        op: 'replace'
    }, {
        name: 'description', op: 'patch-text'
    }, {
        name: 'shapeProps', op: 'modify', fields: [{ op: 'replace' }]
    }, {
        names: ['tags'], op: 'patch-set'
    }, {
        name: 'textSlots',
        op: 'modify',
        fields: [{
            op: 'modify',
            fields: [{
                name: 'text', op: 'patch-text'
            }, {
                // catching the rest of the text slot fields
                op: 'replace'
            }]
        }]
    }, {
        name: 'behavior',
        op: 'modify',
        fields: [{
            name: 'events',
            op: 'patch-id-array',
            childrenField: null,
            fields: [{
                name: 'event', op: 'replace'
            }, {
                name: 'actions', op: 'patch-id-array',
                childrenField: null,
                fields: [{
                    names: ['element', 'method'], op: 'replace'
                }, {
                    name: 'args', op: 'modify', fields: [{op: 'replace'}]
                }]
            }]
        }]
    }, {
        name: 'links', op: 'patch-id-array', childrenField: null, fields: [{ names: ['title', 'url', 'type'], op: 'replace' }]
    }, {
        name: 'effects',
        op: 'patch-id-array',
        childrenField: null,
        fields: [{
            names: ['effect', 'name'], op: 'replace'
        }, {
            name: 'args', op: 'modify', fields: [{op: 'replace'}]
        }]
    }]
}, {
    name: 'name',
    op: 'replace'
}, {
    name: 'description',
    op: 'patch-text'
}, {
    name: 'settings',
    op: 'modify',
    fields: [{
        name: 'screen',
        op: 'modify',
        fields: [{op: 'replace'}]
    }]
}, {
    name: 'style', op: 'modify', fields: [{op: 'replace'}]
}, {
    name: 'tags', op: 'patch-set'
}];


class SchemaIndexNode {
    constructor(name, fieldEntry) {
        this.name = name;
        this.fieldEntry = fieldEntry;
        this.fields = new Map();
        this.defaultField = null;
    }

    indexFieldEntry(name, fieldEntry) {
        const childField = new SchemaIndexNode(name, fieldEntry);
        if (name) {
            this.fields.set(name, childField);
        } else {
            this.defaultField = childField;
        }

        if (fieldEntry.fields) {
            childField.indexFieldEntries(fieldEntry.fields);
        }
    }

    indexFieldEntries(fieldEntries) {
        forEach(fieldEntries, fieldEntry => {
            if (fieldEntry.names) {
                forEach(fieldEntry.names, name => {
                    this.indexFieldEntry(name, fieldEntry);
                })
            } else {
                this.indexFieldEntry(fieldEntry.name, fieldEntry);
            }
        });
    }

    findRelevantFieldEntry(path) {
        if (path.length === 0) {
            return this.fieldEntry;
        }
        if (path.length === 1 && this.name === path[0]) {
            return this.fieldEntry;
        }
        if (this.fields.has(path[0])) {
            return this.fields.get(path[0]).findRelevantFieldEntry(path.slice(1));
        }
        if (this.defaultField) {
            return this.defaultField.findRelevantFieldEntry(path.slice(1));
        }
        return null;
    }
}

function createSchemaIndex(schema) {
    const rootNode = new SchemaIndexNode();
    rootNode.indexFieldEntries(schema);
    return rootNode;
}


function traverseItems(items, childrenField, callback) {
    _traverseItems(items, childrenField, null, callback);
}
function _traverseItems(items, childrenField, parentItem, callback) {
    let previousItem = null;
    forEach(items, (item, i) => {
        callback(item, parentItem, previousItem, i);
        if (childrenField && item[childrenField]) {
            _traverseItems(item[childrenField], childrenField, item, callback);
        }
        previousItem = item;
    });
}


function valueEquals(value1, value2) {
    return utils.equals(value1, value2);
}

function generateSetPatchOperations(originArr, modArr) {
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



/**
 *
 * @param {Array} items
 * @param {String} childrenField name of the field that is used to store nested objects of the same structure
 * @returns {Map}
 */
function indexIdArray(items, childrenField) {
    const index = new Map();

    traverseItems(items, childrenField, (item, parentItem, previousItem, sortOrder) => {
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

/**
 *
 * @param {Array} originItems
 * @param {Array} modifiedItems
 * @param {Object} patchSchemaEntry
 */
function generateIdArrayPatch(originItems, modifiedItems, patchSchemaEntry) {
    if (!originItems) {
        originItems = [];
    }
    if (!modifiedItems) {
        modifiedItems = [];
    }
    const originIndex = indexIdArray(originItems, patchSchemaEntry.childrenField);
    const modIndex = indexIdArray(modifiedItems, patchSchemaEntry.childrenField);

    const scopedOperations = new Map();
    const registerScopedOperation = (parentId, op) => {
        if (!scopedOperations.has(parentId)) {
            scopedOperations.set(parentId, []);
        }
        scopedOperations.get(parentId).push(op);
    };

    const cloneWithoutChildren = (item) => {
        const newItem = {};
        for(let key in item) {
            if (item.hasOwnProperty(key) && key !== patchSchemaEntry.childrenField) {
                newItem[key] = item[key];
            }
        }
        return newItem;
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
                    value: cloneWithoutChildren(itemEntry.item),
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
                    const fieldChanges = _generatePatch(item, modEntry.item, patchSchemaEntry.fields, []);
                    if (fieldChanges.length > 0) {
                        registerScopedOperation(item.parentId, {
                            id     : item.id,
                            op     : 'modify',
                            changes: fieldChanges
                        })
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

            if (patchSchemaEntry.childrenField && item[patchSchemaEntry.childrenField]) {
                scanThroughArrayOfItems(item[patchSchemaEntry.childrenField], item.id);
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

            if (!patchSchemaEntry.childrenField && op.hasOwnProperty('parentId')) {
                delete op.parentId;
            }
        })

        operations = operations.concat(ops);
    })

    return operations;
}

function generatePatch(originObject, modifiedObject, patchSchema) {
    return {
        version: '1',
        protocol: 'schemio/patch',
        changes: _generatePatch(originObject, modifiedObject, patchSchema, [])
    };
}
function _generatePatch(originObject, modifiedObject, patchSchema, fieldPath) {
    let ops = [];
    const fieldNames = new Set();
    forEach(originObject, (value, name) => fieldNames.add(name));
    forEach(modifiedObject, (value, name) => fieldNames.add(name));

    const fieldEntries = new Map();
    let defaultFieldEntry = null;
    forEach(patchSchema, schemaFieldEntry => {
        if (schemaFieldEntry.name) {
            fieldEntries.set(schemaFieldEntry.name, schemaFieldEntry);
        } else if (schemaFieldEntry.names) {
            forEach(schemaFieldEntry.names, name => fieldEntries.set(name, schemaFieldEntry));
        } else if (!defaultFieldEntry) {
            defaultFieldEntry = schemaFieldEntry;
        }
    });

    const generatePatchForField = (fieldEntry, field) => {
        if (fieldEntry.op === 'replace') {
            if (!valueEquals(originObject[field], modifiedObject[field])) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'replace',
                    value: utils.clone(modifiedObject[field])
                })
            }
        } else if (fieldEntry.op === 'patch-text') {
            if (!valueEquals(originObject[field], modifiedObject[field])) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-text',
                    patch: generateStringPatch(originObject[field], modifiedObject[field])
                })
            }
        } else if (fieldEntry.op === 'modify' && originObject[field] && modifiedObject[field]) {
            ops = ops.concat(_generatePatch(originObject[field], modifiedObject[field], fieldEntry.fields, fieldPath.concat([field])));
        } else if (fieldEntry.op === 'patch-set') {
            const changes = generateSetPatchOperations(originObject[field], modifiedObject[field]);
            if (changes && changes.length > 0) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-set',
                    changes: changes
                });
            }
        } else if (fieldEntry.op === 'patch-id-array') {
            const changes = generateIdArrayPatch(originObject[field], modifiedObject[field], fieldEntry);
            if (changes && changes.length > 0) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-id-array',
                    changes: changes
                });
            }
        }
        fieldNames.delete(field);
    };

    fieldEntries.forEach((entry, field) => generatePatchForField(entry, field));

    if (defaultFieldEntry) {
        fieldNames.forEach(field => {
            generatePatchForField(defaultFieldEntry, field);
        });
    }

    return ops;
}


export function generateSchemePatch(originScheme, modifiedScheme) {
    return generatePatch(originScheme, modifiedScheme, PatchSchema);
}

export function applySchemePatch(origin, patch) {
    return applyPatch(origin, patch, createSchemaIndex(PatchSchema));
}

/**
 * Applies a patch to an object
 * @param {Object} origin
 * @param {Patch} patch
 * @param {SchemaIndex} schemaIndex
 */
export function applyPatch(origin, patch, schemaIndex) {
    const modifiedObject = utils.clone(origin);
    forEach(patch.changes, change => {
        applyChange(modifiedObject, change, [], schemaIndex);
    });
    return modifiedObject;
}


function applyChange(obj, change, rootPath, schemaIndex) {
    switch(change.op) {
        case 'replace':
            utils.setObjectProperty(obj, change.path, change.value);
            break;
        case 'patch-text':
            const origin = utils.getObjectProperty(obj, change.path);
            utils.setObjectProperty(obj, change.path, applyStringPatch(origin, change.patch));
            break;
        case 'patch-set':
            applySetPatch(obj, change);
            break;
        case 'patch-id-array':
            applyIdArrayPatch(obj, change, rootPath.concat(change.path), schemaIndex);
            break;
    }
}

function applySetPatch(obj, setPatchChange) {
    let arr = utils.getObjectProperty(obj, setPatchChange.path);
    if (!Array.isArray(arr)) {
        return;
    }

    const set = new Set(arr);
    forEach(setPatchChange.changes, change => {
        if (change.op === 'delete') {
            set.delete(change.value);
        } else if (change.op === 'add') {
            set.add(change.value);
        }
    });

    arr = [];
    set.forEach(value => arr.push(value));
    utils.setObjectProperty(obj, setPatchChange.path, arr);
}


/**
 *
 * @param {*} obj
 * @param {*} arrChange
 * @param {*} rootPath
 * @param {SchemaIndexNode} schemaIndex
 */
function applyIdArrayPatch(obj, arrChange, rootPath, schemaIndex) {
    const arr = utils.getObjectProperty(obj, arrChange.path);

    if (!Array.isArray(arr)) {
        arr = [];
        utils.setObjectProperty(obj, arrChange.path, arr);
    }

    const fieldEntry = schemaIndex.findRelevantFieldEntry(rootPath);

    let childrenField = null;
    if (fieldEntry && fieldEntry.childrenField) {
        childrenField = fieldEntry.childrenField;
    }

    const itemMap = new Map();
    traverseItems(arr, childrenField, item => {
        itemMap.set(item.id, item);
    });

    forEach(arrChange.changes, change => {
        switch(change.op) {
            case 'modify':
                idArrayPatch.modify(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
            case 'reorder':
                idArrayPatch.reorder(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
            case 'delete':
                idArrayPatch.delete(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
            case 'add':
                idArrayPatch.add(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
            case 'mount':
                idArrayPatch.mount(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
            case 'demount':
                idArrayPatch.demount(itemMap, arr, change, rootPath, schemaIndex, fieldEntry);
                break;
        }
    });
}
const idArrayPatch = {
    modify(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        const item = itemMap.get(change.id);
        if (item) {
            forEach(change.changes, modChange => {
                applyChange(item, modChange, rootPath, schemaIndex);
            });
        }
    },

    reorder(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldEntry);
        if (!Array.isArray(parrentArray)) {
            return;
        }

        const foundIdx = idArrayPatch.findItemIndexInParrent(parrentArray, change.id);
        if (foundIdx >= 0) {
            const item = parrentArray[foundIdx];
            parrentArray.splice(foundIdx, 1);

            parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, item);
        }
    },

    delete(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        idArrayPatch.demount(itemMap, array, change);
        itemMap.delete(change.id);
    },

    demount(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldEntry);
        if (!Array.isArray(parrentArray)) {
            return;
        }

        const foundIdx = idArrayPatch.findItemIndexInParrent(parrentArray, change.id);
        if (foundIdx >= 0) {
            parrentArray.splice(foundIdx, 1);
        }
    },

    mount(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        if (!itemMap.has(change.id)) {
            return;
        }
        const item = itemMap.get(change.id);

        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldEntry);
        if (!Array.isArray(parrentArray)) {
            return;
        }
        parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, item);
    },

    add(itemMap, array, change, rootPath, schemaIndex, fieldEntry) {
        let parrentArray = array;

        if (change.parentId) {
            parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldEntry);
        }
        if (!Array.isArray(parrentArray)) {
            return;
        }
        itemMap.set(change.id, change.value);
        parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, change.value);
    },

    findParentItem(itemMap, array, parentId, fieldEntry) {
        if (parentId) {
            if (fieldEntry && fieldEntry.childrenField && itemMap.has(parentId)) {
                const parent = itemMap.get(parentId);
                if (!parent[fieldEntry.childrenField]) {
                    parent[fieldEntry.childrenField] = [];
                }
                return parent[fieldEntry.childrenField];
            }
            return null;
        }
        return array;
    },

    findItemIndexInParrent(parrentArray, id) {
        let foundIdx = -1;
        for (let i = 0; i < parrentArray.length && foundIdx < 0; i++) {
            if (parrentArray[i].id === id) {
                foundIdx = i;
            }
        }
        return foundIdx;
    }
}

export function generatePatchStatistic(patch) {
    const stats = {
        document: {
            fieldChanges: 0,
            fields: []
        },
        items: {
            added: {
                count: 0,
                items: [],
            },
            deleted: {
                count: 0,
                items: [],
            },
            modified: {
                count: 0,
                items: []
            }
        }
    };

    const modifiedItems = new Map();

    const registeredItemFields = new Set();

    const registerItemChange = (id, op, change, rootPath) => {
        if (!rootPath) {
            rootPath = [];
        }

        if (op === 'modified') {
            if (change.changes && change.changes.length > 0) {
                forEach(change.changes, subChange => {
                    let path = rootPath;
                    if (subChange.path) {
                        path = path.concat(subChange.path);
                    } else if (subChange.id) {
                        path = path.concat(subChange.id);
                    }
                    registerItemChange(id, op, subChange, path);
                })
            } else {
                const fieldPath = rootPath.join('.');
                const fieldLookupKey = `${id}.${fieldPath}`;
                if (!registeredItemFields.has(fieldLookupKey)) {
                    registeredItemFields.add(fieldLookupKey);
                    if (!modifiedItems.has(id)) {
                        const itemEntry = {
                            id,
                            fields: []
                        };
                        modifiedItems.set(id, itemEntry);
                        stats.items.modified.items.push(itemEntry);
                    }
                    if (fieldPath) {
                        // in case it is a sort order change - it does not make sense to register it as a field
                        modifiedItems.get(id).fields.push(fieldPath);
                    }
                    stats.items[op].count += 1;
                }
            }

            modifiedItems.get(id);
        } else {
            stats.items[op].count += 1;
            stats.items[op].items.push(id);
        }
    };

    forEach(patch.changes, change => {
        if (change.path[0] === 'items') {
            forEach(change.changes, itemChange => {
                switch (itemChange.op) {
                    case 'add':
                        registerItemChange(itemChange.id, 'added');
                        break;
                    case 'delete':
                        registerItemChange(itemChange.id, 'deleted');
                        break;
                    default:
                        registerItemChange(itemChange.id, 'modified', itemChange)
                        break;
                }
            });
        } else {
            stats.document.fieldChanges += 1;
            stats.document.fields.push(change.path.join('.'));
        }
    });

    return stats;
}


export function generatePatchIndex(patchStats) {
    const index = {
        addedItems: new Set(),
        deletedItems: new Set(),
        modifiedItems: new Set(),
        modifiedFields: new Set()
    };

    forEach(patchStats.items.added.items, itemId => index.addedItems.add(itemId));
    forEach(patchStats.items.deleted.items, itemId => index.deletedItems.add(itemId));
    forEach(patchStats.document.fields, field => index.modifiedFields.add(field));
    forEach(patchStats.items.modified.items, itemEntry => {
        index.modifiedItems.add(itemEntry.id);
        forEach(itemEntry.fields, field => {
            index.modifiedFields.add(`items.${itemEntry.id}.${field}`);
        });
    });

    return index;
}


/**
 *
 * @param {String} s1
 * @param {String} s2
 * @param {Number} n
 * @param {Number} m
 * @param {Map} cache
 * @returns {String}
 */
function _lcs(s1, s2, i, j, cache) {
    const cacheKey = `${i}-${j}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    if (i <0 || j < 0) {
        return '';
    } else if (s1[i] === s2[j]) {
        const result = _lcs(s1, s2, i-1, j-1, cache) + s1[i];
        cache.set(cacheKey, result);
        return result;
    } else {
        const a = _lcs(s1, s2, i-1, j, cache);
        cache.set(`${i-1}-${j}`, a);
        const b = _lcs(s1, s2, i, j-1, cache);
        cache.set(`${i}-${j-1}`, b);
        if (a.length > b.length) {
            return a;
        }
        return b;
    }
}

/**
 * Finds longest common subsequence in two strings
 * @param {String} s1
 * @param {String} s2
 * @returns {String} Longest common subsequence in two strings
 */
export function stringLCS(s1, s2) {
    return _lcs(s1, s2, s1.length-1, s2.length-1, new Map());
}

export function generateStringPatch(origin, modified) {
    const lcs = stringLCS(origin, modified);

    const deletions = [];

    let currentOp = null;
    let i = 0, j = 0;
    while(i < origin.length && j < lcs.length) {
        if (origin[i] !== lcs[j]) {
            if (!currentOp) {
                currentOp = [i, 1];
                deletions.push(currentOp);
            } else {
                currentOp[1] += 1;
            }
        } else {
            currentOp = null;
            j++;
        }

        i++;
    }
    if (i < origin.length) {
        deletions.push([i, origin.length - i]);
    }

    const additions = [];
    i = 0;
    j = 0;
    while(i < modified.length && j <  lcs.length) {
        if (modified[i] !== lcs[j]) {
            if (!currentOp) {
                currentOp = [i, modified[i]];
                additions.push(currentOp);
            } else {
                currentOp[1] += modified[i];
            }
        } else {
            currentOp = null;
            j++;
        }
        i++;
    }
    if (i < modified.length) {
        additions.push([i, modified.substr(i)]);
    }

    return {
        delete: deletions,
        add: additions
    };
}

/**
 *
 * @param {String} origin
 * @param {StringPatch} patch
 * @returns {String} modified string that is a result of applying specified string patch to the origin string
 */
export function applyStringPatch(origin, patch) {
    let result = origin;

    if (patch.delete.length > 0) {
        const buffer = [];
        let i = 0;
        let j = 0;
        while(i < origin.length && j < patch.delete.length) {
            if (patch.delete[j][0] === i) {
                i += patch.delete[j][1]-1;
                j++;
                if (j >= patch.delete.length) {
                    break;
                }
            } else {
                buffer.push(origin[i]);
            }
            i++;
        }
        result = buffer.join('');
        if (i < origin.length) {
            result += origin.substring(i+1);
        }
    }

    if (Array.isArray(patch.add)) {
        patch.add.forEach(addition => {
            const i = addition[0];
            const value = addition[1];
            result = result.substring(0, i) + value + result.substring(i);
        });
    }

    return result;
}