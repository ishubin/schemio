import { filter, forEach } from "../collections";
import Shape from "../components/editor/items/shapes/Shape";
import { Logger } from "../logger";
import myMath from "../myMath";
import { traverseItemsConditionally } from "./Item";


const log = new Logger('ItemMath');

/**
 * @param {Array<Item>} items - flatten item arrray
 * @returns {Array<Item>}
 */
export function filterNonHUDItems(items) {
    return filter(items, item => item.shape !== 'hud' && !item.meta.isInHUD);
}


/**
 * Traverses items hierarchically and collects a flatten item array with items that are visible and not in HUD
 * This is supposed to be used for improved auto-zoom experience
 * @param {Array<Item>} items - non-flatten item array
 * @returns {Array<Item>}
 */
export function collectOnlyVisibleNonHUDItems(items) {
    const filteredItems = [];
    traverseItemsConditionally(items, item => {
        if (item.shape === 'hud') {
            return false
        }
        if (item.visible === false || item.opacity < 0.0001) {
            return false;
        }

        filteredItems.push(item);
        return true;
    });

    return filteredItems;
}

export function calculateZoomingAreaForItems(items, mode) {
    if (mode === 'view') {
        //filtering HUD items out as they are always shown in the viewport  in view mode
        items = filterNonHUDItems(items);
    }

    if (!items || items.length === 0) {
        return null;
    }

    let filteredItems = filter(items, item => {
        if (mode === 'view' && item.shape === 'dummy') {
            return false;
        }
        return item.visible && item.meta.calculatedVisibility;
    });

    if (filteredItems.length === 0 && items.length > 0) {
        // this check is needed because in edit mode a user might select an item that is not visible
        // (e.g. in item selector componnent) and click 'zoom to it'
        filteredItems = items;
    }
    return getBoundingBoxOfItems(filteredItems);
}


/**
 * Calculates screen transform for centering the camera on area
 * @param {Area} area area in the world transform
 * @param {Number} width width of canvas
 * @param {Number} height height of canvas
 * @returns {ScreenTransform}
 */
export function calculateScreenTransformForArea(area, width, height) {
    let scale = 1.0;
    if (area.w > 0 && area.h > 0 && width > 0 && height > 0) {
        scale = Math.floor(100.0 * Math.min(width/area.w, height/area.h)) / 100.0;
        scale = Math.max(0.0001, scale);
    }

    return {
        x: width/2 - (area.x + area.w/2) * scale,
        y: height/2 - (area.y + area.h/2) * scale,
        scale: scale
    };
}

/**
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Item} item
 * @param {Array|null} transformMatrix - a transform matrix that is applied before item transform. This could be used for shadow transform of component item
 * @returns
 */
export function worldPointOnItem(x, y, item, transformMatrix = null) {
    if (!transformMatrix) {
        transformMatrix = (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null;
    } else if (item.meta && item.meta.transformMatrix) {
        transformMatrix = myMath.multiplyMatrices(transformMatrix, item.meta.transformMatrix);
    }
    return myMath.worldPointInArea(x, y, item.area, transformMatrix);
}

/**
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Item} item
 * @param {Array|null} transformMatrix - a transform matrix that is applied before item transform. This could be used for shadow transform of component item
 * @returns
 */
export function localPointOnItem(x, y, item, transformMatrix = null) {
    if (!transformMatrix) {
        transformMatrix = (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null;
    } else if (item.meta && item.meta.transformMatrix) {
        transformMatrix = myMath.multiplyMatrices(transformMatrix, item.meta.transformMatrix);
    }
    return myMath.localPointInArea(x, y, item.area, transformMatrix);
}

export function localPointOnItemToLocalPointOnOtherItem(x, y, srcItem, dstItem) {
    const worldPoint = worldPointOnItem(x, y, srcItem);
    return localPointOnItem(worldPoint.x, worldPoint.y, dstItem);
}

export function worldAngleOfItem(item) {
    const v = worldVectorOnItem(item.area.w, 0, item);
    return myMath.fullAngleForVector(v.x, v.y) * 180 / Math.PI;
}

/**
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Item} item
 * @param {Array|undefined} transformMatrix
 * @returns
 */
export function worldVectorOnItem(x, y, item, transformMatrix = null) {
    const p0 = worldPointOnItem(0, 0, item, transformMatrix);
    const p1 = worldPointOnItem(x, y, item, transformMatrix);
    return {
        x: p1.x - p0.x,
        y: p1.y - p0.y
    };
}

/**
 *
 * @param {Item} item
 * @param {SVGPathElement} shadowSvgPath
 * @param {Number} positionOnPath
 * @returns {Point}
 */
export function pointOnItemPath(item, shadowSvgPath, positionOnPath) {
    if (shadowSvgPath) {
        const point = shadowSvgPath.getPointAtLength(positionOnPath);
        return worldPointOnItem(point.x, point.y, item);
    }
    // returning the center of item if it failed to find its path
    return worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
}


/**
 * Calculates bounding box in world transform of specified items.
 * @param {Array<Item>} items
 * @param {Array|undefined} shadowTransform
 * @returns {Area} bounding box in world transform
 */
export function getBoundingBoxOfItems(items, shadowTransform) {
    if (!items || items.length === 0) {
        return {x: 0, y: 0, w: 0, h: 0};
    }

    let range = null;

    forEach(items, item => {
        const points = [
            worldPointOnItem(0, 0, item, shadowTransform),
            worldPointOnItem(item.area.w, 0, item, shadowTransform),
            worldPointOnItem(item.area.w, item.area.h, item, shadowTransform),
            worldPointOnItem(0, item.area.h, item, shadowTransform),
        ];

        forEach(points, point => {
            if (!range) {
                range = {
                    x1: point.x,
                    x2: point.x,
                    y1: point.y,
                    y2: point.y,
                }
            } else {
                if (range.x1 > point.x) {
                    range.x1 = point.x;
                }
                if (range.x2 < point.x) {
                    range.x2 = point.x;
                }
                if (range.y1 > point.y) {
                    range.y1 = point.y;
                }
                if (range.y2 < point.y) {
                    range.y2 = point.y;
                }
            }
        });
    });

    const schemeBoundaryBox = {
        x: range.x1,
        y: range.y1,
        w: range.x2 - range.x1,
        h: range.y2 - range.y1,
    };

    return schemeBoundaryBox;
}

/**
 * Calculates scaling effect of the item relative to the world
 * This is needed for proper computation of control points for scaled items
 * @param {Item} item
 * @param {Array} transformMatrix
 * @returns {Point}
 */
export function worldScalingVectorOnItem(item, transformMatrix = null) {
    const topLengthVector = worldVectorOnItem(1, 0, item, transformMatrix);
    const leftLengthVector = worldVectorOnItem(0, 1, item, transformMatrix);

    return {
        x: myMath.vectorLength(topLengthVector.x, topLengthVector.y),
        y: myMath.vectorLength(leftLengthVector.x, leftLengthVector.y)
    }
}

/**
 *
 * @param {Item} item
 * @param {Array|undefined} transformMatrix
 * @returns
 */
export function itemCompleteTransform(item, transformMatrix = null) {
    if (!transformMatrix) {
        transformMatrix = (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : myMath.identityMatrix();
    } else if (item.meta && item.meta.transformMatrix) {
        transformMatrix = myMath.multiplyMatrices(transformMatrix, item.meta.transformMatrix);
    }
    return myMath.standardTransformWithArea(transformMatrix, item.area);
}

/**
 * Checks whether the item is a descendant of ancestorItem
 * @param {Item} item
 * @param {String} ancestorItemId
 * @returns {Boolean}
 */
export function isItemDescendantOf(item, ancestorItemId) {
    if (!item.meta || !Array.isArray(item.meta.ancestorIds)) {
        return false;
    }
    return item.meta.ancestorIds.indexOf(ancestorItemId) >= 0;
}


/**
 * Creates svg path element for item outline
 * @param {Item} item
 * @returns {SVGPathElement}
 */
export function getItemOutlineSVGPath(item) {
    log.info('Computing shape outline for item', item.id, item.name);
    const shape = Shape.find(item.shape);
    if (shape) {
        const path = shape.computeOutline(item);
        if (path) {
            const shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shadowSvgPath.setAttribute('d', path);
            return shadowSvgPath;
        }
    }
    return null;
}

