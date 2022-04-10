import { jsonDiff } from "../json-differ";
import forEach from "lodash/forEach";
import map from "lodash/map";
import Shape from "../components/editor/items/shapes/Shape";
import utils from "../utils";

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
    forEach(items, (item, i) => {
        callback(item, parentItem, i);
        if (item.childItems) {
            _traverseItems(item.childItems, item, callback);
        }
    });
}


const defaultItemFields = [
    'area',
    'name',
    'description',
    'opacity',
    'selfOpacity',
    'visible',
    'groups',
    'blendMode',
    'cursor',
    'shape',
    'clip',
    'effects',
    // 'textSlots', // should be performed separately
    'interactionMode',
    'behavior',
];

function valueEquals(value1, value2) {
    return JSON.stringify(value1) === JSON.stringify(value2);
}

function checkForFieldChanges(originItem, modItem) {
    //TODO convert shape change - remove unused shapeProps
    //TODO convert text slots
    //TODO convert shapeProps change

    
    const changes = [];
    forEach(defaultItemFields, fieldName => {
        if (!valueEquals(originItem[fieldName], modItem[fieldName])) {
            changes.push({
                path: [fieldName],
                replace: utils.clone(modItem[fieldName])
            });
        }
    });

    const shape = Shape.find(modItem.shape);
    if (!shape) {
        //TODO shapeProps
    }

    return changes;
}

/**
 * 
 * @param {Scheme} scheme 
 * @returns {Map}
 */
function indexScheme(scheme) {
    const index = new Map();

    traverseItems(scheme.items, (item, parentItem, sortOrder) => {
        let parentId = null;
        if (parentItem) {
            parentId = parentItem.id;
        }

        index.set(item.id, {
            item,
            parentId: parentId,
            sortOrder
        });
    });

    return index;
}

function fromJsonDiff(diffChanges) {
    return map(diffChanges.changes, c => {
        return {
            path: c.path,
            replace: c.value
        };
    });
}

export function generateSchemePatch(baseScheme, modifiedScheme) {
    const docFieldChanges = fromJsonDiff(jsonDiff(baseScheme, modifiedScheme, { fieldCheck: schemeFieldCheck }));
    // should spot item changes:
    // - adding
    // - deletion
    // - reordering
    // - remounting
    // - field changes

    const baseSchemeIndex = indexScheme(baseScheme);
    const modifiedSchemeIndex = indexScheme(modifiedScheme);

    // we are storying all changes bound to specific scope
    // by scope we mean a particular parent item
    const scopes = {};

    const itemFieldChanges = [];

    const registerInScope = (scopeId, change) => {
        if (!scopeId) {
            scopeId = 'root';
        }

        if (!scopes.hasOwnProperty(scopeId)) {
            scopes[scopeId] = [];
        }
        scopes[scopeId].push(change);
    };

    baseSchemeIndex.forEach((entry, itemId) => {
        const modEntry = modifiedSchemeIndex.get(itemId);
        if (!modEntry) {
            // it was deleted
            registerInScope(entry.parentId, {
                kind     : 'deletion',
                id       : itemId,
                sortOrder: entry.sortOrder
            });
        } else {
            // checking for modifications
            if (entry.parentId !== modEntry.parentId) {
                registerInScope(entry.parentId, {
                    kind     : 'demounted',
                    id       : itemId,
                    sortOrder: entry.sortOrder
                });

                registerInScope(modEntry.parentId, {
                    kind     : 'mounted',
                    id       : itemId,
                    sortOrder: modEntry.sortOrder
                });
            } else if (entry.sortOrder !== modEntry.sortOrder) {
                // order or mounting changed
                const change = {
                    kind        : 'reordered',
                    id          : itemId,
                    sortOrder   : entry.sortOrder,
                    newSortOrder: modEntry.sortOrder
                };
            } 

            const fieldChanges = checkForFieldChanges(entry.item, modEntry.item);
            if (fieldChanges.length > 0) {
                itemFieldChanges.push({
                    id: itemId,
                    fields: fieldChanges
                });
            }
        }
    });

    modifiedSchemeIndex.forEach((entry, itemId) => {
        if (!baseSchemeIndex.has(itemId)) {
            // it was added
            registerInScope(entry.parentId, {
                kind     : 'addition',
                id       : itemId,
                sortOrder: entry.sortOrder,
                item     : entry.item
            });
        }
    });

    return {
        version: '1',
        protocol: 'schemio/patch',
        doc: docFieldChanges,
        items: {
            changes: itemFieldChanges
        }
    };
}
