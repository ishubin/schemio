import forEach from "lodash/forEach";
import utils from "../utils";
import { fieldTypeMatchesSchema, getSchemioDocSchema } from "./SchemioDocSchema";

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


class SchemaIndexNode {
    constructor(name, fieldSchema) {
        this.name = name;
        this.fieldSchema = fieldSchema;
        this.fields = new Map();
        this.defaultField = null;
    }

    indexFieldEntry(name, fieldSchema) {
        const childField = new SchemaIndexNode(name, fieldSchema);
        if (name === '*') {
            this.defaultField = childField;
        } else {
            this.fields.set(name, childField);
        }

        if (fieldSchema.fields) {
            childField.indexFieldEntries(fieldSchema.fields);
        }
    }

    indexFieldEntries(fieldSchemas) {
        forEach(fieldSchemas, (fieldSchema, name) => {
            this.indexFieldEntry(name, fieldSchema);
        });
    }

    findRelevantFieldEntry(path) {
        if (path.length === 0) {
            return this.fieldSchema;
        }
        if (path.length === 1 && this.name === path[0]) {
            return this.fieldSchema;
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
    rootNode.indexFieldEntries(schema.fields);
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

                }

                // also checking for field changes for items that were not removed
                const itemSchema = {type: 'object', patching: ['modify'], fields: patchSchemaEntry.fields};
                const fieldChanges = generatePatchForObject(item, modEntry.item, itemSchema, []);
                if (fieldChanges.length > 0) {
                    registerScopedOperation(item.parentId, {
                        id     : item.id,
                        op     : 'modify',
                        changes: fieldChanges
                    })
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

/**
 * @typedef {Object} FieldSchema
 * @property {String} type
 * @property {String} of
 * @property {String} on
 * @property {String} childrenField
 * @property {Array<String>} patching
 * @property {String} contidionalParentField
 * @property {Array<FieldSchema>} conditions
 * @property {Object} fields
 */

/**
 *
 * @param {*} originObject
 * @param {*} modifiedObject
 * @param {FieldSchema} schema
 * @param {SchemaIndexNode} index
 * @returns
 */
function generatePatch(originObject, modifiedObject, schema) {
    return {
        version: '1',
        protocol: 'schemio/patch',
        changes: generatePatchForObject(originObject, modifiedObject, schema, [])
    };
}

/**
 *
 * @param {Object} originObject
 * @param {Object} modifiedObject
 * @param {FieldSchema} patchSchema
 * @param {Array<String>} fieldPath
 * @returns
 */
function generatePatchForObject(originObject, modifiedObject, patchSchema, fieldPath) {
    let ops = [];
    const fieldNames = new Set();
    forEach(originObject, (value, name) => {
        if (modifiedObject.hasOwnProperty(name)) {
            fieldNames.add(name)
        } else {
            ops.push({op: 'delete', path: fieldPath.concat(name)})
        }
    });
    forEach(modifiedObject, (value, name) => fieldNames.add(name));

    const fieldSchemas = new Map();
    let defaultFieldEntry = null;
    forEach(patchSchema.fields, (schemaFieldEntry, name) => {
        if (name === '*') {
            defaultFieldEntry = schemaFieldEntry;
        } else {
            fieldSchemas.set(name, schemaFieldEntry);
        }
    });

    /**
     *
     * @param {FieldSchema} fieldSchema
     * @param {*} field
     */
    const generatePatchForField = (fieldSchema, field) => {
        if (fieldSchema.type === 'conditional') {
            if (modifiedObject.hasOwnProperty(field)) {
                ops = ops.concat(generateConditionalPatch(originObject, modifiedObject, originObject[field], modifiedObject[field], fieldPath.concat([field]), fieldSchema));
            }
            return;
        }

        if (!Array.isArray(fieldSchema.patching) || fieldSchema.patching.length === 0) {
            return;
        }
        const op = fieldSchema.patching[0];
        if (originObject.hasOwnProperty(field) && !modifiedObject.hasOwnProperty(field)) {
            ops.push({
                path: fieldPath.concat([field]),
                op: 'delete',
            });
        } else if (op === 'replace') {
            if (!valueEquals(originObject[field], modifiedObject[field]) && fieldTypeMatchesSchema(modifiedObject[field], fieldSchema)) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'replace',
                    value: utils.clone(modifiedObject[field])
                })
            }
        } else if (op === 'patch-text') {
            if (!valueEquals(originObject[field], modifiedObject[field])) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-text',
                    patch: generateStringPatch(originObject[field], modifiedObject[field])
                })
            }
        } else if (op === 'modify' && originObject[field] && modifiedObject[field]) {
            ops = ops.concat(generatePatchForObject(originObject[field], modifiedObject[field], fieldSchema, fieldPath.concat([field])));
        } else if (op === 'patch-set') {
            const changes = generateSetPatchOperations(originObject[field], modifiedObject[field]);
            if (changes && changes.length > 0) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-set',
                    changes: changes
                });
            }
        } else if (op === 'patch-id-array') {
            const changes = generateIdArrayPatch(originObject[field], modifiedObject[field], fieldSchema);
            if (changes && changes.length > 0) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-id-array',
                    changes: changes
                });
            }
        } else if (op === 'patch-map') {
            const changes = generateMapPatch(originObject[field], modifiedObject[field], fieldSchema);
            if (changes && changes.length > 0) {
                ops.push({
                    path: fieldPath.concat([field]),
                    op: 'patch-map',
                    changes: changes
                });
            }
        } else if (op === 'patch-array') {
            if (fieldTypeMatchesSchema(modifiedObject[field], fieldSchema)) {
                const arrayPatch = generateArrayPatch(originObject[field], modifiedObject[field]);
                if (arrayPatch && (arrayPatch.delete.length > 0 || arrayPatch.add.length > 0)) {
                    ops.push({
                        path: fieldPath.concat([field]),
                        op: 'patch-array',
                        patch: arrayPatch
                    });
                }
            }
        }
        fieldNames.delete(field);
    };

    fieldSchemas.forEach((entry, field) => generatePatchForField(entry, field));

    if (defaultFieldEntry) {
        fieldNames.forEach(field => {
            generatePatchForField(defaultFieldEntry, field);
        });
    }

    return ops;
}

/**
 *
 * @param {*} originParent
 * @param {*} modifiedParent
 * @param {*} originObject
 * @param {*} modifiedObject
 * @param {Array<String>} fieldPath
 * @param {FieldSchema} fieldSchema
 * @returns
 */
function generateConditionalPatch(originParent, modifiedParent, originObject, modifiedObject, fieldPath, fieldSchema) {
    if (!fieldSchema || !fieldSchema.contidionalParentField || !Array.isArray(fieldSchema.conditions)) {
        return [];
    }

    const propertyValue = utils.getObjectProperty(modifiedParent, fieldSchema.contidionalParentField);
    let selectedSchema = null;


    for (let i = 0; i < fieldSchema.conditions.length; i++) {
        if (!selectedSchema && fieldSchema.conditions[i].on === null) {
            selectedSchema = fieldSchema.conditions[i];
        }
        if (fieldSchema.conditions[i].on === propertyValue) {
            selectedSchema = fieldSchema.conditions[i];
            break;
        }
    }
    if (!selectedSchema) {
        return [];
    }
    return generatePatchForObject(originObject, modifiedObject, selectedSchema, fieldPath);
}


export function generateSchemePatch(originScheme, modifiedScheme) {
    return generatePatch(originScheme, modifiedScheme, getSchemioDocSchema());
}

export function applySchemePatch(origin, patch) {
    return applyPatch(origin, patch, [], createSchemaIndex(getSchemioDocSchema()));
}

/**
 * Applies a patch to an object
 * @param {Object} origin
 * @param {Patch} patch
 * @param {SchemaIndex} schemaIndex
 */
function applyPatch(origin, patch, fieldPath, schemaIndex) {
    const modifiedObject = utils.clone(origin);
    forEach(patch.changes, change => {
        applyChange(modifiedObject, change, fieldPath, schemaIndex);
    });
    return modifiedObject;
}


function applyChange(obj, change, rootPath, schemaIndex) {
    switch(change.op) {
        case 'delete':
            utils.deleteObjectProperty(obj, change.path, change.value);
            break;
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
        case 'patch-map':
            const originMap = utils.getObjectProperty(obj, change.path);
            if (originMap !== null && typeof originMap !== 'undefined') {
                const modifiedMap = applyMapPatch(originMap, change.changes, rootPath.concat(change.path), schemaIndex);
                utils.setObjectProperty(obj, change.path, modifiedMap);
            }
            break;
        case 'patch-array':
            if (change.patch) {
                const originArray = utils.getObjectProperty(obj, change.path);
                if (Array.isArray(originArray)) {
                    const modifiedArray = applyArrayPatch(originArray, change.patch);
                    utils.setObjectProperty(obj, change.path, modifiedArray);
                }
            }
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

export function applyMapPatch(origin, changes, fieldPath, schemaIndex) {
    if (origin === null || origin === undefined) {
        return null;
    }

    if (!Array.isArray(changes)) {
        return origin;
    }

    const modified = utils.clone(origin);

    changes.forEach(change => {
        if (change.op === 'delete' && modified.hasOwnProperty(change.id)) {
            delete modified[change.id];
        }
        if (change.op === 'modify' && modified.hasOwnProperty(change.id)) {
            modified[change.id] = applyPatch(modified[change.id], change, fieldPath, schemaIndex);
        }
        if (change.op === 'add' && !modified.hasOwnProperty(change.id)) {
            modified[change.id] = change.value;
        }
    });

    return modified;
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

    const fieldSchema = schemaIndex.findRelevantFieldEntry(rootPath);

    let childrenField = null;
    if (fieldSchema && fieldSchema.childrenField) {
        childrenField = fieldSchema.childrenField;
    }

    const itemMap = new Map();
    traverseItems(arr, childrenField, item => {
        itemMap.set(item.id, item);
    });

    forEach(arrChange.changes, change => {
        switch(change.op) {
            case 'modify':
                idArrayPatch.modify(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'reorder':
                idArrayPatch.reorder(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'delete':
                idArrayPatch.delete(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'add':
                idArrayPatch.add(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'mount':
                idArrayPatch.mount(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'demount':
                idArrayPatch.demount(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
        }
    });
}
const idArrayPatch = {
    modify(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        const item = itemMap.get(change.id);
        if (item) {
            forEach(change.changes, modChange => {
                applyChange(item, modChange, rootPath, schemaIndex);
            });
        }
    },

    reorder(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldSchema);
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

    delete(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        idArrayPatch.demount(itemMap, array, change);
        itemMap.delete(change.id);
    },

    demount(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldSchema);
        if (!Array.isArray(parrentArray)) {
            return;
        }

        const foundIdx = idArrayPatch.findItemIndexInParrent(parrentArray, change.id);
        if (foundIdx >= 0) {
            parrentArray.splice(foundIdx, 1);
        }
    },

    mount(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        if (!itemMap.has(change.id)) {
            return;
        }
        const item = itemMap.get(change.id);

        const parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldSchema);
        if (!Array.isArray(parrentArray)) {
            return;
        }
        parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, item);
    },

    add(itemMap, array, change, rootPath, schemaIndex, fieldSchema) {
        let parrentArray = array;

        if (change.parentId) {
            parrentArray = idArrayPatch.findParentItem(itemMap, array, change.parentId, fieldSchema);
        }
        if (!Array.isArray(parrentArray)) {
            return;
        }
        itemMap.set(change.id, change.value);
        parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, change.value);
    },

    findParentItem(itemMap, array, parentId, fieldSchema) {
        if (parentId) {
            if (fieldSchema && fieldSchema.childrenField && itemMap.has(parentId)) {
                const parent = itemMap.get(parentId);
                if (!parent[fieldSchema.childrenField]) {
                    parent[fieldSchema.childrenField] = [];
                }
                return parent[fieldSchema.childrenField];
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
 * @param {String|Array} s1
 * @param {String|Array} s2
 * @param {Number} n
 * @param {Number} m
 * @param {Map} cache
 * @param {Boolean} isArray - specifies whether it should treat s1, s2 and result as arrays
 * @returns {String|Array}
 */
function _lcs(s1, s2, i, j, cache, isArray) {
    const cacheKey = `${i}-${j}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    if (i <0 || j < 0) {
        if (isArray) {
            return [];
        }
        return '';
    } else if (s1[i] === s2[j]) {
        let result = _lcs(s1, s2, i-1, j-1, cache, isArray);
        if (isArray) {
            result.push(s1[i])
        } else {
            result += s1[i];
        }
        cache.set(cacheKey, result);
        return result;
    } else {
        const a = _lcs(s1, s2, i-1, j, cache, isArray);
        cache.set(`${i-1}-${j}`, a);
        const b = _lcs(s1, s2, i, j-1, cache, isArray);
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
    return _lcs(s1, s2, s1.length-1, s2.length-1, new Map(), false);
}

/**
 * Finds longest common subsequence in two arrays of string
 * @param {Array<String>} s1
 * @param {Array<String>} s2
 * @returns {Array<String>} Longest common subsequence in two string arrays
 */
export function arrayLCS(s1, s2) {
    return _lcs(s1, s2, s1.length-1, s2.length-1, new Map(), true);
}


/**
 *
 * @param {String|Array<String>} origin
 * @param {String|Array<String>} modified
 * @param {boolean} isArray
 * @returns {Object}
 */
export function generateLCSPatch(origin, modified, isArray) {
    const lcs =  isArray ? arrayLCS(origin, modified) : stringLCS(origin, modified);

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
                if (isArray) {
                    currentOp = [i, [modified[i]]];
                } else {
                    currentOp = [i, modified[i]];
                }
                additions.push(currentOp);
            } else {
                if (isArray) {
                    currentOp[1].push(modified[i]);
                } else {
                    currentOp[1] += modified[i];
                }
            }
        } else {
            currentOp = null;
            j++;
        }
        i++;
    }
    if (i < modified.length) {
        if (isArray) {
            additions.push([i, modified.slice(i)]);
        } else {
            additions.push([i, modified.substr(i)]);
        }
    }

    return {
        delete: deletions,
        add: additions
    };
}

/**
 *
 * @param {String} origin
 * @param {String} modified
 * @returns {Object}
 */
export function generateStringPatch(origin, modified) {
    return generateLCSPatch(origin, modified, false);
}


/**
 *
 * @param {Array} originItems
 * @param {Array} modifiedItems
 * @param {Object} patchSchemaEntry
 */
export function generateArrayPatch(originItems, modifiedItems) {
    if (!Array.isArray(originItems) || !Array.isArray(modifiedItems)) {
        return null;
    }

    const origin = originItems.map(JSON.stringify);
    const modified = modifiedItems.map(JSON.stringify);
    const result = generateLCSPatch(origin, modified, true);

    const add = result.add.map(addition => [addition[0], addition[1].map(JSON.parse)]);
    result.add = add;
    return result;
}


/**
 *
 * @param {String} origin
 * @param {StringPatch} patch
 * @returns {String} modified string that is a result of applying specified string patch to the origin string
 */
export function applyStringPatch(origin, patch) {
    return applySequencePatch(origin, patch, false);
}

function applySequencePatch(origin, patch, isArray) {
    let result = origin;
    if (isArray) {
        result = utils.clone(origin);
    }

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
        if (isArray) {
            result = buffer;
        } else {
            result = buffer.join('');
        }
        if (i < origin.length) {
            if (isArray) {
                result = result.concat(origin.slice(i+1))
            } else {
                result += origin.substring(i+1);
            }
        }
    }

    if (Array.isArray(patch.add)) {
        patch.add.forEach(addition => {
            const i = addition[0];
            const value = addition[1];
            if (isArray) {
                if (!result.slice) {
                    console.log('BASDSADASDSADSADASDAS not slice', JSON.stringify(result, null, 2))
                }
                result = result.slice(0, i).concat(value).concat(result.slice(i));
            } else {
                result = result.substring(0, i) + value + result.substring(i);
            }
        });
    }

    return result;
}

export function applyArrayPatch(origin, patch) {
    return applySequencePatch(origin, patch, true)
}



/**
 *
 * @param {Object} origin
 * @param {Object} modified
 * @param {FieldSchema} patchSchemaEntry
 */
export function generateMapPatch(origin, modified, patchSchemaEntry) {
    if (!origin || !modified) {
        return [];
    }

    const valuePatchSchema = utils.clone(patchSchemaEntry);
    valuePatchSchema.type = 'object';
    valuePatchSchema.patching = ['modify'];

    const changes = []

    for (let key in origin) {
        const oHas = origin.hasOwnProperty(key);
        const mHas = modified.hasOwnProperty(key);
        if (oHas && !mHas) {
            changes.push({
                id: key,
                op: 'delete'
            });
        } else if (oHas && mHas) {
            const subChanges = generatePatchForObject(origin[key], modified[key], valuePatchSchema, []);
            if (subChanges.length > 0) {
                changes.push({
                    id: key,
                    op: 'modify',
                    changes: subChanges
                });
            }
        }
    }

    for (let key in modified) {
        if (modified.hasOwnProperty(key) && !origin.hasOwnProperty(key)) {
            changes.push({
                id: key,
                op: 'add',
                value: utils.clone(modified[key])
            });
        }
    }
    return changes;
}