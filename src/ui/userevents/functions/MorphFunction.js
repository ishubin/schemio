/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { playInAnimationRegistry } from "../../animations/AnimationRegistry";
import ValueAnimation from "../../animations/ValueAnimation";
import { forEachObject } from "../../collections";
import { encodeColor, parseColor } from "../../colors";
import EditorEventBus from "../../components/editor/EditorEventBus";
import Shape from '../../components/editor/items/shapes/Shape';
import { convertCurvePointToItemScale, convertCurvePointToRelative } from "../../components/editor/items/shapes/StandardCurves";
import { localPointOnItem, worldPointOnItem } from "../../scheme/SchemeContainer";

export default {
    name: 'Morph',

    description: 'Morphs item into a destination item',
    args: {
        referenceItem    : {name: 'Reference Item',  type: 'element', value: null, description: 'The item to which it should morph'},
        alignItems       : {name: 'Align items', type: 'boolean', value: false, description: 'Aligns item position with reference item'},
        recursive        : {name: 'Morph child items', type: 'boolean', value: true,
            description: 'Identify items with the same name and hierarchy and apply morphing to them as well'
        },
        animationDuration: {name: 'Animation duration (sec)', type: 'number', value: 0.5 },
        transition       : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce']},
        inBackground     : {name: 'In Background', type: 'boolean', value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    /**
     * @param {Object} args
     * @param {SchemeContainer} schemeContainer
     * @returns {String}
     */
    argsToShortString(args, schemeContainer) {
        if (args.referenceItem) {
            const refItem = schemeContainer.findFirstElementBySelector(args.referenceItem);
            if (refItem) {
                return refItem.name;
            }
        }
        return '...';
    },

    /**
     * @param {Item} item
     * @param {Object} args
     * @param {SchemeContainer} schemeContainer
     * @param {*} userEventBus
     * @param {function()} resultCallback
     */
    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        const referenceItem = schemeContainer.findFirstElementBySelector(args.referenceItem);
        if (!referenceItem) {
            resultCallback();
            return;
        }
        if (args.inBackground) {
            resultCallback();
        }

        let itemMorphers = [createItemMorpher(item, null, referenceItem, null, schemeContainer.editorId, args)];

        if (args.recursive && Array.isArray(item.childItems) && Array.isArray(referenceItem.childItems)) {
            itemMorphers = itemMorphers.concat(createChildItemsMorphers(item.childItems, item, referenceItem.childItems, referenceItem, schemeContainer.editorId, args));
        }

        const animation = new ValueAnimation({
            durationMillis: args.animationDuration * 1000,
            animationType: args.transition,
            init() {},

            update(t) {
                itemMorphers.forEach(morpher => {
                    morpher(t);
                });
            },
            destroy() {
                if (!args.inBackground) {
                    resultCallback();
                }
            }
        });
        playInAnimationRegistry(schemeContainer.editorId, animation, item.id, this.name);
    }
};

/**
 *
 * @param {Array<Item>} srcItems
 * @param {Item} baseItem
 * @param {Array<Item>} dstItems
 * @param {Item} refBaseItem
 * @param {String} editorId
 * @param {Object} args
 * @returns {Array<function(number)>}
 */
function createChildItemsMorphers(srcItems, baseItem, dstItems, refBaseItem, editorId, args) {
    const srcItemNameCounter = new Map();
    const srcItemNameMapping = new Map();
    srcItems.forEach(item => {
        const counter = srcItemNameCounter.has(item.name) ?  srcItemNameCounter.get(item.name) + 1 : 1;
        srcItemNameCounter.set(item.name, counter);
        srcItemNameMapping.set(item.name + '-' + counter, item);
    });

    const dstItemNameCounter = new Map();
    const dstItemNameMapping = new Map();
    dstItems.forEach(item => {
        const counter = dstItemNameCounter.has(item.name) ?  dstItemNameCounter.get(item.name) + 1 : 1;
        dstItemNameCounter.set(item.name, counter);
        dstItemNameMapping.set(item.name + '-' + counter, item);
    });

    let morphers = [];

    srcItemNameMapping.forEach((item, itemName) => {
        if (!dstItemNameMapping.has(itemName)) {
            return;
        }
        const dstItem = dstItemNameMapping.get(itemName);
        morphers.push(createItemMorpher(item, baseItem, dstItem, refBaseItem, editorId, args));
        if (Array.isArray(item.childItems) && Array.isArray(dstItem.childItems)) {
            morphers = morphers.concat(createChildItemsMorphers(item.childItems, baseItem, dstItem.childItems, refBaseItem, editorId, args));
        }
    });
    return morphers;
}

/**
 * @param {Item} item
 * @param {Item|undefined} baseItem
 * @param {Item|undefined} refItem
 * @param {Item} refBaseItem
 * @param {String} editorId
 * @param {Object} args
 */
function createItemMorpher(item, baseItem, refItem, refBaseItem, editorId, args) {

    const srcShape = Shape.find(item.shape);
    const dstShape = Shape.find(refItem.shape);
    if (!srcShape || !dstShape) {
        return () => {};
    }

    const srcArgs = Shape.getShapeArgs(srcShape);
    const dstArgs = Shape.getShapeArgs(dstShape);

    const propMorphers = [];
    forEachObject(srcArgs, (arg, argName) => {
        if (!dstArgs.hasOwnProperty(argName) || dstArgs[argName].type !== arg.type) {
            return;
        }
        const shapeMorpher = createShapePropsMorpher(item, refItem, argName, arg);
        if (shapeMorpher) {
            propMorphers.push(shapeMorpher);
        }
    });

    propMorphers.push(createValueMorpher(item.opacity, refItem.opacity, (value) => item.opacity = value));
    propMorphers.push(createValueMorpher(item.selfOpacity, refItem.selfOpacity, (value) => item.selfOpacity = value));

    if (item.shape === 'path' && refItem.shape === 'path') {
        propMorphers.push(createPathMorpher(item, baseItem, refItem, refBaseItem));
    }

    if (item.shape !== 'path' && (baseItem && refBaseItem || args.alignItems)) {
        propMorphers.push(createValueMorpher(item.area.w, refItem.area.w, value => item.area.w = value));
        propMorphers.push(createValueMorpher(item.area.h, refItem.area.h, value => item.area.h = value));
        propMorphers.push(createValueMorpher(item.area.x, refItem.area.x, (value) => item.area.x = value));
        propMorphers.push(createValueMorpher(item.area.y, refItem.area.y, (value) => item.area.y = value));
        propMorphers.push(createValueMorpher(item.area.r, refItem.area.r, (value) => item.area.r = value));
    }

    return (t) => {
        propMorphers.forEach(morpher => morpher(t));
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
    };
}


const zeroTransformItem = {
    area: {
        x: 0, y: 0, w: 100, h: 100, r: 0, px: 0.5, py: 0.5, sx: 1, sy: 1
    },
    meta: {
        parentId: null,
        ancestorIds: [],
    }
};

/**
 * @param {Item} item
 * @param {Item} baseItem
 * @param {Item} refItem
 * @param {Item} refBaseItem
 */
function createPathMorpher(item, baseItem, refItem, refBaseItem) {
    if (!baseItem) {
        baseItem = zeroTransformItem;
    }
    if (!refBaseItem) {
        refBaseItem = zeroTransformItem;
    }
    const pointMorphers = [];

    refItem.shapeProps.paths.forEach((path, pathIdx) => {
        if (pathIdx >= item.shapeProps.paths.length) {
            return;
        }

        const srcPath = item.shapeProps.paths[pathIdx];

        path.points.forEach((point, pointIdx) => {
            if (pointIdx >= srcPath.points.length) {
                return;
            }
            pointMorphers.push(createPointMorpher(item, baseItem, refItem, refBaseItem, pathIdx, pointIdx, srcPath.points[pointIdx], point));
        });
    });

    return (t) => {
        pointMorphers.forEach(morpher => morpher(t));
    };
}

/**
 *
 * @param {Item} item
 * @param {Item} baseItem
 * @param {Item} refItem
 * @param {Item} refBaseItem
 * @param {Number} pathIdx
 * @param {Number} pointIdx
 * @param {SchemioPathPoint} srcPoint
 * @param {SchemioPathPoint} dstPoint
 */
function createPointMorpher(item, baseItem, refItem, refBaseItem, pathIdx, pointIdx, srcPoint, dstPoint) {
    const srcBasePoint = pathPointRelativeToAnotherItem(item, srcPoint, baseItem);
    const dstBasePoint = pathPointRelativeToAnotherItem(refItem, dstPoint, refBaseItem);
    return (t) => {
        const rx = srcBasePoint.x * (1 - t) + dstBasePoint.x * t;
        const ry = srcBasePoint.y * (1 - t) + dstBasePoint.y * t;

        const wp = worldPointOnItem(rx, ry, baseItem);
        const lp = localPointOnItem(wp.x, wp.y, item);

        lp.t = srcBasePoint.t;
        lp.x1 = srcBasePoint.x1;
        lp.y1 = srcBasePoint.y1;
        lp.x2 = srcBasePoint.x2;
        lp.y2 = srcBasePoint.y2;
        lp.h = srcBasePoint.h;

        if (srcBasePoint.t === 'B' && dstBasePoint.t === 'B') {
            lp.x1 = srcBasePoint.x1 * (1 - t) + dstBasePoint.x1 * t;
            lp.y1 = srcBasePoint.y1 * (1 - t) + dstBasePoint.y1 * t;
            lp.x2 = srcBasePoint.x2 * (1 - t) + dstBasePoint.x2 * t;
            lp.y2 = srcBasePoint.y2 * (1 - t) + dstBasePoint.y2 * t;
        } else if (srcBasePoint.t === 'A' && dstBasePoint.t === 'A') {
            lp.h = srcBasePoint.h * (1 - t) + dstBasePoint.h * t;
        }

        const point = convertCurvePointToRelative(lp, item.area.w, item.area.h);
        item.shapeProps.paths[pathIdx].points[pointIdx].x = point.x;
        item.shapeProps.paths[pathIdx].points[pointIdx].y = point.y;

        if (point.t === 'B') {
            item.shapeProps.paths[pathIdx].points[pointIdx].x1 = point.x1;
            item.shapeProps.paths[pathIdx].points[pointIdx].y1 = point.y1;
            item.shapeProps.paths[pathIdx].points[pointIdx].x2 = point.x2;
            item.shapeProps.paths[pathIdx].points[pointIdx].y2 = point.y2;
        } else if (point.t === 'A') {
            item.shapeProps.paths[pathIdx].points[pointIdx].h = point.h;

        }
    };
}

/**
 *
 * @param {Item} item
 * @param {SchemioPathPoint} point
 * @param {Item} otherItem
 * @returns {SchemioPathPoint}
 */
function pathPointRelativeToAnotherItem(item, point, otherItem) {
    const p = convertCurvePointToItemScale(point, item.area.w, item.area.h);
    const wp = worldPointOnItem(p.x, p.y, item);
    const lp = localPointOnItem(wp.x, wp.y, otherItem);
    lp.t = p.t;

    if (p.t === 'B') {
        const wp1 = worldPointOnItem(p.x + p.x1, p.y + p.y1, item);
        const wp2 = worldPointOnItem(p.x + p.x2, p.y + p.y2, item);
        const lp1 = localPointOnItem(wp1.x, wp1.y, otherItem);
        const lp2 = localPointOnItem(wp2.x, wp2.y, otherItem);

        lp.x1 = lp1.x - lp.x;
        lp.y1 = lp1.y - lp.y;
        lp.x2 = lp2.x - lp.x;
        lp.y2 = lp2.y - lp.y;
    } else if (p.t === 'A') {
        lp.h = p.h;
    }
    return lp;
}


function createValueMorpher(src, dst, callback) {
    return (t) => {
        callback(src * (1 - t) + dst * t);
    };
}

function createShapePropsMorpher(item, refItem, argName, arg) {
    const srcProp = item.shapeProps[argName];
    const dstProp = refItem.shapeProps[argName];
    if (arg.type === 'number') {
        return (t) => {
            item.shapeProps[argName] = srcProp * (1 - t) + dstProp * t;
        };
    } else if (arg.type === 'color') {
        const src = parseColor(srcProp);
        const dst = parseColor(dstProp);
        return (t) => {
            item.shapeProps[argName] = encodeColor({
                r: src.r * (1 - t) + dst.r * t,
                g: src.g * (1 - t) + dst.g * t,
                b: src.b * (1 - t) + dst.b * t,
                a: src.a * (1 - t) + dst.a * t,
            });
        };
    } else if (arg.type === 'advanced-color' && srcProp.type === 'solid' && srcProp.type === dstProp.type) {
        const src = parseColor(srcProp.color);
        const dst = parseColor(dstProp.color);
        return (t) => {
            item.shapeProps[argName] = {
                type: 'solid',
                color: encodeColor({
                    r: src.r * (1 - t) + dst.r * t,
                    g: src.g * (1 - t) + dst.g * t,
                    b: src.b * (1 - t) + dst.b * t,
                    a: src.a * (1 - t) + dst.a * t,
                })
            };
        };
    }

    return null;
}
