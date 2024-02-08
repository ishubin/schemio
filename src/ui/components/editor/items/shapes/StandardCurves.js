/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {forEach} from '../../../../collections';
import myMath from '../../../../myMath';

function round(value) {
    return myMath.roundPrecise2(value);
}

export const PATH_POINT_CONVERSION_SCALE = 100;


function connectArc(x1, y1, x2, y2, h) {
    const L = myMath.distanceBetweenPoints(x1, y1, x2, y2);
    const H = L * h / 100;

    if (myMath.tooSmall(H) || myMath.tooSmall(L)) {
        return `L ${round(x2)} ${round(y2)} `;
    }

    const r = Math.abs(H / 2 + L * L / (8 * H));
    let largeArcFlag = Math.abs(H) > L / 2 ? 1: 0;
    let sweepFlag = h > 0? 1 : 0;
    return `A ${round(r)} ${round(r)} 0 ${largeArcFlag} ${sweepFlag} ${round(x2)} ${round(y2)}`;
}

function connectPoints(p1, p2) {
    if (p1.t === 'A') {
        return connectArc(p1.x, p1.y, p2.x, p2.y, p1.h);
    }
    else if (p1.t === 'L' && p2.t === 'B') {
        return `Q ${round(p2.x1+p2.x)} ${round(p2.y1+p2.y)} ${round(p2.x)} ${round(p2.y)} `;
    } else if (p1.t === 'B' && p2.t !== 'B') {
        return `Q ${round(p1.x2+p1.x)} ${round(p1.y2+p1.y)} ${round(p2.x)} ${round(p2.y)} `;
    } else if (p1.t === 'B' && p2.t === 'B') {
        return `C ${round(p1.x2+p1.x)} ${round(p1.y2+p1.y)} ${round(p2.x1+p2.x)} ${round(p2.y1+p2.y)} ${round(p2.x)} ${round(p2.y)} `;
    }
    return `L ${round(p2.x)} ${round(p2.y)} `;
}

/**
 * Computes a SVG path for given points and item area. All points should be relative to item width and height.
 * @param {Number} areaWidth - width of item area
 * @param {Number} areaHeight - height of item area
 * @param {Array<SchemioPathPoint} points
 * @param {Boolean} closed
 * @returns {Strign} svg path
 */
export function computeCurvePath(areaWidth, areaHeight, points, closed) {
    if (points.length < 2) {
        return null;
    }
    let path = '';

    let prevPoint = null;
    let firstPoint = null;
    forEach(points, rawPoint => {
        const point = convertCurvePointToItemScale(rawPoint, areaWidth, areaHeight);
        if (!firstPoint) {
            firstPoint = point;
        }
        if (!prevPoint) {
            path += `M ${round(point.x)} ${round(point.y)} `;
        } else  {
            path += connectPoints(prevPoint, point);
        }
        prevPoint = point;
    });

    if (closed && prevPoint && firstPoint) {
        path += connectPoints(prevPoint, firstPoint);
        path += ' Z';
    }

    return path;
};

/**
 *
 * @param {SchemioPathPoint} point
 * @param {Number} w
 * @param {Number} h
 * @returns
 */
export function convertCurvePointToRelative(point, w, h) {
    let W = 1, H = 1;
    if (myMath.tooSmall(w)) {
        w = 1;
        W = 0;
    }
    if (myMath.tooSmall(h)) {
        h = 1;
        H = 0;
    }
    if (point.t === 'B') {
        return {
            t: 'B',
            x: myMath.roundPrecise2(point.x * PATH_POINT_CONVERSION_SCALE * W / w),
            y: myMath.roundPrecise2(point.y * PATH_POINT_CONVERSION_SCALE * H / h),
            x1: myMath.roundPrecise2(point.x1 * PATH_POINT_CONVERSION_SCALE * W/ w),
            y1: myMath.roundPrecise2(point.y1 * PATH_POINT_CONVERSION_SCALE * H / h),
            x2: myMath.roundPrecise2(point.x2 * PATH_POINT_CONVERSION_SCALE * W / w),
            y2: myMath.roundPrecise2(point.y2 * PATH_POINT_CONVERSION_SCALE * H / h),
        }
    } else if (point.t === 'A') {
        return {
            t: point.t,
            x: myMath.roundPrecise2(point.x * PATH_POINT_CONVERSION_SCALE * W / w),
            y: myMath.roundPrecise2(point.y * PATH_POINT_CONVERSION_SCALE * H / h),
            h: point.h || 50 // this is needed to not generate an error for arcs from previous versions of schemio
        }
    } else {
        return {
            t: 'L',
            x: myMath.roundPrecise2(point.x * PATH_POINT_CONVERSION_SCALE * W / w),
            y: myMath.roundPrecise2(point.y * PATH_POINT_CONVERSION_SCALE * H / h),
        }
    }
}

export function convertCurvePointToItemScale(point, w, h) {
    if (point.t === 'B') {
        return {
            t: point.t,
            x: myMath.roundPrecise2(w * point.x / PATH_POINT_CONVERSION_SCALE),
            y: myMath.roundPrecise2(h * point.y / PATH_POINT_CONVERSION_SCALE),
            x1: myMath.roundPrecise2(w * point.x1 / PATH_POINT_CONVERSION_SCALE),
            y1: myMath.roundPrecise2(h * point.y1 / PATH_POINT_CONVERSION_SCALE),
            x2: myMath.roundPrecise2(w * point.x2 / PATH_POINT_CONVERSION_SCALE),
            y2: myMath.roundPrecise2(h * point.y2 / PATH_POINT_CONVERSION_SCALE),
        }
    } else if (point.t === 'A') {
        return {
            t: point.t,
            x: myMath.roundPrecise2(w * point.x / PATH_POINT_CONVERSION_SCALE),
            y: myMath.roundPrecise2(h * point.y / PATH_POINT_CONVERSION_SCALE),
            h: point.h
        }
    } else {
        return {
            t: 'L',
            x: myMath.roundPrecise2(w * point.x / PATH_POINT_CONVERSION_SCALE),
            y: myMath.roundPrecise2(h * point.y / PATH_POINT_CONVERSION_SCALE),
        }
    }
}

/**
 *
 * @param {Item} item
 * @param {ShapePrimitive} primitive
 * @returns {String} svg path
 */
function convertRawPathShapeForRender(item, primitive) {
    if (!Array.isArray(primitive.paths)) {
        return null;
    }

    let paths = primitive.paths;
    if (primitive.transformType === 'absolute') {
        paths = primitive.paths.map(path => {
            return {
                closed: path.closed,
                id: path.id,
                points: path.points.map(point => convertCurvePointToRelative(point, item.area.w, item.area.h))
            };
        })
    }
    let svgPath = '';
    forEach(paths, pathDef => {
        const svgSegmentPath = computeCurvePath(item.area.w, item.area.h, pathDef.points, pathDef.closed);
        svgPath += svgSegmentPath + ' ';
    });

    return svgPath;
}

/**
 *
 * @param {Item} item
 * @param {ShapePrimitive} primitive
 * @returns {String} svg path for ellipse primitive
 */
function convertRawEllipseShapeForRender(item, primitive) {
    if (!primitive.area) {
        return null;
    }

    const {x, y, w, h} = primitive.area;
    const rx = w / 2;
    const ry = h / 2;
    return `M ${x} ${y + ry} A ${rx} ${ry} 0 1 1 ${x+w} ${y+ry}  A ${rx} ${ry} 0 1 1 ${x} ${y+ry} Z`;
}



/**
 * Converts shape primitive for specified item to SVG Path
 * @param {Item} item
 * @param {ShapePrimitive} primitive
 * @returns {PrimitiveSVGPath}
 */
export function convertShapePrimitiveToSvgPath(item, primitive) {
    if (primitive.type === 'path') {
        return convertRawPathShapeForRender(item, primitive);
    } else if (primitive.type === 'ellipse') {
        return convertRawEllipseShapeForRender(item, primitive);
    } else {
        console.error('Uknown raw shape type: ' + primitive.type);
        return null;
    }
}