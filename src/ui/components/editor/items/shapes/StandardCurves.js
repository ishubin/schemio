/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {forEach, map} from '../../../../collections';
import AdvancedFill from '../AdvancedFill.vue';
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
 * @param {*} areaWidth - width of item area
 * @param {*} areaHeight - height of item area
 * @param {*} points 
 * @param {*} closed 
 * @returns 
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
            x: point.x * PATH_POINT_CONVERSION_SCALE * W / w,
            y: point.y * PATH_POINT_CONVERSION_SCALE * H / h,
            x1: point.x1 * PATH_POINT_CONVERSION_SCALE * W/ w,
            y1: point.y1 * PATH_POINT_CONVERSION_SCALE * H / h,
            x2: point.x2 * PATH_POINT_CONVERSION_SCALE * W / w,
            y2: point.y2 * PATH_POINT_CONVERSION_SCALE * H / h,
        }
    } else if (point.t === 'A') {
        return {
            t: point.t,
            x: point.x * PATH_POINT_CONVERSION_SCALE * W / w,
            y: point.y * PATH_POINT_CONVERSION_SCALE * H / h,
            h: point.h || 50 // this is needed to not generate an error for arcs from previous versions of schemio
        }
    } else {
        return {
            t: 'L',
            x: point.x * PATH_POINT_CONVERSION_SCALE * W / w,
            y: point.y * PATH_POINT_CONVERSION_SCALE * H / h,
        }
    }
}

export function convertCurvePointToItemScale(point, w, h) {
    if (point.t === 'B') {
        return {
            t: point.t,
            x: w * point.x / PATH_POINT_CONVERSION_SCALE,
            y: h * point.y / PATH_POINT_CONVERSION_SCALE,
            x1: w * point.x1 / PATH_POINT_CONVERSION_SCALE,
            y1: h * point.y1 / PATH_POINT_CONVERSION_SCALE,
            x2: w * point.x2 / PATH_POINT_CONVERSION_SCALE,
            y2: h * point.y2 / PATH_POINT_CONVERSION_SCALE,
        }
    } else if (point.t === 'A') {
        return {
            t: point.t,
            x: w * point.x / PATH_POINT_CONVERSION_SCALE,
            y: h * point.y / PATH_POINT_CONVERSION_SCALE,
            h: point.h
        }
    } else {
        return {
            t: 'L',
            x: w * point.x / PATH_POINT_CONVERSION_SCALE,
            y: h * point.y / PATH_POINT_CONVERSION_SCALE,
        }
    }
}

function createComputeOutlineFunc(shapeConfig) {
    return (item) => {
        if (shapeConfig.outlines && shapeConfig.outlines.length > 0) {
            let svgPath = '';

            forEach(shapeConfig.outlines, outlineDef => {
                const outlinePath = convertRawShapeToSvgPath(item, outlineDef);
                if (outlinePath) {
                    svgPath += outlinePath;
                }
            });
            return svgPath;
        } else {
            const w = item.area.w;
            const h = item.area.h;
            return `M  0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
        }
    };
}

/**
 *
 * @param {Item} item
 * @param {Array<SchemioPath>} paths
 * @returns
 */
export function convertRawPathShapeForRender(item, paths) {
    let svgPath = '';
    forEach(paths, pathDef => {
        const svgSegmentPath = computeCurvePath(item.area.w, item.area.h, pathDef.points, pathDef.closed);
        svgPath += svgSegmentPath + ' ';
    });

    return svgPath;
}

function projectPointToItemArea(x, y, item) {
    return {
        x: x * item.area.w / 100,
        y: y * item.area.h / 100
    };
}

function convertRawEllipseShapeForRender(item, itemDef) {
    const {p0, pw, ph} = itemDef.projection;

    const pLeftX = (ph.x - p0.x) / 2 + p0.x;
    const pLeftY = (ph.y - p0.y) / 2 + p0.y;
    const pRightX  = (ph.x - p0.x) / 2 + pw.x;
    const pRightY  = (ph.y - p0.y) / 2 + pw.y;

    const Pl = projectPointToItemArea(pLeftX, pLeftY, item);
    const Pr = projectPointToItemArea(pRightX, pRightY, item);

    const Po = projectPointToItemArea(p0.x, p0.y, item);
    const Pw = projectPointToItemArea(pw.x, pw.y, item);
    const Ph = projectPointToItemArea(ph.x, ph.y, item);

    const rx = myMath.distanceBetweenPoints(Pw.x, Pw.y, Po.x, Po.y) / 2;
    const ry = myMath.distanceBetweenPoints(Ph.x, Ph.y, Po.x, Po.y) / 2;
    return `M ${Pl.x} ${Pl.y} A ${rx} ${ry} 0 1 1 ${Pr.x} ${Pr.y}  A ${rx} ${ry} 0 1 1 ${Pl.x} ${Pl.y} Z`;
}

function convertRawRectShapeForRender(item, itemDef) {

    /*
        Vw
        --->
    Po                           Pw
    *    P1-----------------P2  *
       /                      \
      /                        \
    P0                         P3
    |          RECT             |      |
    |                           |      | Vh
    P7                         P4      V
     \                          /
      \                        /
    *  P6--------------------P5 *
   Ph                            Pwh

    */

    const {p0, pw, ph} = itemDef.projection;

    const Po = projectPointToItemArea(p0.x, p0.y, item);
    const Pw = projectPointToItemArea(pw.x, pw.y, item);
    const Ph = projectPointToItemArea(ph.x, ph.y, item);

    const w = myMath.distanceBetweenPoints(Pw.x, Pw.y, Po.x, Po.y);
    const h = myMath.distanceBetweenPoints(Ph.x, Ph.y, Po.x, Po.y);

    const R = Math.min(itemDef.cornerRadiusRatio.w * w, itemDef.cornerRadiusRatio.h * h, w/2, h/2);
    const Vw = myMath.normalizedVector(Pw.x - Po.x, Pw.y - Po.y);
    const Vh = myMath.normalizedVector(Ph.x - Po.x, Ph.y - Po.y);

    if (!Vw || !Vh) {
        return '';
    }

    Vw.x = Vw.x * R;
    Vw.y = Vw.y * R;

    Vh.x = Vh.x * R;
    Vh.y = Vh.y * R;

    const Pwh =  myMath.vectorMinusVector(myMath.vectorPlusVector(Pw, Ph), Po);

    const points = [
        myMath.vectorPlusVector(Po, Vh),
        myMath.vectorPlusVector(Po, Vw),
        myMath.vectorMinusVector(Pw, Vw),
        myMath.vectorPlusVector(Pw, Vh),
        myMath.vectorMinusVector(Pwh, Vh),
        myMath.vectorMinusVector(Pwh, Vw),
        myMath.vectorPlusVector(Ph, Vw),
        myMath.vectorMinusVector(Ph, Vh),
    ];

    const arc = (point) => {
        return ` A ${R} ${R} 0 0 1 ${point.x} ${point.y}`;
    }
    const line = (point) => {
        return ` L ${point.x} ${point.y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        if (i % 2 === 0) {
            path += line(points[i]);
        } else {
            path += arc(points[i]);
        }
    }
    return path + line(points[0]) + ' Z';
}

function convertRawShapeToSvgPath(item, itemDef) {
    if (itemDef.type === 'path') {
        return convertRawPathShapeForRender(item, itemDef.paths);
    } else if (itemDef.type === 'ellipse') {
        return convertRawEllipseShapeForRender(item, itemDef);
    } else if (itemDef.type === 'rect') {
        return convertRawRectShapeForRender(item, itemDef);
    } else {
        console.error('Uknown raw shape type: ' + itemDef.type);
        return null;
    }
}

/**
 *
 * @param {Item} item
 * @param {*} itemDef
 * @returns {StandardCurvePath}
 */
function convertRawShapeForRender(item, itemDef) {
    const svgPath = convertRawShapeToSvgPath(item, itemDef);
    if (!svgPath) {
        return null;
    }

    let fill = 'none';
    if (itemDef.fillArg === 'fill') {
        fill = AdvancedFill.computeStandardFill(item);
    } else if (itemDef.fillArg === 'none') {
        fill = 'none';
    } else if (itemDef.fillArg) {
        const otherFill = item.shapeProps[itemDef.fillArg];
        // for now advanced-color is not supported
        if (typeof otherFill === 'string') {
            fill = otherFill;
        }
    }

    return {
        path: svgPath,
        fill,
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: myMath.roundPrecise2(item.shapeProps.strokeSize * itemDef.strokeSize)
    };
}

/**
 *
 * @param {*} shapeConfig
 * @returns {function(): Array<StandardCurvePath>}
 */
function createComputeCurvesFunc(shapeConfig) {
    return (item) => {
        if (shapeConfig.items) {
            const computedPaths = [];
            forEach(shapeConfig.items, itemDef => {
                const p = convertRawShapeForRender(item, itemDef)
                if (p) {
                    computedPaths.push(p);
                }
            });
            return computedPaths;
        }
        return [];
    }
}

function createGetPinsFunc(shapeConfig) {
    return (item) => {
        if (shapeConfig.pins) {
            const w = item.area.w;
            const h = item.area.h;
            const pins = {};
            forEach(shapeConfig.pins, (pin, pinId) => {
                const calculatedPin = {
                    x: pin.x * w / 100,
                    y: pin.y * h / 100,
                };

                if (pin.hasOwnProperty('nx') && pin.hasOwnProperty('ny')) {
                    calculatedPin.nx = pin.nx;
                    calculatedPin.ny = pin.ny;
                }
                pins['p' + pinId] = calculatedPin;
            });
            return pins;
        } else {
            return {
                c: {
                    x: item.area.w/2,
                    y: item.area.h/2
                }
            };
        }
    };
}

/**
 * Takes shape definition JSON which is generated by shape exporter and converts it into a shape component
 * @param {Object} shapeConfig
 */
export function convertStandardCurveShape(shapeConfig) {
    return {
        shapeConfig: {
            id: shapeConfig.id,

            shapeType: 'standard',

            menuItems: shapeConfig.menuItems,

            computeOutline: createComputeOutlineFunc(shapeConfig),

            // raw do not use computePath function but instead they rely on computeCurves function
            // since each curve might have its own fill and stroke
            computeCurves: createComputeCurvesFunc(shapeConfig),

            getPins: createGetPinsFunc(shapeConfig),

            args: {
                fill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
                strokeColor  : {type: 'color', value: '#111111', name: 'Stroke color'},
                strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
                strokeSize   : {type: 'number', value: 2, name: 'Stroke Size'},
            }
        }
    };
}