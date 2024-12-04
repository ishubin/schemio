import myMath from "../../myMath";
import { traverseItemsConditionally } from "../../scheme/Item";
import { itemCompleteTransform, worldScalingVectorOnItem } from "../../scheme/ItemMath";
import SchemeContainer from "../../scheme/SchemeContainer";
import { computeButtonPath } from "./items/shapes/Component.vue";
import Shape from "./items/shapes/Shape";

/**
 * @param {Item} item
 */
function isExternalUnloadedComponent(item) {
    return item.shape === 'component'
        && item.shapeProps.kind === 'external'
        && item.shapeProps.showButton === true
        && !(Array.isArray(item._childItems) && item._childItems.length > 0);
}

/**
 * @param {SchemeContainer} schemeContainer
 * @param {String} strokeColor
 * @param {String} fillColor
 * @param {Function(Item): Boolean} conditionCallback
 * @returns {Array}
 */
export function collectItemsHighlightsByCondition(schemeContainer, strokeColor, fillColor, conditionCallback) {
    const highlights = [];
    _collectItemsHighlightsByCondition(schemeContainer, false, strokeColor, fillColor, conditionCallback, highlights);
    return highlights;
}

/**
 * When clickable markers are toggled it should also display component buttons
 * Since component buttons are not separate items but rather a special area on a component
 * we can't use the same logic with item filtering.
 * @param {SchemeContainer} schemeContainer
 * @param {String} strokeColor
 * @param {String} fillColor
 * @param {Function(Item): Boolean} conditionCallback
 * @returns {Array}
 */
export function collectItemsHighlightsForClickableMarkers(schemeContainer, strokeColor, fillColor, conditionCallback) {
    const highlights = [];
    _collectItemsHighlightsByCondition(schemeContainer, true, strokeColor, fillColor, conditionCallback, highlights);
    return highlights;
}


/**
 *
 * @param {SchemeContainer} schemeContainer
 * @param {Boolean} collectComponentButtons - flag that specifies whether the component buttons should be collected
 * @param {String} strokeColor
 * @param {String} fillColor
 * @param {Function(Item): Boolean} conditionCallback
 * @param {Array} result
 */
function _collectItemsHighlightsByCondition(schemeContainer, collectComponentButtons, strokeColor, fillColor, conditionCallback, result) {
    traverseItemsConditionally(schemeContainer.scheme.items, (item) => {
        if (!item.visible) {
            return false;
        }
        if (conditionCallback(item)) {
            result.push(generateItemHighlight(item, false, strokeColor, fillColor, schemeContainer.shadowTransform));
        }
        if (collectComponentButtons && isExternalUnloadedComponent(item)) {
            const scalingVector = worldScalingVectorOnItem(item, schemeContainer.shadowTransform);
            let scalingFactor = Math.max(scalingVector.x, scalingVector.y);
            if (myMath.tooSmall(scalingFactor)) {
                scalingFactor = 1;
            }
            const m = itemCompleteTransform(item, schemeContainer.shadowTransform);
            result.push({
                id: item.id,
                transform: `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`,
                path: computeButtonPath(item),
                fill: fillColor,
                strokeSize: Math.max(2, item.shapeProps.buttonStrokeSize + 2),
                stroke: strokeColor,
                pins: [],
                opacity: 0.5,
                scalingFactor
            });
        }
        if (item.meta.componentSchemeContainer) {
            _collectItemsHighlightsByCondition(item.meta.componentSchemeContainer, collectComponentButtons, strokeColor, fillColor, conditionCallback, result);
        }
        return true;
    });
}

export function generateItemHighlight(item, showPins, strokeColor, fillColor, shadowTransform) {
    const shape = Shape.find(item.shape);
    if (!shape) {
        return;
    }

    const path = shape.computeOutline(item);
    if (!path) {
        return;
    }

    const m = itemCompleteTransform(item, shadowTransform);
    const scalingVector = worldScalingVectorOnItem(item, shadowTransform);

    let scalingFactor = Math.max(scalingVector.x, scalingVector.y);
    if (myMath.tooSmall(scalingFactor)) {
        scalingFactor = 1;
    }

    let strokeSize = 6;
    if (item.shape === 'path') {
        strokeSize = item.shapeProps.strokeSize;
    } else {
        const shape = Shape.find(item.shape);
        if (Shape.getShapePropDescriptor(shape, 'strokeSize')) {
            strokeSize = item.shapeProps.strokeSize;
        }
    }
    const itemHighlight = {
        id: item.id,
        transform: `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`,
        path,
        fill: fillColor,
        strokeSize,
        stroke: strokeColor,
        pins: [],
        opacity: 0.5,
        scalingFactor
    };

    if (showPins) {
        itemHighlight.pins = shape.getPins(item);
    }
    return itemHighlight;
}
