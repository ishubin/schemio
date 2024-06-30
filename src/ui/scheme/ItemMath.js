import { forEach } from "../collections";
import Shape from "../components/editor/items/shapes/Shape";
import { Logger } from "../logger";
import myMath from "../myMath";


const log = new Logger('ItemMath');

export function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}

export function localPointOnItem(x, y, item) {
    return myMath.localPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}

export function localPointOnItemToLocalPointOnOtherItem(x, y, srcItem, dstItem) {
    const worldPoint = worldPointOnItem(x, y, srcItem);
    return localPointOnItem(worldPoint.x, worldPoint.y, dstItem);
}

export function worldAngleOfItem(item) {
    const v = worldVectorOnItem(item.area.w, 0, item);
    return myMath.fullAngleForVector(v.x, v.y) * 180 / Math.PI;
}

export function worldVectorOnItem(x, y, item) {
    const p0 = worldPointOnItem(0, 0, item);
    const p1 = worldPointOnItem(x, y, item);
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
 * @returns {Area} bounding box in world transform
 */
export function getBoundingBoxOfItems(items) {
    if (!items || items.length === 0) {
        return {x: 0, y: 0, w: 0, h: 0};
    }

    let range = null;

    forEach(items, item => {
        const points = [
            worldPointOnItem(0, 0, item),
            worldPointOnItem(item.area.w, 0, item),
            worldPointOnItem(item.area.w, item.area.h, item),
            worldPointOnItem(0, item.area.h, item),
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
 * @returns {Point}
 */
export function worldScalingVectorOnItem(item) {
    const topLengthVector = worldVectorOnItem(1, 0, item);
    const leftLengthVector = worldVectorOnItem(0, 1, item);

    return {
        x: myMath.vectorLength(topLengthVector.x, topLengthVector.y),
        y: myMath.vectorLength(leftLengthVector.x, leftLengthVector.y)
    }
}

export function itemCompleteTransform(item) {
    const parentTransform = (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : myMath.identityMatrix();
    return myMath.standardTransformWithArea(parentTransform, item.area);
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

