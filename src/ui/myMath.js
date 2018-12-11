export default {
    isPointInArea(x, y, area) {
        return x >= area.x && x <= (area.x + area.w)
            && y >= area.y && y <= (area.y + area.h);
    },

    findPointPlacementToLine(line, point) {
        return ((point.x - line.x1) * (line.y2 - line.y1)) - ((point.y - line.y1) * (line.x2 - line.x1));
    }
}
