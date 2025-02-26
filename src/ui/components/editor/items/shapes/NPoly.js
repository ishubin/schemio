/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "../../../../myMath";

/**
 *
 * @param {Array<Point>} segmentPoints
 */
function calculateMinSegmentLength(segmentPoints) {
    let minSegmentLength = 0;
    for (let i = 1; i < segmentPoints.length; i++) {
        const p1 = segmentPoints[i-1];
        const p2 = segmentPoints[i];
        const segmentLength = myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y);
        if (i === 1) {
            minSegmentLength = segmentLength;
        } else if (minSegmentLength > segmentLength) {
            minSegmentLength = segmentLength;
        }
    }
    return minSegmentLength;
}

/**
 *
 * @param {Array<Point>} segmentPoints
 * @param {Number} rounding
 */
function computeNPolyWithRoundingCorners(segmentPoints, rounding) {
    const minSegmentLength = calculateMinSegmentLength(segmentPoints);

    let path = '';
    const gapLength = minSegmentLength * myMath.clamp(rounding, 0, 100) / 200;
    for (let i = 0; i < segmentPoints.length; i++) {
        let prevIdx = i - 1;
        if (prevIdx < 0) {
            prevIdx = segmentPoints.length - 1;
        }
        const nextIdx = (i + 1) % segmentPoints.length;
        const p1 = segmentPoints[prevIdx];
        const p2 = segmentPoints[i];
        const p3 = segmentPoints[nextIdx];

        const d1_2 = myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y);
        const d2_3 = myMath.distanceBetweenPoints(p2.x, p2.y, p3.x, p3.y);

        // this fallback is needed to avoid errors when user starts drawing npoly shape and the width or height are 0
        if (myMath.tooSmall(d1_2) || myMath.tooSmall(d2_3)) {
            return computeNPolyWithSharpCorners(segmentPoints);
        };
        const n1x = (p1.x - p2.x) / d1_2;
        const n1y = (p1.y - p2.y) / d1_2;
        const n2x = (p3.x - p2.x) / d2_3;
        const n2y = (p3.y - p2.y) / d2_3;

        const x1 = p2.x + n1x * gapLength;
        const y1 = p2.y + n1y * gapLength;
        const x3 = p2.x + n2x * gapLength;
        const y3 = p2.y + n2y * gapLength;
        const x4 = p3.x - n2x * gapLength;
        const y4 = p3.y - n2y * gapLength;
        if (i === 0) {
            path = `M ${x1} ${y1}`;
        }

        const v1x = p2.x - x1;
        const v1y = p2.y - y1;
        const v3x = p2.x - x3;
        const v3y = p2.y - y3;

        const m1x = -v1y;
        const m1y = v1x;
        const m3x = -v3y;
        const m3y = v3x;

        const line1 = myMath.createLineEquation(x1, y1, x1 + m1x, y1 + m1y);
        const line3 = myMath.createLineEquation(x3, y3, x3 + m3x, y3 + m3y);
        let c = null;
        if (line1 && line3) {
            c = myMath.linesIntersection(line1, line3);
        }

        if (c) {
            const r = myMath.distanceBetweenPoints(x1, y1, c.x, c.y);
            path += ` A ${r} ${r} 0 0 1 ${x3} ${y3} L ${x4} ${y4}`;
        } else {
            path += ` L ${x3} ${y3} L ${x4} ${y4}`;
        }
    }
    return path + ' Z';
}

/**
 *
 * @param {Array<Point>} segmentPoints
 */
function computeNPolyWithSharpCorners(segmentPoints) {
    let path = `M ${segmentPoints[0].x} ${segmentPoints[0].y} `;
    for (let i = 1; i < segmentPoints.length; i++) {
        path += ` L ${segmentPoints[i].x} ${segmentPoints[i].y} `;
    }
    return path + ' Z';
}

function computeNPolyPath(item) {
    const cx = item.area.w/2;
    const cy = item.area.h/2;

    const corners = Math.max(3, item.shapeProps.corners);
    const segmentPoints = [];

    for(let i = 0; i < corners; i++) {
        const x = item.area.w / 2 * Math.cos(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cx;
        const y = item.area.h / 2 * Math.sin(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cy;
        segmentPoints.push({x, y});
    }

    if (item.shapeProps.rounding > 0) {
        return computeNPolyWithRoundingCorners(segmentPoints, item.shapeProps.rounding);
    } else {
        return computeNPolyWithSharpCorners(segmentPoints);
    }
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'npoly',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'N-Polygon',
            iconUrl: '/assets/images/items/npolygon.svg',
            size: {w: 60, h: 60},
            previewArea: {x: 0, y: 0, w: 150, h: 150, r: 0},
        }],

        computePath(item) {
            return computeNPolyPath(item);
        },

        args: {
            corners: {type: 'number', value: 6, name: 'Corners', min: 3, softMax: 20},
            angle  : {type: 'number', value: 0, name: 'Angle', min: -360, max: 360},
            rounding: {type: 'number', value: 0, name: 'Rounding (%)', min: 0, max: 100},
        },

    }
}