/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import map from 'lodash/map';
import forEach from 'lodash/forEach';
import AdvancedFill from '../AdvancedFill.vue';
import myMath from '../../../../myMath';

function round(value) {
    return myMath.roundPrecise2(value);
}


/**
 * Generates SVG arc path based on 3 points of the circle
 * @param {*} x1 
 * @param {*} y1 
 * @param {*} x2 
 * @param {*} y2 
 * @param {*} x3 
 * @param {*} y3 
 */
function connectArc(x1, y1, x2, y2, x3, y3) {
    const x12 = x1 - x2;
    const x13 = x1 - x3;
 
    const y12 = y1 - y2;
    const y13 = y1 - y3;
 
    const y31 = y3 - y1;
    const y21 = y2 - y1;
 
    const x31 = x3 - x1;
    const x21 = x2 - x1;
 
    const sx13 = x1*x1 - x3*x3;
 
    const sy13 = y1*y1 - y3*y3;
 
    const sx21 = x2*x2 - x1*x1;
    const sy21 = y2*y2 - y1*y1;
 
    const f = ((sx13) * (x12) + (sy13) * (x12) + (sx21) * (x13) + (sy21) * (x13)) / (2 * ((y31) * (x12) - (y21) * (x13)));
    const g = ((sx13) * (y12) + (sy13) * (y12) + (sx21) * (y13) + (sy21) * (y13)) / (2 * ((x31) * (y12) - (x21) * (y13)));
 
    const c = -x1*x1 - y1*y1 - 2 * g * x1 - 2 * f * y1;
 
    const cx = -g;
    const cy = -f;
    const rSquared = cx * cx + cy * cy - c;
 
    const xa = x2 - x1;
    const ya = y2 - y1;
    const xb = x3 - x1;
    const yb = y3 - y1;
    const d1 = xa * xa + ya * ya;
    const d2 = xb * xb + yb * yb;
    if (d2 > 0.01 && d1 > 0.01 && rSquared > 0 && rSquared !== Infinity) {
        const r = Math.sqrt(rSquared);

        let sweepFlag = 1;
        const sina = (xa*yb - ya*xb)/ (Math.sqrt(d1) * Math.sqrt(d2));
        if (sina < 0) {
            sweepFlag = 0;
        }

        let largeArcFlag = 0;

        const line = myMath.createLineEquation(x1, y1, x3, y3);
        const side1 = myMath.identifyPointSideAgainstLine(cx, cy, line);
        const side2 = myMath.identifyPointSideAgainstLine(x2, y2, line);
        if (side1 === side2) {
            largeArcFlag = 1;
        }

        return `A ${round(r)} ${round(r)} 0 ${largeArcFlag} ${sweepFlag} ${round(x3)} ${round(y3)}`;
    }

    return `L ${round(x3)} ${round(y3)} `;
}

function connectPoints(p1, p2) {
    if (p1.t === 'A') {
        return connectArc(p1.x, p1.y, p1.x + p1.x1, p1.y + p1.y1, p2.x, p2.y);
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

export function computeCurvePath(points, closed) {
    if (points.length < 2) {
        return null;
    }
    let path = '';

    let prevPoint = null;

    forEach(points, point => {
        if (!prevPoint) {
            path += `M ${round(point.x)} ${round(point.y)} `;
        } else  {
            path += connectPoints(prevPoint, point);
        }
        prevPoint = point;
    });

    if (closed && points.length) {
        path += connectPoints(points[points.length - 1], points[0]);
        path += ' Z';
    }

    return path;
};

function convertCurvePointsToItemScale(area, scale, points) {
    return map(points, point => {
        if (point.t === 'B') {
            return {
                t: 'B',
                x: area.w * point.x / scale,
                y: area.h * point.y / scale,
                x1: area.w * point.x1 / scale,
                y1: area.h * point.y1 / scale,
                x2: area.w * point.x2 / scale,
                y2: area.h * point.y2 / scale,
            }
        } else if (point.t === 'A') {
            return {
                t: 'A',
                x: area.w * point.x / scale,
                y: area.h * point.y / scale,
                x1: area.w * point.x1 / scale,
                y1: area.h * point.y1 / scale,
            }
        } else {
            return {
                t: 'L',
                x: area.w * point.x / scale,
                y: area.h * point.y / scale,
            }
        }
    });
}

function createComputeOutlineFunc(shapeConfig) {
    return (item) => {
        if (shapeConfig.outlines && shapeConfig.outlines.length > 0) {
            let svgPath = '';

            forEach(shapeConfig.outlines, outlineDef => {
                const outlinePath = convertRawShapeToSvgPath(item, shapeConfig, outlineDef);
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

function convertRawPathShapeForRender(item, shapeConfig, itemDef) {
    let svgPath = '';
    forEach(itemDef.paths, pathDef => {
        const points = convertCurvePointsToItemScale(item.area, shapeConfig.scale, pathDef.points);
        const svgSegmentPath = computeCurvePath(points, pathDef.closed);
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

function convertRawEllipseShapeForRender(item, shapeConfig, itemDef) {
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

function convertRawRectShapeForRender(item, shapeConfig, itemDef) {

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

function convertRawShapeToSvgPath(item, shapeConfig, itemDef) {
    if (itemDef.type === 'path') {
        return convertRawPathShapeForRender(item, shapeConfig, itemDef);
    } else if (itemDef.type === 'ellipse') {
        return convertRawEllipseShapeForRender(item, shapeConfig, itemDef);
    } else if (itemDef.type === 'rect') {
        return convertRawRectShapeForRender(item, shapeConfig, itemDef);
    } else {
        console.error('Uknown raw shape type: ' + itemDef.type);
        return null;
    }
}

export function convertRawShapeForRender(item, shapeConfig, itemDef) {
    const svgPath = convertRawShapeToSvgPath(item, shapeConfig, itemDef);
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

function createComputeCurvesFunc(shapeConfig) {
    return (item) => {
        if (shapeConfig.items) {
            const computedPaths = [];
            forEach(shapeConfig.items, itemDef => {
                const p = convertRawShapeForRender(item, shapeConfig, itemDef)
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
            return map(shapeConfig.pins, pin => {
                const calculatedPin = {
                    x: pin.x * w / shapeConfig.scale, 
                    y: pin.y * h / shapeConfig.scale, 
                };

                if (pin.hasOwnProperty('nx') && pin.hasOwnProperty('ny')) {
                    calculatedPin.nx = pin.nx;
                    calculatedPin.ny = pin.ny;
                }
                return calculatedPin;
            });
        } else {
            return [{
                x: item.area.w/2,
                y: item.area.h/2
            }];
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