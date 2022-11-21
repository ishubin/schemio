import { traverseItems } from "./scheme/Item";
import { getBoundingBoxOfItems, worldAngleOfItem, worldPointOnItem } from "./scheme/SchemeContainer";
import { filterOutPreviewSvgElements } from './svgPreview';

export function prepareDiagramForPictureExport(items) {
    const exportedItems = [];
    let minP = null;
    let maxP = null;

    const collectedItems = [];

    items.forEach(item => {
        if (item.visible && item.opacity > 0.0001) {
            const domElement = document.querySelector(`g[data-svg-item-container-id="${item.id}"]`);
            if (domElement) {
                const itemBoundingBox = calculateBoundingBoxOfAllSubItems(item);
                if (minP) {
                    minP.x = Math.min(minP.x, itemBoundingBox.x);
                    minP.y = Math.min(minP.y, itemBoundingBox.y);
                } else {
                    minP = {
                        x: itemBoundingBox.x,
                        y: itemBoundingBox.y
                    };
                }
                if (maxP) {
                    maxP.x = Math.max(maxP.x, itemBoundingBox.x + itemBoundingBox.w);
                    maxP.y = Math.max(maxP.y, itemBoundingBox.y + itemBoundingBox.h);
                } else {
                    maxP = {
                        x: itemBoundingBox.x + itemBoundingBox.w,
                        y: itemBoundingBox.y + itemBoundingBox.h
                    };
                }
                const itemDom = domElement.cloneNode(true);
                filterOutPreviewSvgElements(itemDom);
                collectedItems.push({
                    item, itemDom
                });
            }
        }
    });

    collectedItems.forEach(collectedItem => {
        const item = collectedItem.item;
        const itemDom = collectedItem.itemDom;
        const worldPoint = worldPointOnItem(0, 0, item);
        const angle = worldAngleOfItem(item);
        const x = worldPoint.x - minP.x;
        const y = worldPoint.y - minP.y;

        itemDom.setAttribute('transform', `translate(${x},${y}) rotate(${angle})`);
        const html = itemDom.outerHTML;
        exportedItems.push({item, html})
    });

    const result = {
        exportedItems,
        width: maxP.x - minP.x,
        height: maxP.y - minP.y,
    }
    if (result.width > 5) {
        result.width = Math.round(result.width);
    }
    if (result.height > 5) {
        result.height = Math.round(result.height);
    }

    // this check is needed when exporting straight vertical or horizontal path lines
    // in such case area is defined with zero width or height and it confuses SVG exporter
    if (result.width < 0.001) {
        result.width = 20;
    }
    if (result.height < 0.001) {
        result.height = 20;
    }
    return result;
}

/**
 * Calculates bounding box taking all sub items into account and excluding the ones that are not visible
 */
function calculateBoundingBoxOfAllSubItems(parentItem) {
    const items = [];
    traverseItems(parentItem, item => {
        if (item.visible && item.opacity > 0.0001) {
            // we don't want dummy shapes to effect the view area as these shapes are not supposed to be visible
            if (item.shape !== 'dummy' && item.selfOpacity > 0.0001) {
                items.push(item);
            }
        }
    });
    return getBoundingBoxOfItems(items);
}