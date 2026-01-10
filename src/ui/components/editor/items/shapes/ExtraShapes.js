import axios from "axios";
import { traverseItems } from "../../../../scheme/Item";
import StoreUtils from "../../../../store/StoreUtils";
import Shape from "./Shape";

export function generateShapeId(shapeGroupId, shapeId) {
    return `ext:${shapeId}:${shapeGroupId}`;
}

export function registerExternalShapeGroup($store, shapeGroupId, shapeGroup) {
    //TODO validate shapeGroup JSON schema

    if (typeof shapeGroup !== 'object' || !Array.isArray(shapeGroup.shapes)) {
        throw new Error(`Invalid shape group in ${url}`);
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

    const assetsPath = $store.state.assetsPath || '/assets';
    const separator = assetsPath.endsWith('/') ? '' : '/';
    return axios.get(`${assetsPath}${separator}shapes/shapes.json`)
    .then(response => {
        const shapeGroups = response.data;
        if (!shapeGroups) {
            return null;
        }
        const shapeGroupIndex = new Map();
        shapeGroups.forEach(shapeGroup => {
            shapeGroupIndex.set(shapeGroup.id, shapeGroup);
        });

        return Promise.all(Array.from(shapeGroupIds).map(shapeGroupId => {
            const shapeGroup = shapeGroupIndex.get(shapeGroupId);
            if (!shapeGroup) {
                return Promise.resolve(null);
            }
            return axios.get(shapeGroup.ref).then(response => {
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                registerExternalShapeGroup($store, shapeGroupId, data);
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