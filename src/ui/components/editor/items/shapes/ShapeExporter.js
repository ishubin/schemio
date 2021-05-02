import forEach from 'lodash/forEach';
import map from 'lodash/map';
import indexOf from 'lodash/indexOf';
import {worldPointOnItem} from '../../../../scheme/SchemeContainer';
import myMath from '../../../../myMath';

function traverseItems(rootItem, callback) {
    callback(rootItem);
    forEach(rootItem.childItems, item => {
        traverseItems(item, callback);
    });
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
    const points = map(item.shapeProps.points, point => {
        const x = myMath.roundPrecise2(100*(point.x - x0)/w);
        const y = myMath.roundPrecise2(100*(point.y - y0)/h);
        if (point.t === 'B') {
            return {
                t: 'B',
                x, y,
                x1: myMath.roundPrecise2(100*point.x1/w),
                y1: myMath.roundPrecise2(100*point.y1/h),
                x2: myMath.roundPrecise2(100*point.x2/w),
                y2: myMath.roundPrecise2(100*point.y2/h),
            };
        } else {
            return { t: 'L', x, y };
        }
    });

    return {
        points,
        closed: item.shapeProps.closed
    }
}

/**
 * Exports specified item to a "standard-curves" shape
 * This is used when shapes are designed in Schemio itself.
 * They are then exported as json.
 * @param {Item} rootItem 
 */
export function convertShapeToStandardCurves(rootItem) {
    if (rootItem.shape !== 'dummy') {
        throw new Error('The root item should be a "dummy" shape');
    }
    
    const shapeConfig = {
        shapeType: 'standard-curves',
        scale: 100, // specifies the scale of the points so that they are correctly converted
        pins: [],
        textSlots: [],
        curves: [],
        outlineCurve: {
            points: [],
            closed: true,
            useFill: false,
            useStroke: false,
            strokeFill: false // specifies whether curve should be filled with stroke color
        },
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
        if (item.shape === 'curve') {
            // console.log(item.tags);
            if (item.tags && indexOf(item.tags, 'outline') >= 0) {
                shapeConfig.outlineCurve = convertCurve(item, p0.x, p0.y, w, h);
            } else {
                shapeConfig.curves.push(convertCurve(item, p0.x, p0.y, w, h));
            }
        } else if (indexOf(item.tags, 'pin') >= 0) {
            const center = worldPointOnItem(item.area.w/2, item.area.h/2, item);
            shapeConfig.pins.push({
                x: myMath.roundPrecise2(100 * (center.x - p0.x) / w),
                y: myMath.roundPrecise2(100 * (center.y - p0.y) / h)
            });
        } else if (item.shape === 'none' && indexOf(item.tags, 'text-slot') >= 0) {
            if (!textSlotNames.has(item.name)) {
                textSlotNames.add(item.name);

                shapeConfig.textSlots.push({
                    name: item.name,
                    area: {
                        x: myMath.roundPrecise2(100 * (item.area.x - p0.x) / w),
                        y: myMath.roundPrecise2(100 * (item.area.y - p0.y) / h),
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