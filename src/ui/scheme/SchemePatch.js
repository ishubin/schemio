import { forEach, forEachObject, indexOf } from "../collections";
import utils from "../utils";
import { fieldTypeMatchesSchema, getSchemioDocSchema } from "./SchemioDocSchema";
import { tokenizeText } from "./tokenize";


/*

This comment section explains how th algorithm detects the optimal set
of reorder operations to bring the origin list to the same order as modified list


CASE 1: Moving a small batch of items
    Old  New
    a1   b1
    a2   b2
    b1   b3
    b2   a1
    b3   a2
    c1   c1

    Reconstructing the sequence of changes based on the old positions:
        a1   b1    a1|        *
        a2   b2      | a2|    |   *
        b1   b3      |   |  b1|   |   *
        b2   a1      *   |      b2|   |
        b3   a2          *          b3|
        c1   c1                         c1

    Noting the changes:
        a1 3↓
        a2 3↓
        b1 2↑
        b2 2↑
        b3 2↑

    Sorting all the changes by number of moves. In this case the array stays the same

    The resulting patch should include:
        a1 3↓
        a2 3↓


CASE 2: Moving another batch of items
    Old  New
    a1   b1
    a2   b2
    a3   a1
    b1   a2
    b2   a3
    c1   c1

    Reconstructing the sequence of changes based on the old positions:
    0  a1   b1   a1|              *
    1  a2   b2     |  a2|         |    *
    2  a3   a1     *    |  a3|    |    |
    3  b1   a2          *    |  b1|    |
    4  b2   a3               *       b2|
    5  c1   c1                           c1

    Noting the changes
        a1 2↓ from 0 to 3
        a2 2↓ from 1 to 4
        a3 2↓ from 2 to 5
        b1 3↑ from 3 to 0
        b2 3↑ from 4 to 1

    Sorting changes first by distance, then by from position:
        b1 3↑ from 3 to 0
        b2 3↑ from 4 to 1
        a1 2↓ from 0 to 3
        a2 2↓ from 1 to 4
        a3 2↓ from 2 to 5

    Executing changes one at a time and checking whether next change is needed
        b1 3↑ from 3 to 0 - valid change
               old curr dst
            0  a1  b1  b1
            1  a2  a1  b2
            2  a3  a2  a1
            3  b1  a3  a2
            4  b2  b2  a3
            5  c1  c1  c1

        b2 3↑ from 4 to 1 - valid change
               old curr dst
            0  a1  b1  b1
            1  a2  b2  b2
            2  a3  a1  a1
            3  b1  a2  a2
            4  b2  a3  a3
            5  c1  c1  c1

        a1 2↓ from 0 to 3 - discarded as the element is in the right place already
        a2 2↓ from 1 to 4 - dscarded
        a3 2↓ from 2 to 5 - discarded

CASE 3: Overlapping reorder
    Old New
    0  a  b
    1  b  g
    2  c  c
    3  d  d
    4  e  e
    5  f  a
    6  g  f
    7  h  h

    Reconstructing the sequence of changes based on the old positions:
        0   a  b     a|   *
        1   b  g      |  b|               *
        2   c  c      |     c             |
        3   d  d      |        d          |
        4   e  e      |           e       |
        5   f  a      *              f|   |
        6   g  f                      *  g|
        7   h  h                            h

    Noting the changes
        a 5↓ from 0 to 5
        b 1↑ from 1 to 0
        f 1↓ from 5 to 6
        g 5↑ from 6 to 1

    sorting the changes first by distance then by from position
        a 5↓ from 0 to 5
        g 5↑ from 6 to 1
        b 1↑ from 1 to 0
        f 1↓ from 5 to 6

    executing every change from top to bottom and checking which changes are not needed anymore and which need to be adjusted
        a 5↓ from 0 to 5
               old  curr dst
            0  a    b    b
            1  b    c    g
            2  c    d    c
            3  d    e    d
            4  e    f    e
            5  f    a    a
            6  g    g    f
            7  h    h    h

        g 5↑ from 6 to 1 - g in the same position as in old so distance stays the same and the change is valid:
               old  curr  dst
            0  a    b    b
            1  b    g    h
            2  c    c    c
            3  d    d    d
            4  e    e    e
            5  f    f    a
            6  g    a    f
            7  h    h    h

        b 1↑ from 1 to 0 - change is discarded as b is already in the right due to previous changes


        f 1↓ from 5 to 6 - change is valid. f is at pos 5 and by moving it by 1 pos we arrange all the symbols as it is supposed to be
               old  curr  dst
            0  a    b    b
            1  b    g    h
            2  c    c    c
            3  d    d    d
            4  e    e    e
            5  f    a    a
            6  g    f    f
            7  h    h    h



CASE 4: Deletion and reorder

       old  new (deleted d, and moved g in front of b)
    0  a    a
    1  b    g
    2  c    b
    3  d    c
    4  e    e
    5  f    f
    6  g

    first we align the list by removing the d element
           old  dst
        0  a    a
        1  b    g
        2  c    b
        3  e    c
        4  f    e
        5  g    f


    Reconstructing the sequence of changes based on the old positions:
           old  dst
        0  a    a    a
        1  b    g      b|               *
        2  c    b       *  c|           |
        3  e    c           *  e|       |
        4  f    e               *  f|   |
        5  g    f                   *  g|

    Noting the changes
        b 1↓ from 1 to 2
        c 1↓ from 2 to 3
        e 1↓ from 3 to 4
        f 1↓ from 4 to 5
        g 4↑ from 5 to 1

    Sorting by distance
        g 4↑ from 5 to 1    <- this is the only valid change,
        b 1↓ from 1 to 2       once it is done the other changes can be discarded
        c 1↓ from 2 to 3       as all elements will be in the right positions
        e 1↓ from 3 to 4
        f 1↓ from 4 to 5


CASE 5: complete shuffle, e.g. reverse
       old new
    0  a   e
    1  b   d
    2  c   c
    3  d   b
    4  e   a

    Reconstructing the sequence of changes based on the old positions:
           old dst
        0  a   e     a|               *
        1  b   d      |   b|      *   |
        2  c   c      |    |  c   |   |
        3  d   b      |    *     d|   |
        4  e   a      *              e|

    Noting the changes
        a 4↓ from 0 to 4
        b 2↓ from 1 to 3
        d 2↑ from 3 to 1
        e 4↑ from 4 to 0

    Sort by distance
        a 4↓ from 0 to 4
        e 4↑ from 4 to 0
        b 2↓ from 1 to 3
        d 2↑ from 3 to 1

    Iterating through every change and testing it on old array
        a 4↓ from 0 to 4
               old cur dst
            0  a   b   e
            1  b   c   d
            2  c   d   c
            3  d   e   b
            4  e   a   a

        e 4↑ from 4 to 0 - almost valid, but it needs to go to by 1 jump less (3↑ from 3 to 0)
               old cur dst
            0  a   e   e
            1  b   b   d
            2  c   c   c
            3  d   d   b
            4  e   a   a

        b 2↓ from 1 to 3 - change is valid
               old cur dst
            0  a   e   e
            1  b   c   d
            2  c   d   c
            3  d   b   b
            4  e   a   a

        d 2↑ from 3 to 1 - change is almost valid, but its jump is reduced by 1 (1↑ from 2 to 1)
               old cur dst
            0  a   e   e
            1  b   d   d
            2  c   c   c
            3  d   b   b
            4  e   a   a
*/


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
    forEach(items, (item, i) => {
        callback(item, parentItem, i);
        if (childrenField && item[childrenField]) {
            _traverseItems(item[childrenField], childrenField, item, callback);
        }
    });
}

function traverseItemsLowestFirst(items, childrenField, parentItem, callback) {
    forEach(items, (item, i) => {
        if (childrenField && item[childrenField]) {
            _traverseItems(item[childrenField], childrenField, item, callback);
        }
        callback(item, parentItem, i);
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
 * @returns {Map<String, Object>}
 */
function indexIdArray(items, childrenField) {
    const index = new Map();

    traverseItems(items, childrenField, (item, parentItem, sortOrder) => {
        const parentId = parentItem ? parentItem.id : null;
        index.set(item.id, {item, parentId, sortOrder});
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

    let operations = [];

    const deletedItemIds = new Set();

    traverseItemsLowestFirst(originItems, patchSchemaEntry.childrenField, null, (item) => {
        if (!modIndex.has(item.id)) {
            operations.push({
                id: item.id,
                op: 'delete'
            });
            deletedItemIds.add(item.id);
        }
    });

    // then it needs to detect additions or remounts as the sortOrder field in reported additions
    // is relative to the old items after the deletions applied
    const cloneWithoutChildrenAndIgnoredFields = (item) => {
        const newItem = {};
        for(let key in item) {
            if (item.hasOwnProperty(key)) {
                let allowedField = false;
                if (key === patchSchemaEntry.childrenField) {
                    allowedField = false;
                } else if (patchSchemaEntry.fields && patchSchemaEntry.fields.hasOwnProperty(key)) {
                    allowedField = patchSchemaEntry.fields[key].type !== 'ignored';
                } else {
                    allowedField = true;
                }
                if (allowedField) {
                    newItem[key] = item[key];
                }
            }
        }
        return newItem;
    };

    modIndex.forEach((itemEntry, itemId) => {
        const originEntry = originIndex.get(itemId);
        if (!originEntry) {
            operations.push({
                id: itemId,
                op: 'add',
                value: cloneWithoutChildrenAndIgnoredFields(itemEntry.item),
                parentId: itemEntry.parentId,
                sortOrder: itemEntry.sortOrder,
            });
        } else if (originEntry.parentId !== itemEntry.parentId) {
            operations.push({
                id: itemId,
                op: 'mount',
                parentId: itemEntry.parentId,
                sortOrder: itemEntry.sortOrder,
            });
        }
    });

    const scanThroughRemainingItems = (items, callback, parentId) => {
        callback(items, parentId ? parentId : null);
        for (let i = 0; i < items.length; i++) {
            if (patchSchemaEntry.childrenField && items[i][patchSchemaEntry.childrenField]) {
                scanThroughRemainingItems(items[i][patchSchemaEntry.childrenField], callback, items[i].id);
            }
        }
    };

    // next we are going to detect modifications of items and reorder of items in their parent array
    scanThroughRemainingItems(originItems, (items, parentId) => {
        items.forEach(item => {
            if (deletedItemIds.has(item.id)) {
                return;
            }
            const modEntry = modIndex.get(item.id);
            if (!modEntry) {
                // item was deleted
                return;
            }
            // also checking for field changes for items that were not removed
            const itemSchema = {type: 'object', patching: ['modify'], fields: patchSchemaEntry.fields};
            const fieldChanges = generatePatchForObject(item, modEntry.item, itemSchema, []);
            if (fieldChanges.length > 0) {
                operations.push({
                    id: item.id,
                    op: 'modify',
                    changes: fieldChanges
                });
            }
        });

        let modItems = null;
        if (parentId) {
            const modParentEntry = modIndex.get(parentId);
            if (modParentEntry && patchSchemaEntry.childrenField) {
                modItems = modParentEntry.item[patchSchemaEntry.childrenField];
            }
        } else {
            modItems = modifiedItems;
        }

        if (modItems) {
            const ops = generateIdArrayReorderOperations(items, modItems).map(op => {
                return {
                    ...op,
                    parentId
                };
            })
            operations = operations.concat(ops);
        }
    });

    return operations;
}

/**
 *
 * @param {Array} oldItems
 * @param {Array} modItems
 * @returns {Array}
 */
function generateIdArrayReorderOperations(oldItems, modItems) {
    // first align oldItems array so that
    const createIndex = (items) => {
        const index = new Map();
        items.forEach((item, sortOrder) => {
            index.set(item.id, {item, sortOrder});
        });
        return index;
    }
    const oldIndex = createIndex(oldItems);
    const modIndex = createIndex(modItems);

    // creating srcItems which should be aligned with modItems
    // (should have the same length, deleted items removed and have added items in the same place)
    const srcItemIds = [];
    oldItems.forEach(item => {
        // excluding deleted items from old list
        if (modIndex.has(item.id)) {
            srcItemIds.push(item.id);
        }
    });

    modItems.forEach((item, idx) => {
        if (!oldIndex.has(item.id)) {
            // inserting added items
            // these are not necessarily added,
            // they could be items that were remounted from another parent item
            srcItemIds.splice(idx, 0, item.id);
        }
    });

    // constructing the list of all changed item ids
    const changes = [];
    srcItemIds.forEach((itemId, idx) => {
        // we are only looking at items that were present in both arrays originally
        if (!modIndex.has(itemId) || !oldIndex.has(itemId)) {
            return;
        }
        const dstIdx = modIndex.get(itemId).sortOrder;
        if (idx !== dstIdx) {
            changes.push({
                id      : itemId,
                steps   : dstIdx - idx,
                absSteps: Math.abs(dstIdx - idx),
                from    : idx,
                to      : dstIdx,
            });
        }
    });

    // sorting all changes based on steps
    changes.sort((a, b) => {
        if (a.absSteps === b.absSteps) {
            return a.from - b.from;
        } else {
            return b.absSteps - a.absSteps;
        }
    });

    const operations = [];

    changes.forEach(change => {
        const idx = srcItemIds.indexOf(change.id);
        if (idx < 0) {
            return;
        }

        const modEntry = modIndex.get(change.id);
        if (!modEntry || modEntry.sortOrder === idx) {
            return;
        }

        srcItemIds.splice(idx, 1);
        srcItemIds.splice(modEntry.sortOrder, 0, change.id);

        operations.push({
            id: change.id,
            op: 'reorder',
            sortOrder: modEntry.sortOrder
        });
    });

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
export function generatePatchForObject(originObject, modifiedObject, patchSchema, fieldPath) {
    let ops = [];
    const fieldNames = new Set();
    forEachObject(originObject, (value, name) => {
        if (modifiedObject.hasOwnProperty(name)) {
            fieldNames.add(name)
        } else {
            ops.push({op: 'delete', path: fieldPath.concat(name)})
        }
    });
    forEachObject(modifiedObject, (value, name) => fieldNames.add(name));

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
        fieldNames.delete(field);
        if (!Array.isArray(fieldSchema.patching) || fieldSchema.patching.length === 0) {
            return;
        }
        const op = fieldSchema.patching[0];

        if (op !== 'replace') {
            if (
                (typeof modifiedObject[field] !== typeof originObject[field] && (typeof originObject[field] === 'undefined' || originObject[field] === null))
                || (originObject[field] === null && modifiedObject[field] !== null)
            ) {
                if (indexOf(fieldSchema.patching, 'replace') < 0) {
                    throw new Error(`Cannot patch undefined object ("${field}") with ${op}`);
                }
                ops.push({
                    op: 'replace',
                    path: fieldPath.concat([field]),
                    value: utils.clone(modifiedObject[field])
                });
                return;
            }
        }


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
                if (arrayPatch && (
                    (arrayPatch.delete && arrayPatch.delete.length > 0) ||
                    (arrayPatch.add && arrayPatch.add.length > 0)) ||
                    (arrayPatch.replace && arrayPatch.replace.length > 0)) {
                    ops.push({
                        path: fieldPath.concat([field]),
                        op: 'patch-array',
                        patch: arrayPatch
                    });
                }
            }
        }
    };

    const conditionalPostponed = [];
    fieldSchemas.forEach((fieldSchema, field) => {
        // conditional operations should all be done at the end after all the other changes are generated.
        // It later breaks down the conditional operation into two separate chunks.
        // This is needed in situations when conditional value was also changed and it triggered the cleanup of conditional fields
        // (e.g. switching item "shape" to the one that has completely diffent set of properties in "shapeProps")
        if (fieldSchema.type !== 'conditional') {
            generatePatchForField(fieldSchema, field)
        } else {
            conditionalPostponed.push({fieldSchema, field});
        }
    });

    conditionalPostponed.forEach(({fieldSchema, field}) => {
        if (modifiedObject.hasOwnProperty(field)) {
            if (!fieldSchema.contidionalParentField) {
                return false;
            }

            const cOps = generateConditionalPatch(originObject, modifiedObject, originObject[field], modifiedObject[field], fieldPath.concat([field]), fieldSchema);
            if (cOps.length === 0) {
                return;
            }
            const cIdx = indexOf(ops, op => op.path.length === 1 && op.path[0] === fieldSchema.contidionalParentField)
            if (cIdx < 0) {
                ops = ops.concat(cOps);
            } else {
                const deleteOps = [];
                const otherOps = [];

                cOps.forEach(cOp => {
                    if (cOp.op === 'delete') {
                        deleteOps.push(cOp);
                    } else {
                        otherOps.push(cOp);
                    }
                });

                ops.splice(cIdx, 0, ...deleteOps);
                ops.splice(cIdx+deleteOps.length + 1, 0, ...otherOps);
            }
        }
        return;
    });

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
        } else if (change.op === 'modify' && modified.hasOwnProperty(change.id)) {
            modified[change.id] = applyPatch(modified[change.id], change, fieldPath, schemaIndex);
        } else if (change.op === 'replace' && modified.hasOwnProperty(change.id)) {
            modified[change.id] = change.value;
        } else if (change.op === 'add' && !modified.hasOwnProperty(change.id)) {
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
    let arr = utils.getObjectProperty(obj, arrChange.path);

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
    const parentMap = new Map();
    traverseItems(arr, childrenField, (item, parentItem) => {
        itemMap.set(item.id, item);
        parentMap.set(item.id, parentItem);
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
                idArrayPatch.delete(itemMap, arr, change, rootPath, schemaIndex, fieldSchema, parentMap);
                break;
            case 'add':
                idArrayPatch.add(itemMap, arr, change, rootPath, schemaIndex, fieldSchema);
                break;
            case 'mount':
                idArrayPatch.mount(itemMap, arr, change, rootPath, schemaIndex, fieldSchema, parentMap);
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

    delete(itemMap, array, change, rootPath, schemaIndex, fieldSchema, parentMap) {
        idArrayPatch.demount(array, change.id, parentMap);
        itemMap.delete(change.id);
    },

    demount(array, itemId, parentMap) {
        const parentItem = parentMap.get(itemId);
        if (parentItem) {
            array = parentItem.childItems;
        }

        for (let i = 0; i < array.length; i++) {
            if (array[i].id === itemId) {
                array.splice(i, 1);
                return;
            }
        }
    },

    mount(itemMap, array, change, rootPath, schemaIndex, fieldSchema, parentMap) {
        if (!itemMap.has(change.id)) {
            return;
        }

        idArrayPatch.demount(array, change.id, parentMap);
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
        const item = utils.clone(change.value);
        if (fieldSchema && fieldSchema.childrenField && item.hasOwnProperty(fieldSchema.childrenField)) {
            item[fieldSchema.childrenField] = [];
        }
        itemMap.set(change.id, item);
        parrentArray.splice(Math.min(change.sortOrder, parrentArray.length), 0, item);
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
 * @param {Function} equalityOperator - function that compares the two elements
 * @returns {String|Array}
 */
function _lcs(s1, s2, i, j, cache, isArray, equalityOperator) {
    const cacheKey = `${i}-${j}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    if (i < 0 || j < 0) {
        if (isArray) {
            return [];
        }
        return '';
    } else if (equalityOperator(s1[i], s2[j])) {
        let result = _lcs(s1, s2, i-1, j-1, cache, isArray, equalityOperator);
        if (isArray) {
            result = result.concat([s1[i]]);
        } else {
            result += s1[i];
        }
        cache.set(cacheKey, result);
        return result;
    } else {
        const a = _lcs(s1, s2, i-1, j, cache, isArray, equalityOperator);
        cache.set(`${i-1}-${j}`, a);
        const b = _lcs(s1, s2, i, j-1, cache, isArray, equalityOperator);
        cache.set(`${i}-${j-1}`, b);
        if (a.length > b.length) {
            return a;
        }
        return b;
    }
}

const MUTATION_DELETE = 0;
const MUTATION_REPLACE = 1;
const MUTATION_ADD = 2;

/**
 *
 * @param {Array<String>} origin
 * @param {Array<String>} modified
 * @param {Function} equalityOperator - function that compares the two elements
 * @return {Array<Array>} array of modifications in which every modification is of the [pos, operation, value],
 *  where operation can be 0 (delete), 1 (replace), 2 (add)
 */
export function leastMutationsForArray(origin, modified, equalityOperator) {
    return _lma(origin, modified, 0, 0, new Map(), equalityOperator)
}

function _lma(s1, s2, i, j, cache, equalityOperator) {
    const cacheKey = `${i}-${j}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    if (i >= s1.length) {
        const result = [];
        for (let k = j; k < s2.length; k++) {
            result.push([i + k - j, MUTATION_ADD, s2[k]]);
        }
        cache.set(cacheKey, result);
        return result;

    } else if (j >= s2.length) {
        const result = [];
        for (let k = i; k < s1.length; k++) {
            result.push([k, MUTATION_DELETE]);
        }
        cache.set(cacheKey, result);
        return result;

    } else if (equalityOperator(s1[i], s2[j])) {
        const result = _lma(s1, s2, i+1, j+1, cache, equalityOperator);
        cache.set(cacheKey, result);
        return result;

    } else {
        const results = [
            // deletion
            [[i, MUTATION_DELETE]].concat(_lma(s1, s2, i+1, j, cache, equalityOperator)),
            // replace
            [[i, MUTATION_REPLACE, s2[j]]].concat(_lma(s1, s2, i+1, j+1, cache, equalityOperator)),
            // addition
            [[i, MUTATION_ADD, s2[j]]].concat(_lma(s1, s2, i, j+1, cache, equalityOperator))
        ];

        let finalResult = results[0];
        for (let i = 0; i < results.length; i++) {
            if (finalResult.length > results[i].length) {
                finalResult = results[i];
            }
        }

        cache.set(cacheKey, finalResult);
        return finalResult;
    }
}




/**
 * Finds longest common tokenized subsequence in two strings.
 * It only keeps complete tokens (words, html tags and html escape symbols) in subsequence
 * If the word only partially matches, it will be ingored.
 * This is needed to make it easier to resolve conflicts when multiple users
 * are making text changes to the same fields.
 * @param {String} s1
 * @param {String} s2
 * @returns {String} Longest common subsequence in two strings
 */
export function stringLCS(s1, s2) {
    const tokens1 = tokenizeText(s1);
    const tokens2 = tokenizeText(s2);
    const tokensLCS = arrayLCS(tokens1, tokens2, (a, b) => a.text === b.text);

    let result = '';
    tokensLCS.forEach(token => {
        result += token.text;
    });
    return result;
}

/**
 * Finds longest common subsequence in two arrays of string
 * @param {Array} s1
 * @param {Array} s2
 * @param {Function} equalityOperator
 * @returns {Array} Longest common subsequence in two string arrays
 */
export function arrayLCS(s1, s2, equalityOperator) {
    return _lcs(s1, s2, s1.length-1, s2.length-1, new Map(), true, equalityOperator);
}


/**
 *
 * @param {String|Array<String>} origin
 * @param {String|Array<String>} modified
 * @param {boolean} isArray
 * @param {Function} equalityOperator - function that compares two elements of array. Used only for arrays
 * @returns {Object}
 */
export function generateLCSPatch(origin, modified, isArray, equalityOperator) {
    if (!equalityOperator) {
        equalityOperator = (a, b) => a === b;
    }
    const lcs =  isArray ? arrayLCS(origin, modified, equalityOperator) : stringLCS(origin, modified);

    const deletions = [];

    let currentOp = null;
    let i = 0, j = 0;
    while(i < origin.length && j < lcs.length) {
        if (!equalityOperator(origin[i], lcs[j])) {
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
        if (!equalityOperator(modified[i], lcs[j])) {
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

    const mutations = leastMutationsForArray(originItems, modifiedItems, objectEqualityOperator);

    const additions = [];
    const replacements = [];
    const deletions = [];

    let currentDeletion = null;

    let deletionCorrection = 0;
    let additionCorrection = 0;

    mutations.forEach(mutation => {
        let idx = mutation[0];
        const op = mutation[1];
        if (op === MUTATION_DELETE) {
            deletionCorrection++;
            if (!currentDeletion) {
                currentDeletion = [idx, 0];
                deletions.push(currentDeletion);
            }
            if (idx === currentDeletion[0] + currentDeletion[1]) {
                currentDeletion[1]++;
            } else {
                currentDeletion = [idx, 1];
                deletions.push(currentDeletion);
            }
        } else if (op === MUTATION_REPLACE) {
            replacements.push([idx, mutation[2]]);
        } else if (op === MUTATION_ADD) {
            idx = idx - deletionCorrection + additionCorrection;
            additions.push([idx, [mutation[2]]]);
            additionCorrection++;
        }
    });

    const optimizedAdditions = [];
    if (additions.length > 0) {
        let currentAddition = additions[0];
        optimizedAdditions.push(currentAddition);
        for (let i = 1; i < additions.length; i++) {
            if (currentAddition[0] + currentAddition[1].length === additions[i][0]) {
                currentAddition[1] = currentAddition[1].concat(additions[i][1]);
            } else {
                currentAddition = additions[i];
                optimizedAdditions.push(currentAddition);
            }
        }
    }

    const result = {};
    if (deletions.length > 0) {
        result.delete = deletions;
    }
    if (replacements.length > 0) {
        result.replace = replacements;
    }
    if (additions.length > 0) {
        result.add = optimizedAdditions;
    }

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
    let originClone = origin;
    let result = origin;
    if (isArray) {
        originClone = utils.clone(origin);
        result = originClone;
    }

    if (patch.replace && Array.isArray(patch.replace)) {
        patch.replace.forEach(([idx, value]) => {
            if (idx >= 0 && idx < result.length) {
                if (isArray) {
                    originClone[idx] = value;
                } else {
                    originClone = originClone.substring(0, idx) + value + originClone.substring(idx+1);
                }
            }
        });
    }

    if (patch.delete && patch.delete.length > 0) {
        const buffer = [];
        let i = 0;
        let j = 0;
        while(i < result.length && j < patch.delete.length) {
            if (patch.delete[j][0] === i) {
                i += patch.delete[j][1]-1;
                j++;
                if (j >= patch.delete.length) {
                    break;
                }
            } else {
                buffer.push(result[i]);
            }
            i++;
        }
        if (isArray) {
            result = buffer;
        } else {
            result = buffer.join('');
        }
        if (i < originClone.length) {
            if (isArray) {
                result = result.concat(originClone.slice(i+1))
            } else {
                result += originClone.substring(i+1);
            }
        }
    }

    if (patch.add && Array.isArray(patch.add)) {
        patch.add.forEach(addition => {
            const i = addition[0];
            const value = addition[1];
            if (isArray) {
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

    const changes = [];

    for (let key in origin) {
        const oHas = origin.hasOwnProperty(key);
        const mHas = modified.hasOwnProperty(key);
        if (oHas && !mHas) {
            changes.push({
                id: key,
                op: 'delete'
            });
        } else if (oHas && mHas) {
            /** @type {FieldSchema} */
            let fieldSchema = null;
            if (patchSchemaEntry.fields && patchSchemaEntry.fields.hasOwnProperty(key)) {
                fieldSchema = patchSchemaEntry.fields[key];
            } else if (patchSchemaEntry.fields && patchSchemaEntry.fields.hasOwnProperty('*')) {
                fieldSchema = patchSchemaEntry.fields['*'];
            }

            if (fieldSchema && Array.isArray(fieldSchema.patching) && fieldSchema.patching[0] === 'replace') {
                if (!valueEquals(origin[key], modified[key])) {
                    changes.push({
                        id: key,
                        op: 'replace',
                        value: modified[key]
                    })
                }
            } else {
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


function objectEqualityOperator(a, b) {
    const aType = typeof a;
    const bType = typeof b;
    if (aType !== bType) {
        return false;
    }

    if (aType === 'object') {
        for (let key in a) {
            if (a.hasOwnProperty(key)) {
                if (b.hasOwnProperty(key)) {
                    if (!objectEqualityOperator(a[key], b[key])) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }

        for (let key in b) {
            if (b.hasOwnProperty(key) && !a.hasOwnProperty(key)) {
                return false;
            }
        }

        return true;
    } else if (aType === 'array') {
        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i++) {
            if (!objectEqualityOperator(a[i], b[i])) {
                return false;
            }
        }
    }

    return a === b;
}