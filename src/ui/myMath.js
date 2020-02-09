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
    }
}
