/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {map, find, indexOf} from '../../../../collections';
import {localPointOnItem, localPointOnItemToLocalPointOnOtherItem, worldPointOnItem} from '../../../../scheme/ItemMath';
import myMath from '../../../../myMath';
import { defaultTextSlotProps, traverseItems } from '../../../../scheme/Item';
import { convertCurvePointToItemScale, convertCurvePointToRelative } from './StandardCurves';
import { defaultifyObject } from '../../../../../defaultify';


const DesignerShapes = {
    Group    : 'ext:group:shape_designer',
    Container: 'ext:container:shape_designer',
    Pin      : 'ext:pin:shape_designer',
    TextSlot : 'ext:textslot:shape_designer',
    Rect     : 'ext:rect:shape_designer',
    Ellipse  : 'ext:ellipse:shape_designer',
};

export function getTagValueByPrefixKey(tags, keyPrefix, defaultValue) {
    const tag = find(tags, tag => tag.indexOf(keyPrefix) === 0);
    if (tag) {
        return tag.substr(keyPrefix.length);
    }
    return defaultValue;
}

/**
 * @param {Item} containerItem
 * @param {Item} item
 * @returns {ShapePrimitive}
 */
function convertPathPrimitive(containerItem, item) {
    const paths = map(item.shapeProps.paths, path => {
        const points = map(path.points, relativePoint => {
            const p = convertCurvePointToItemScale(relativePoint, item.area.w, item.area.h);
            const worldPoint = worldPointOnItem(p.x, p.y, item);

            const lp = localPointOnItem(worldPoint.x, worldPoint.y, containerItem);

            const localPointInRoot = {
                ...p,
                x: lp.x,
                y: lp.y
            };

            if (p.t === 'B') {
                const wp1 = worldPointOnItem(p.x + p.x1, p.y + p.y1, item);
                const wp2 = worldPointOnItem(p.x + p.x2, p.y + p.y2, item);
                localPointInRoot.x1 = wp1.x - worldPoint.x;
                localPointInRoot.y1 = wp1.y - worldPoint.y;
                localPointInRoot.x2 = wp2.x - worldPoint.x;
                localPointInRoot.y2 = wp2.y - worldPoint.y;
            }

            return convertCurvePointToRelative(localPointInRoot, containerItem.area.w, containerItem.area.h);
        });
        return {
            points,
            closed: path.closed
        };
    });

    return {
        type: 'path',
        transformType: 'relative',
        paths
    };
}

/**
 *
 * @param {Item} item
 * @param {ShapePrimitive} primitive
 * @returns
 */
function enrichShapeItemWithArgs(item, primitive) {
    const args = {
        strokeColor: {'$-expr': 'args.strokeColor'},
        strokeSize: {'$-expr': `${item.shapeProps.strokeSize}*args.strokeSize`},
        strokePattern: {'$-expr': 'args.strokePattern'}
    };
    if (item.shapeProps.fill.type === 'none') {
        args.fill = {type: 'none'};
    } else if (item.shapeProps.strokeFill || indexOf(item.tags, 'stroke-fill') >= 0) {
        args.fill = {type: 'solid', color: {'$-expr': 'args.strokeColor'}};
    } else {
        args.fill = {'$-expr': 'args.fill'};
    }

    return {
        ...primitive,
        ...args
    };
}


/**
 *
 * @param {Item} containerItem
 * @param {Item} item
 * @returns {ShapePrimitive}
 */
function convertRectPrimitive(containerItem, item) {
    const {w, h} = item.area;
    const worldPoints = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => worldPointOnItem(x, y, item));
    const localPoints = worldPoints.map(p => localPointOnItem(p.x, p.y, containerItem));
    return {
        type: 'path',
        transformType: 'relative',
        paths: [{
            closed: true,
            points: localPoints.map(p => {
                return {
                    t: 'L',
                    x: myMath.roundPrecise2(p.x * 100 / containerItem.area.w),
                    y: myMath.roundPrecise2(p.y * 100 / containerItem.area.h),
                }
            })
        }]
    };
}

function convertRelativeExpression(varName, ratio) {
    if (myMath.tooSmall(ratio)) {
        return 0;
    } else if (myMath.tooSmall(1 - ratio)) {
        return {'$-expr': varName};
    }
    return {'$-expr': `${varName}*${myMath.roundPrecise(ratio, 4)}`};
}


/**
 *
 * @param {Item} containerItem
 * @param {Item} item
 * @returns {ShapePrimitive}
 */
function convertEllipsePrimitive(containerItem, item) {
    const {x, y, w, h} = item.area;

    const widthRatio = w / containerItem.area.w;
    const heightRatio = h / containerItem.area.h;

    let area = null;
    if (item.shapeProps.arcType === 'circle') {
        if (item.shapeProps.align === 'horizontal') {
            const yRatio = myMath.roundPrecise((y + h/2) / containerItem.area.h, 4);
            area = {
                x: convertRelativeExpression('width', x / containerItem.area.w),
                y: {'$-expr': `height * ${yRatio} - width * ${myMath.roundPrecise(widthRatio,4)}/2`},
                w: convertRelativeExpression('width', widthRatio),
                h: convertRelativeExpression('width', widthRatio),
            };
        } else {
            const xRatio = myMath.roundPrecise((x + w/2) / containerItem.area.w, 4);
            area = {
                x: {'$-expr': `width * ${xRatio} - height * ${myMath.roundPrecise(heightRatio,4)}/2`},
                y: convertRelativeExpression('height', y / containerItem.area.h),
                w: convertRelativeExpression('height', heightRatio),
                h: convertRelativeExpression('height', heightRatio),
            };
        }
    } else {
        area = {
            x: convertRelativeExpression('width', x / containerItem.area.w),
            y: convertRelativeExpression('height', y / containerItem.area.h),
            w: convertRelativeExpression('width', widthRatio),
            h: convertRelativeExpression('height', heightRatio),
        };
    }
    return {
        type: 'ellipse',
        area,
    }
}

/**
 *
 * @param {Item} containerItem
 * @param {Item} item
 * @returns {ShapePrimitive}
 */
function convertPrimitive(containerItem, item) {
    if (item.shape === DesignerShapes.Rect) {
        return convertRectPrimitive(containerItem, item);
    } else if (item.shape === DesignerShapes.Ellipse) {
        return convertEllipsePrimitive(containerItem, item);
    }
    throw new Error(`${item.shape} is not supported in user designed shapes`);
}

function isSupportedPrimitive(shape) {
    return shape === DesignerShapes.Rect || shape === DesignerShapes.Ellipse || shape === 'path';
}

/**
 * Converts world point (x, y) to relative shape transform of specified item (the point is represented as percentage of item width or height)
 * @param {Number} x
 * @param {Number} y
 * @param {Item} item
 * @returns {Point} - relative point where "x" represents the percentage of items width and "y" represents percentage of items height
 */
function relativeShapePoint(x, y, item) {
    const lp = localPointOnItem(x, y, item);
    return {
        x: myMath.roundPrecise2(lp.x * 100 / item.area.w),
        y: myMath.roundPrecise2(lp.y * 100 / item.area.h),
    };
}

/**
 * @param {Item} containerItem
 * @param {Item} item
 */
function convertPinItem(containerItem, item) {
    const center = worldPointOnItem(item.area.w/2, item.area.h/2, item);
    const point = relativeShapePoint(center.x, center.y, containerItem);

    const pin = {
        x: {'$-expr': `width * ${myMath.roundPrecise(point.x / 100, 4)}`},
        y: {'$-expr': `height * ${myMath.roundPrecise(point.y / 100, 4)}`},
    }
    if (item.shapeProps.normal) {
        pin.nx = myMath.roundPrecise(Math.cos((item.area.r - 90) * Math.PI / 180), 4);
        pin.ny = myMath.roundPrecise(Math.sin((item.area.r - 90) * Math.PI / 180), 4);
    }
    pin.id = item.name;
    return pin;
}

/**
 * @param {Item} containerItem
 * @param {Item} item
 */
function convertTextSlotItem(containerItem, item) {
    const lp0 = localPointOnItemToLocalPointOnOtherItem(0, 0, item, containerItem);
    const lp1 = localPointOnItemToLocalPointOnOtherItem(item.area.w, 0, item, containerItem);
    const lp2 = localPointOnItemToLocalPointOnOtherItem(0, item.area.h, item, containerItem);

    const wRatio = Math.abs(lp1.x - lp0.x) / containerItem.area.w;
    const hRatio = Math.abs(lp2.y - lp0.y) / containerItem.area.w;

    return {
        name: item.name,
        area: {
            x: {'$-expr': `width * ${myMath.roundPrecise(lp0.x / containerItem.area.w, 4)}`},
            y: {'$-expr': `height * ${myMath.roundPrecise(lp0.y / containerItem.area.h, 4)}`},
            w: {'$-expr': `width * ${myMath.roundPrecise(wRatio, 4)}`},
            h: {'$-expr': `height * ${myMath.roundPrecise(hRatio, 4)}`},
            r: 0
        },
        props: defaultifyObject(item.textSlots.body, defaultTextSlotProps)
    };
}

const defaultBodyTextSlot = {
    name: 'body',
    area: { x: 0, y: 0, w: {"$-expr": "width"}, h: {"$-expr": "height"} }
};

/**
 * Exports specified item to a "templated" shape
 * This is used when shapes are designed in Schemio itself.
 * They are then exported as json.
 * @param {Item} shapeContainerItem
 * @returns {TemplatedShape}
 */
export function convertItemToTemplatedShape(shapeContainerItem) {
    if (shapeContainerItem.shape !== DesignerShapes.Container) {
        throw new Error('The root item should be a "dummy" shape');
    }

    if (!shapeContainerItem.childItems || shapeContainerItem.childItems.length === 0) {
        throw new Error(`There are no items in the "${shapeContainerItem.name}" shape container`);
    }

    const shapeConfig = {
        shapeType: 'templated',
        pins: [],
        textSlots: [],
        primitives: [],
        outlines: [],
    };

    const w = shapeContainerItem.area.w;
    const h = shapeContainerItem.area.h;

    if (Math.abs(w) < 0.01 || Math.abs(h) < 0.01) {
        throw new Error('Root item should have proper area');
    }

    traverseItems(shapeContainerItem.childItems, item => {
        if (item.shapeProps.outline || item.name === 'outline' || (item.tags && indexOf(item.tags, 'outline') >= 0)) {
            if (item.shape === 'path') {
                shapeConfig.outlines = shapeConfig.outlines.concat(convertPathPrimitive(shapeContainerItem, item));
            } else if (isSupportedPrimitive(item.shape)) {
                shapeConfig.outlines = shapeConfig.outlines.concat(convertPrimitive(shapeContainerItem, item));
            }
        } else if (item.shape === 'path') {
            shapeConfig.primitives.push(enrichShapeItemWithArgs(item, convertPathPrimitive(shapeContainerItem, item)));
        } else if (isSupportedPrimitive(item.shape)) {
            shapeConfig.primitives.push(enrichShapeItemWithArgs(item, convertPrimitive(shapeContainerItem, item)));
        } else if (item.shape === DesignerShapes.Pin) {
            shapeConfig.pins.push(convertPinItem(shapeContainerItem, item));
        } else if (item.shape === DesignerShapes.TextSlot) {
            shapeConfig.textSlots.push(convertTextSlotItem(shapeContainerItem, item));
        }
    });

    if (shapeConfig.textSlots.length === 0 && shapeContainerItem.shapeProps.useBodyTextSlot) {
        shapeConfig.textSlots = [defaultBodyTextSlot];
    }

    return {
        shapeConfig: {
            ...shapeConfig,
            includeStandardArgs: true
        }
    };
}