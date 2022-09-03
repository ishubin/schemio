/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import map from 'lodash/map';
import find from 'lodash/find';
import indexOf from 'lodash/indexOf';
import {worldPointOnItem} from '../../../../scheme/SchemeContainer';
import myMath from '../../../../myMath';
import { traverseItems } from '../../../../scheme/Item';

export function getTagValueByPrefixKey(tags, keyPrefix, defaultValue) {
    const tag = find(tags, tag => tag.indexOf(keyPrefix) === 0);
    if (tag) {
        return tag.substr(keyPrefix.length);
    }
    return defaultValue;
}



/**
 * Converts curve points to relative coords
 * @param {*} item 
 * @param {*} x0 - x point on root item in world coords
 * @param {*} y0 - y point on root item in world coords
 * @param {*} w - width of root item
 * @param {*} h - height of root item
 */
function convertCurve(item, x0, y0, w, h) {
    const paths = map(item.shapeProps.paths, path => {
        const points = map(path.points, point => {
            const worldPoint = worldPointOnItem(point.x, point.y, item);

            const x = myMath.roundPrecise2(100*(worldPoint.x - x0)/w);
            const y = myMath.roundPrecise2(100*(worldPoint.y - y0)/h);
            if (point.t === 'B') {
                return {
                    t: 'B',
                    x, y,
                    x1: myMath.roundPrecise2(100*point.x1/w),
                    y1: myMath.roundPrecise2(100*point.y1/h),
                    x2: myMath.roundPrecise2(100*point.x2/w),
                    y2: myMath.roundPrecise2(100*point.y2/h),
                };
            } else if (point.t === 'A' || point.t === 'E') {
                return {
                    t: point.t,
                    x, y,
                    x1: myMath.roundPrecise2(100*point.x1/w),
                    y1: myMath.roundPrecise2(100*point.y1/h),
                };
            } else {
                return { t: 'L', x, y };
            }
        });
        return {
            points,
            closed: path.closed
        };
    });

    return {
        type: 'path',
        paths
    };
}

function enrichShapeItemWithArgs(item, shapeConfig) {
    let fillArg = 'fill';
    if (item.shapeProps.fill.type === 'none') {
        fillArg = 'none';
    }

    if (indexOf(item.tags, 'fill-with-stroke') >= 0) {
        fillArg = 'strokeColor';
    } else {
        fillArg = getTagValueByPrefixKey(item.tags, 'fill-arg=', fillArg);
    }

    return {
        ...shapeConfig,
        fillArg, // can be 'none', 'fill', 'strokeColor' or any other args name that is of type 'advanced-color' or 'color'
        strokeSize: item.shapeProps.strokeSize, // this will be used as a multiplier for the user defined strokeSize argument. If set to 0 - that means there is no stroke
    };
}

function convertPrimitive(item, x0, y0, w, h) {
    const p0 = worldPointOnItem(0, 0, item);
    const pw = worldPointOnItem(item.area.w, 0, item);
    const ph = worldPointOnItem(0, item.area.h, item);

    const projectPoint = (x, y) => {
        return {
            x: myMath.roundPrecise2(100 * (x - x0) / w),
            y: myMath.roundPrecise2(100 * (y - y0) / h),
        }
    };
    
    const itemData = {
        type: item.shape,
        projection: {
            p0: projectPoint(p0.x, p0.y),
            pw: projectPoint(pw.x, pw.y),
            ph: projectPoint(ph.x, ph.y),
        }
    };

    if (item.shape === 'rect') {
        itemData.cornerRadiusRatio = {w: 0, h: 0};
        if (item.area.w > 0 && item.area.h > 0) {
            itemData.cornerRadiusRatio.w = myMath.roundPrecise2(100 * item.shapeProps.cornerRadius / item.area.w);
            itemData.cornerRadiusRatio.h = myMath.roundPrecise2(100 * item.shapeProps.cornerRadius / item.area.h);
        }
    }
    return itemData;
}

function isSupportedPrimitive(shape) {
    return shape === 'ellipse' || shape === 'rect';
}

/**
 * Exports specified item to a "raw" shape
 * This is used when shapes are designed in Schemio itself.
 * They are then exported as json.
 * @param {Item} rootItem 
 */
export function convertShapeToStandardCurves(rootItem) {
    if (rootItem.shape !== 'dummy') {
        throw new Error('The root item should be a "dummy" shape');
    }
    
    const shapeConfig = {
        shapeType: 'raw',
        pins: [],
        textSlots: [],
        items: [],
        outlines: []
    };

    const w = rootItem.area.w;
    const h = rootItem.area.h;
    
    if (Math.abs(w) < 0.01 || Math.abs(h) < 0.01) {
        throw new Error('Root item should have proper area');
    }

    const p0 = worldPointOnItem(0, 0, rootItem);

    // storing text slot names in hashtable so that there are no overlapping names
    const textSlotNames = new Set();
    
    traverseItems(rootItem, item => {
        const worldPoint = worldPointOnItem(0, 0, item);

        if (item.tags && indexOf(item.tags, 'outline') >= 0) {
            if (item.shape === 'path') {
                shapeConfig.outlines = shapeConfig.outlines.concat(convertCurve(item, p0.x, p0.y, w, h));
            } else if (isSupportedPrimitive(item.shape)) {
                shapeConfig.outlines = shapeConfig.outlines.concat(convertPrimitive(item, p0.x, p0.y, w, h));
            }
        } else if (item.shape === 'path') {
            shapeConfig.items.push(enrichShapeItemWithArgs(item, convertCurve(item, p0.x, p0.y, w, h)));
        } else if (isSupportedPrimitive(item.shape)) {
            shapeConfig.items.push(enrichShapeItemWithArgs(item, convertPrimitive(item, p0.x, p0.y, w, h)));
        } else if (indexOf(item.tags, 'pin') >= 0) {
            const center = worldPointOnItem(item.area.w/2, item.area.h/2, item);
            const pin = {
                x: myMath.roundPrecise2(100 * (center.x - p0.x) / w),
                y: myMath.roundPrecise2(100 * (center.y - p0.y) / h),
            };
            if (indexOf(item.tags, 'pin-no-normal') < 0) {
                pin.nx = myMath.roundPrecise(Math.cos((item.area.r - 90) * Math.PI / 180), 4);
                pin.ny = myMath.roundPrecise(Math.sin((item.area.r - 90) * Math.PI / 180), 4);
            }
            shapeConfig.pins.push(pin);
        } else if (item.shape === 'none' && indexOf(item.tags, 'text-slot') >= 0) {
            if (!textSlotNames.has(item.name)) {
                textSlotNames.add(item.name);

                shapeConfig.textSlots.push({
                    name: item.name,
                    area: {
                        x: myMath.roundPrecise2(100 * (worldPoint.x - p0.x) / w),
                        y: myMath.roundPrecise2(100 * (worldPoint.y - p0.y) / h),
                        w: myMath.roundPrecise2(100 * item.area.w / w),
                        h: myMath.roundPrecise2(100 * item.area.h / h),
                    }
                })
            }
        }
    });

    return {
        shapeConfig
    };
}