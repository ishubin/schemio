/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import './typedef';

const MAX_PATH_DIVISIONS = 20;
const MIN_PATH_DIVISIONS = 8;
const PATH_DIVISION_LENGTH = 40;

const EPSILON = 0.00001;

function tooSmall(value) {
    return Math.abs(value) < EPSILON;
}

/**
 * 
 * @param {*} x1 
 * @param {*} y1 
 * @param {*} x2 
 * @param {*} y2 
 * @returns angle in radians
 */
function angleBetweenVectors(x1, y1, x2, y2) {
    const ds1 = x1*x1 + y1*y1;
    if (!tooSmall(ds1)) {
        const ds2 = x2*x2 + y2*y2;
        if (!tooSmall(ds2)) {
            const d1 = Math.sqrt(ds1);
            const d2 = Math.sqrt(ds2);
            return Math.asin((x1*y2 - y1*x2) / (d1*d2));
        }
    }
    return 0;
}

function cosineAngleBetweenVectors(x1, y1, x2, y2) {
    const ds1 = x1*x1 + y1*y1;
    if (ds1 > 0.001) {
        const ds2 = x2*x2 + y2*y2;
        if (ds2 > 0.001) {
            const d1 = Math.sqrt(ds1);
            const d2 = Math.sqrt(ds2);
            return Math.acos((x1*x2 + y1*y2) / (d1*d2));
        }
    }
    return 0;
}

function fullAngleForVector(x, y) {
    const dSquared = x * x + y * y;
    if (!tooSmall(dSquared)) {
        const d = Math.sqrt(dSquared);
        return fullAngleForNormalizedVector(x/d, y/d);
    }
    return 0;
}

function fullAngleForNormalizedVector(x, y) {
    if (y >= 0) {
        return Math.acos(x);
    } else {
        return -Math.acos(x);
    }
}

/**
 * Generates line equation in form of ax + by + c = 0 which intersects given two points
 * returns an object with a, b, c parameters
 * @param {*} x1 
 * @param {*} y1 
 * @param {*} x2 
 * @param {*} y2 
 */
function createLineEquation(x1, y1, x2, y2) {
    return {
        a: y1 - y2,
        b: x2 - x1,
        c: x1*y2 - x2*y1
    };
}

/**
 * Calculates distance from given point to a line 
 * @param {Number} x
 * @param {Number} y
 * @param {*} line line equation in form of {a, b, c}
 * @returns {Number} distance from given point to a line
 */
function distanceFromPointToLine(x, y, {a, b, c}) {
    if (tooSmall(a) && tooSmall(b)) {
        return 0;
    }

    return Math.abs(a*x + b*y + c) / Math.sqrt(a*a + b*b);
}

function _simplifyCurvePointsUsingRDP(points, epsilon, idxStart, idxEnd) {
    if (idxEnd - idxStart < 2) {
        return [points[idxStart], points[idxEnd]];
    }

    const line = createLineEquation(points[idxStart].x, points[idxStart].y, points[idxEnd].x, points[idxEnd].y);
    
    let furtherstPointIdx = idxStart + 1;
    let furtherstDistance = 0;

    for (let i = idxStart + 1; i < idxEnd; i++) {
        const d = distanceFromPointToLine(points[i].x, points[i].y, line);

        if (d > furtherstDistance) {
            furtherstDistance = d;
            furtherstPointIdx = i;
        }
    }

    if (furtherstDistance > epsilon) {
        // then we break it into smaller problems

        const pointsA = _simplifyCurvePointsUsingRDP(points, epsilon, idxStart, furtherstPointIdx);
        const pointsB = _simplifyCurvePointsUsingRDP(points, epsilon, furtherstPointIdx, idxEnd);

        // since both arrays will have point at furtherstPointIdx included, we need to remove it
        pointsB.splice(0, 1);

        return pointsA.concat(pointsB);

    } else {
        // we can skip all the points
        return [points[idxStart], points[idxEnd]];
    }
}


export default {
    
    /**
     * Checks whether two float values are considered to be the same within specified precision
     * @param {Number} a 
     * @param {Number} b 
     * @param {Number} precision Precision to which it should defined two values as "same". If not specified a default of 0.0001 will be used
     * @returns {Boolean} true if a is the same as b
     */
    sameFloatingValue(a, b, precision) {
        if (typeof precision === 'undefined' || precision === null) {
            precision = 0.0001;
        }
        return Math.abs(a - b) < precision;
    },

    tooSmall,

    /**
     * Rounds floating value and converts it to another floating value leaving only the specified significant digits after point
     * @param {*} value 
     * @param {*} precision 
     */
    roundPrecise(value, precision) {
        if (precision > 0) {
            const base = Math.pow(10, precision);
            return Math.round(value * base) / base;
        } else {
            return Math.round(value);
        }
    },

    roundPrecise1(value) {
        return this.roundPrecise(value, 1);
    },

    roundPrecise2(value) {
        return this.roundPrecise(value, 2);
    },

    clamp(value, min, max) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    },

    distanceBetweenPoints(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1)*(x2 - x1) + (y2 -y1)*(y2 - y1));
    },

    normalizedVector(x, y) {
        const dSquared = x * x + y * y;
        if (myMath.tooSmall(dSquared)) {
            return null;
        }

        const d = Math.sqrt(dSquared);
        return {
            x: x/d,
            y: y/d,
        };
    },
    
    angleBetweenVectors,
    cosineAngleBetweenVectors,
    fullAngleForNormalizedVector,
    fullAngleForVector,

    createLineEquation,
    distanceFromPointToLine,

    /**
     * Calculates instersection point of two lines
     * @param {Line} line1 line equation in form of {a, b, c}
     * @param {Line} line2 line equation in form of {a, b, c}
     * @returns 
     */
    linesIntersection(line1, line2) {

        const ly = line1.a * line2.b - line2.a * line1.b;
        if (this.tooSmall(ly)) {
            return null;
        }

        const y = (line2.a * line1.c - line1.a * line2.c) / ly;
        let x = 0;
        if (this.tooSmall(line1.a)) {
            if (this.tooSmall(line2.a)) {
                return null;
            }

            x = (-line2.b * y - line2.c) / line2.a;
        } else {
            x = (-line1.b * y - line1.c) / line1.a;
        }

        return {x, y};
    },

    /**
     * Returns either -1 or 1 depending on which plane the point is lying agaist specified line
     * @param {*} x 
     * @param {*} y 
     * @param {Line} line Line equation in form of {a, b, c} object
     */
    identifyPointSideAgainstLine(x, y, {a, b, c}) {
        if (a * x + b * y + c >= 0) {
            return 1;
        }
        return -1;
    },

    isPointInArea(x, y, area) {
        return x >= area.x && x <= (area.x + area.w)
            && y >= area.y && y <= (area.y + area.h);
    },

    isAreaInArea(area, largerArea) {
        return area.x >= largerArea.x
            && area.y >= largerArea.y
            && area.x + area.w < largerArea.x + largerArea.w
            && area.y + area.h < largerArea.y + largerArea.h;
    },

    /**
     * calculates overlapping area, returns null if there is no overlap
     * @param {Area} area1 
     * @param {Area} area2 
     * @returns {Area} overlapping area of two given areas
     */
    overlappingArea(area1, area2) {
        const a1x = area1.x;
        const a1y = area1.y;
        const b1x = area1.x + area1.w;
        const b1y = area1.y + area1.h;

        const a2x = area2.x;
        const a2y = area2.y;
        const b2x = area2.x + area2.w;
        const b2y = area2.y + area2.h;

        let y1 = 0, y2 = 0, x1 = 0, x2 = 0;
        if (a2x >= a1x) {
            x1 = a2x;
        } else {
            x1 = a1x;
        }

        if (b2x >= b1x) {
            x2 = b1x;
        } else {
            x2 = b2x;
        }

        if (a2y >= a1y) {
            y1 = a2y;
        } else {
            y1 = a1y;
        }

        if (b2y >= b1y) {
            y2 = b1y;
        } else {
            y2 = b2y;
        }

        if (y2 >= y1 && x2 >= x1) {
            return {
                x: x1,
                y: y1,
                w: x2 - x1,
                h: y2 - y1
            };
        }
        return null;
    },

    /**
    Checks if the point within line segment. It doesn't really check if it is placed exacly on the line segment 
    */
    isPointWithinLineSegment(point, segmentPointA, segmentPointB) {
        var Ax = segmentPointA.x - point.x;
        var Ay = segmentPointA.y - point.y;
        var Bx = segmentPointB.x - point.x;
        var By = segmentPointB.y - point.y;

        var Lx = segmentPointB.x - segmentPointA.x;
        var Ly = segmentPointB.y - segmentPointA.y;

        return (Lx*Lx + Ly*Ly) > ((Ax + Bx) * (Ax + Bx) + (Ay + By) * (Ay + By));
    },

    /**
     * calculates world point in specified area including its parent transform
     * @param {Number} x
     * @param {Number} y
     * @param {Area} area
     * @param {Array} transformMatrix - parent transform matrix of the item. May be null
     * @returns {Point}
     */
    worldPointInArea(x, y, area, transformMatrix) {
        if (!area) {
            return {x: 0, y: 0};
        }
        
        if (!transformMatrix) {
            transformMatrix = this.identityMatrix();
        }

        const itemCompleteTransform = this.standardTransformWithArea(transformMatrix, area);
        return this.transformPoint(itemCompleteTransform, x, y);
    },

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Area} area 
     * @param {Array} transformMatrix 
     * @returns {Point}
     */
    localPointInArea(x, y, area, transformMatrix) {
        // To understand how to calculate local point in area we first need to imagine how we calculate a world point based on the items complete transform matrix
        // We can imagine it with this formula:
        //      Pw = At * P
        // where
        //      Pw - world point
        //      At - complete transform matrix of item
        //      P  - local point in item
        //
        // We can derive another formula from above by multiplying both sides by inverted transform matrix (from the left):
        //      Ai * Pw = Ai * At * P
        // where
        //      Ai - is the inverse matrix of At
        // this will turn into (because Ai * At - is equal to identity matrix):
        //      P = Ai * Pw
        // that is exactly what we need

        if (!area) {
            return {x: 0, y: 0};
        }
        
        if (!transformMatrix) {
            transformMatrix = this.identityMatrix();
        }
        const completeTransform = this.standardTransformWithArea(transformMatrix, area);
        const invertedTransform = this.inverseMatrix3x3(completeTransform);
        if (!invertedTransform) {
            return {x: 0, y: 0};
        }

        return this.transformPoint(invertedTransform, x, y);
    },

    /**
     * Calculates {x,y,distance} that is the closest to a specified point on the specified path 
     * @param {Number} x 
     * @param {Number} y 
     * @param {SVGPathElement} svgPath 
     * @param {Object} settings 
     * @returns {SVGPathPoint}
     */
    closestPointOnPath(x, y, svgPath, settings) {
        let startDistance = undefined;
        let stopDistance = undefined;

        if (settings && settings.startDistance !== undefined) {
            startDistance = settings.startDistance;
        }
        if (settings && settings.stopDistance !== undefined) {
            stopDistance = settings.stopDistance;
        }

        const pathLength = svgPath.getTotalLength();
        if (pathLength < 0.001) {
            const p = svgPath.getPointAtLength(0);
            p.distance = 0;
            return p;
        }

        let closestSegmentLeft = 0
        let closestSegmentRight = 0;

        if (startDistance === undefined || stopDistance === undefined) {
            // first doing a linear scan by cutting path into segments with equal length
            // trying to find the closest segment to the path first by checking each segments mid point
            const numberOfDivisions = Math.max(MIN_PATH_DIVISIONS, Math.min(pathLength / PATH_DIVISION_LENGTH, MAX_PATH_DIVISIONS));
            const divisionLength = pathLength/numberOfDivisions;

            let closestSegmentIdx = 0;
            let closestDistance = 0;
            
            for (let i = 0; i < numberOfDivisions; i++) {
                // taking a point at the mid of the segment
                const point = svgPath.getPointAtLength(i*divisionLength + divisionLength/2);
                const distance = (x - point.x)*(x - point.x) + (y - point.y)*(y - point.y);
                if (i === 0) {
                    closestSegmentIdx = i;
                    closestDistance = distance;
                } else {
                    if (closestDistance > distance) {
                        closestDistance = distance;
                        closestSegmentIdx = i;
                    }
                }
            }

            closestSegmentLeft = closestSegmentIdx * divisionLength;
            closestSegmentRight = (closestSegmentIdx + 1) * divisionLength;

        } else {
            closestSegmentLeft = Math.min(startDistance, pathLength);
            closestSegmentRight = Math.min(stopDistance, pathLength);
        }

        const closestSegmentMid = (closestSegmentLeft + closestSegmentRight) / 2;
        
        // now doing a binary search on selected segment
        const leftSegment = [closestSegmentLeft, closestSegmentMid];
        const rightSegment = [closestSegmentMid, closestSegmentRight]
        let segmentWidth = (closestSegmentRight - closestSegmentLeft) / 2;

        let closestPoint = svgPath.getPointAtLength(closestSegmentLeft);
        closestPoint.distance = closestSegmentLeft;

        while(segmentWidth > 0.5) {
            const middle = segmentWidth / 2;
            let pointLeft = svgPath.getPointAtLength(leftSegment[0] + middle);
            pointLeft.distance = leftSegment[0] + middle;

            let pointRight = svgPath.getPointAtLength(rightSegment[0] + middle);
            pointRight.distance = rightSegment[0] + middle;
            let distanceLeft = (x - pointLeft.x)*(x - pointLeft.x) + (y - pointLeft.y) * (y - pointLeft.y);
            let distanceRight = (x - pointRight.x)*(x - pointRight.x) + (y - pointRight.y) * (y - pointRight.y);

            segmentWidth = middle;
            if (distanceLeft < distanceRight) {
                closestPoint = pointLeft;
                leftSegment[1] = leftSegment[0] + segmentWidth;
            } else {
                closestPoint = pointRight;
                leftSegment[0] = rightSegment[0];
                leftSegment[1] = leftSegment[0] + segmentWidth;
            }
            rightSegment[0] = leftSegment[1];
            rightSegment[1] = rightSegment[0] + segmentWidth;
        }
        return closestPoint;
    },

    /**
     * Converts world point in relative transform to coords in viewport for a given screen transform
     * @param {ScreenTransform} screenTransform - transform of a screen
     * @param {Number} x - X coords in the world (relative) transform
     * @param {Number} y - Y coords in the world (relative) transform
     * @returns {Point}
     */
    worldPointToViewport(screenTransform, x, y) {
        return {
            x: (x + screenTransform.x) / screenTransform.scale,
            y: (y + screenTransform.y) / screenTransform.scale
        };
    },

    /**
     * Converts viewport point to coords in relative transform for a given screen transform
     * @param {ScreenTransform} screenTransform - transform of a screen
     * @param {Number} x - X coords in the viewport transform
     * @param {Number} y - Y coords in the viewport transform
     * @returns {Point}
     */
    viewportPointToWorld(screenTransform, x, y) {
        return {
            x: x * screenTransform.scale - screenTransform.x,
            y: y * screenTransform.scale - screenTransform.y,
        };
    },


    _snapScales: [ 500, 100, 20, 5, 1, 0.2, 0.04, 0.008 ],

    /**
     * 
     * @param {Number} scale The scale value on screen transform
     * @returns {Number} size of grid snapping in world coords
     */
    getSnappingWidthForScale(scale) {
        const log5 = Math.round(Math.log(scale) / Math.log(5));
        const snapIndex = log5 + 2;
        if (snapIndex > 0 && snapIndex < this._snapScales.length) {
            return this._snapScales[snapIndex];
        }
        if (snapIndex > this._snapScales.length) {
            return this._snapScales[this._snapScales.length - 1];
        }
        return this._snapScales[0];
    },
    

    /**
     * Simplifies specified points using Ramer-Douglas-Peucker algorithm
     * @param {Array} points array of points
     * @param {Number} epsilon minimum distance to the line in the RDP algorithm
     * @returns 
     */
    simplifyCurvePointsUsingRDP(points, epsilon) {
        return _simplifyCurvePointsUsingRDP(points, epsilon, 0, points.length - 1);
    },


    smoothCurvePoints(points) {
        const maxSmoothingLength = 100;
        const maxSmoothingLengthSquared = maxSmoothingLength * maxSmoothingLength;
        const maxSmoothingAngle = 0.1;
        const smoothingFactor = 8;
        if (points.length <= 2) {
            return points;
        }

        const smoothPoints = [points[0]];
        
        for (let i = 1; i < points.length - 1; i++) {
            let prevPoint = points[i - 1];
            let point = points[i];
            let nextPoint = points[i + 1];


            const aSquared = (point.x - prevPoint.x) * (point.x - prevPoint.x) + (point.y - prevPoint.y) * (point.y - prevPoint.y);
            const bSquared = (point.x - nextPoint.x) * (point.x - nextPoint.x) + (point.y - nextPoint.y) * (point.y - nextPoint.y);
            
            const angle = angleBetweenVectors(
                prevPoint.x - point.x,
                prevPoint.y - point.y,
                nextPoint.x - point.x,
                nextPoint.y - point.y
            );

            if (aSquared < maxSmoothingLengthSquared && bSquared < maxSmoothingLengthSquared || Math.abs(angle) < maxSmoothingAngle) {
                const cx = nextPoint.x - prevPoint.x;
                const cy = nextPoint.y - prevPoint.y;

                smoothPoints.push({
                    t: 'B',
                    x: point.x,
                    y: point.y,
                    x1: -cx/smoothingFactor,
                    y1: -cy/smoothingFactor,
                    x2: cx/smoothingFactor,
                    y2: cy/smoothingFactor,
                });
            } else {
                smoothPoints.push(point);
            }
        }

        smoothPoints.push(points[points.length - 1]);
        return smoothPoints;
    },

    multiplyMatrices(...matrices) {
        if (matrices.length === 0) {
            return this.identityMatrix();
        }
        let matrix = matrices[0];

        for (let i = 1; i < matrices.length; i++) {
            matrix = this.multiplyTwoMatrices(matrix, matrices[i]);
        }

        return matrix;
    },

    multiplyTwoMatrices(matrixA, matrixB) {
        let rowsA = matrixA.length;
        let colsA = matrixA[0].length;
        let colsB = matrixB[0].length;
        let result = new Array(rowsA);

        for (let r = 0; r < rowsA; r++) {
            result[r] = new Array(colsB);

            for (let c = 0; c < colsB; c++) {
                result[r][c] = 0;

                for (let i = 0; i < colsA; i++) {
                    result[r][c] += matrixA[r][i] * matrixB[i][c];
                }
            }
        }

        return result;
    },

    translationMatrix(tx, ty) {
        return [
            [1, 0, tx],
            [0, 1, ty],
            [0, 0, 1],
        ];
    },

    rotationMatrixInDegrees(angle) {
        return this.rotationMatrixInRadians(angle * Math.PI / 180);
    },

    rotationMatrixInRadians(angle) {
        return [
            [Math.cos(angle),   -Math.sin(angle),   0],
            [Math.sin(angle),   Math.cos(angle),    0],
            [0,                 0,                  1],
        ];
    },

    scaleMatrix(sx, sy) {
        return [
            [sx, 0, 0],
            [0, sy, 0],
            [0, 0, 1],
        ];
    },

    identityMatrix() {
        return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ];
    },

    /**
     * 
     * @param {Array} parentTransform 
     * @param {Area} area 
     * @returns {Array} new transformation matrix
     */
    standardTransformWithArea(parentTransform, area) {
        return this.multiplyMatrices(
            parentTransform,
            this.translationMatrix(area.x, area.y),
            this.rotationMatrixInDegrees(area.r),
        );
    },

    /**
     * Trasforms specified point
     * @param {Array} transformMatrix 
     * @param {Number} x
     * @param {Number} y
     * @returns {Point}
     */
    transformPoint(transformMatrix, x, y) {
        const resultMatrix = this.multiplyMatrices(transformMatrix, [[x], [y], [1]]);
        return {
            x: resultMatrix[0][0],
            y: resultMatrix[1][0]
        };
    },

    /**
     * 
     * @param {Array} m - matrix of 3x3
     * @returns {Array} - inversed matrix or null in case matrix cannot be inversed
     */
    inverseMatrix3x3(m) {
        const xmod = (r, c) => {
            const rows = [0, 1, 2];
            const cols = [0, 1, 2];
            rows.splice(r, 1);
            cols.splice(c, 1);

            return m[rows[0]][cols[0]] * m[rows[1]][cols[1]] - m[rows[0]][cols[1]] * m[rows[1]][cols[0]];
        };

        const det = m[0][0] * xmod(0, 0) - m[0][1] * xmod(0, 1) + m[0][2] * xmod(0, 2);
        if (this.tooSmall(det)) {
            return null;
        }

        const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        let i = 2;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const k = i % 2 === 0 ? 1 : -1;
                // here we need to get transposed matrix so we switch rows and columns, this will flip it around its own diagonal
                result[c][r] = k * xmod(r,c) / det;
                i++;
            }
        }

        return result;
    },


    /**
     * Converts value to 0 in case it is null or undefined
     * @param {Number} value 
     * @returns {Number}
     */
    nonNullNumber(value) {
        if (value == null) {
            return 0;
        }
        return value
    }
}
