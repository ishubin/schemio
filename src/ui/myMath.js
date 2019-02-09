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
    }
}
