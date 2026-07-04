import { traverseItems } from "../../../../scheme/Item";
import StoreUtils from "../../../../store/StoreUtils";
import Shape from "./Shape";

export function generateShapeId(shapeGroupId, shapeId) {
    return `ext:${shapeId}:${shapeGroupId}`;
}

export function registerExternalShapeGroup($store, shapeGroupId, shapeGroup) {
    //TODO validate shapeGroup JSON schema

    if (typeof shapeGroup !== 'object' || !Array.isArray(shapeGroup.shapes)) {
        throw new Error(`Invalid shape group in ${shapeGroupId}`);
    }

    shapeGroup.shapes.forEach(shapeDef => {
        if (shapeDef.shapeConfig.shapeType !== 'templated') {
            return;
        }
        const shapeId = generateShapeId(shapeGroupId, shapeDef.shapeConfig.id);
        Shape.registerTemplatedShape(shapeId, shapeDef.shapeConfig);
    });

    StoreUtils.registerShapeGroupId($store, shapeGroupId);
}

function collectMissingShapes(items) {
    const missingShapes = new Set();
    traverseItems(items, item => {
        if (item.shape && !Shape.find(item.shape)) {
            missingShapes.add(item.shape);
        }
    });

    return Array.from(missingShapes);
}


function loadAllMissingShapes(shapeIds, $store) {
    const shapeGroupIds = new Set();
    shapeIds.forEach(shapeId => {
        const parts = shapeId.split(':');
        if (parts.length === 3) {
            shapeGroupIds.add(parts[2]);
        }
    });

    if (shapeGroupIds.size === 0) {
        return Promise.resolve(null);
    }

    return $store.state.apiClient.getShapes()
    .then(shapeGroups => {
        if (!shapeGroups) {
            return null;
        }
        const shapeGroupIndex = new Map();
        shapeGroups.forEach(shapeGroup => {
            shapeGroupIndex.set(shapeGroup.id, shapeGroup);
        });

        return Promise.all(Array.from(shapeGroupIds).map(shapeGroupId => {
            const shapeGroupEntry = shapeGroupIndex.get(shapeGroupId);
            if (!shapeGroupEntry) {
                return Promise.resolve(null);
            }
            return $store.state.apiClient.getShapeGroup(shapeGroupEntry.ref).then(shapeGroup => {
                registerExternalShapeGroup($store, shapeGroupId, shapeGroup);
            });
        }))
    });
}

export function collectAndLoadAllMissingShapes(items, $store) {
    const missingShapes = collectMissingShapes(items);
    if (missingShapes && missingShapes.length > 0) {
        return loadAllMissingShapes(missingShapes, $store);
    }
    return Promise.resolve();
}