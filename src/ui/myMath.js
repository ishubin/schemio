/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import './typedef';

const _zeroTransform = {x: 0, y: 0, r: 0};

const MAX_PATH_DIVISIONS = 100;
const MIN_PATH_DIVISIONS = 8;
const PATH_DIVISION_LENGTH = 20;

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

    /**
     * Generates line equation in form of ax + by + c = 0 which intersects given two points
     * returns an object with a, b, c parameters
     * @param {*} x1 
     * @param {*} y1 
     * @param {*} x2 
     * @param {*} y2 
     */
    createLineEquation(x1, y1, x2, y2) {
        return {
            a: y1 - y2,
            b: x2 - x1,
            c: x1*y2 - x2*y1
        };
    },

    /**
     * Returns either -1 or 1 depending on which plane the point is lying agaist specified line
     * @param {*} x 
     * @param {*} y 
     * @param {*} line Line equation in form of {a, b, c} object
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
     * @param {*} x
     * @param {*} y
     * @param {*} area
     * @param {*} transform - {x, y, r} parent transform of the item. May be null
     * @returns {Point}
     */
    worldPointInArea(x, y, area, transform) {
        if (!area) {
            return {x: 0, y: 0};
        }
        
        if (!transform) {
            transform = _zeroTransform;
        }

        let tAngle = transform.r * Math.PI/180,
            cosTA = Math.cos(tAngle),
            sinTA = Math.sin(tAngle),
            angle = (transform.r + area.r) * Math.PI/180,
            cosa = Math.cos(angle),
            sina = Math.sin(angle);

        return {
            x: transform.x + area.x * cosTA - area.y * sinTA  + x * cosa - y * sina,
            y: transform.y + area.x * sinTA + area.y * cosTA  + x * sina + y * cosa,
        };
    },

    /**
     * 
     * @param {*} x 
     * @param {*} y 
     * @param {*} area 
     * @param {*} transform 
     * @returns {Point}
     */
    localPointInArea(x, y, area, transform) {
        if (!area) {
            return {x: 0, y: 0};
        }
        
        if (!transform) {
            transform = _zeroTransform;
        }

        let tAngle = transform.r * Math.PI/180,
            cosTA = Math.cos(tAngle),
            sinTA = Math.sin(tAngle),
            angle = (transform.r + area.r) * Math.PI/180,
            cosa = Math.cos(angle),
            sina = Math.sin(angle),
            tx = transform.x + area.x * cosTA - area.y * sinTA,
            ty = transform.y + area.x * sinTA + area.y * cosTA;


        return {
            x: (y - ty)*sina + (x - tx)*cosa,
            y: (y - ty)*cosa - (x - tx)*sina
        };
    },

    /**
     * Calculates {x,y,distance} that is the closest to a specified point on the specified path 
     * @param {Number} x 
     * @param {Number} y 
     * @param {SVGPathElement} svgPath 
     * @returns {SVGPathPoint}
     */
    closestPointOnPath(x, y, svgPath) {
        const pathLength = svgPath.getTotalLength();
        if (pathLength < 0.001) {
            const p = svgPath.getPointAtLength(0);
            p.distance = 0;
            return p;
        }
        
        // first doing a linear scan by cutting path into segments with equal length
        // trying to find the closest segment to the path first by checking each segements mid point
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

        const closestSegmentLeft = closestSegmentIdx * divisionLength;
        const closestSegmentRight = (closestSegmentIdx + 1) * divisionLength;
        const closestSegmentMid = (closestSegmentLeft + closestSegmentRight) / 2
        
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
    }
}
