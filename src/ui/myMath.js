/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const _zeroTransform = {x: 0, y: 0, r: 0};

export default {
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

    findPointPlacementToLine(line, point) {
        return ((point.x - line.x1) * (line.y2 - line.y1)) - ((point.y - line.y1) * (line.x2 - line.x1));
    },

    distanceToLineSegment(point, segmentPointA, segmentPointB) {
        var Ax = segmentPointA.x - point.x;
        var Ay = segmentPointA.y - point.y;
        var Bx = segmentPointB.x - point.x;
        var By = segmentPointB.y - point.y;

        return Math.abs(Ax*By - Ay*Bx);
    },

    /**
    Checks if the point within line segment. It doesn't really check if it is placed exacly on the line segment,
     so this check is always be used in combination with distanceToLineSegment function
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
     * @param {*} x 
     * @param {*} y 
     * @param {*} svgPath 
     */
    closestPointOnPath(x, y, svgPath) {
        const pathLength = svgPath.getTotalLength();

        const leftSegment = [0, pathLength / 2];
        const rightSegment = [pathLength / 2, pathLength]
        let segmentWidth = pathLength / 2;

        let closestPoint = svgPath.getPointAtLength(0);
        closestPoint.distance = 0;

        while(segmentWidth > 1) {
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
    }
}
