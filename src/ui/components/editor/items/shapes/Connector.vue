<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :stroke-dashoffset="item.meta.strokeOffset"
            style="stroke-linejoin: round;"
            :fill="svgFill"></path>

        <g v-if="!item.shapeProps.thick">
            <path v-for="cap in caps" :d="cap.path"
                :data-item-id="item.id"
                :stroke="item.shapeProps.strokeColor"
                :stroke-width="item.shapeProps.strokeSize"
                :fill="cap.hollow ? 'none' : item.shapeProps.strokeColor"
                stroke-linejoin="round"
            />
        </g>
    </g>
</template>

<script>
import {forEach} from '../../../../collections';
import StrokePattern from '../StrokePattern.js';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import { createConnectorCap } from './ConnectorCaps';
import '../../../../typedef';
import utils from '../../../../utils';
import AdvancedFill from '../AdvancedFill.vue';
import {computeSvgFill} from '../AdvancedFill.vue';
import EditorEventBus from '../../EditorEventBus.js';
import { localPointOnItem, localPointOnItemToLocalPointOnOtherItem, worldPointOnItem } from '../../../../scheme/ItemMath';
import { Vector } from '../../../../templater/vector';

const log = new Logger('Connector');



function round(value) {
    return myMath.roundPrecise2(value);
}

const UP         = 0,
      DOWN       = 1,
      LEFT       = 2,
      RIGHT      = 3,
      ANY        = 4,
      VERTICAL   = 5,
      HORIZONTAL = 6;

const directionInversions = [ DOWN, UP, RIGHT, LEFT, ANY ];

function identifyDirection(x, y) {
    if (x <= -0.5) {
        return LEFT;
    }
    if (x >= 0.5) {
        return RIGHT;
    }
    if (y <= -0.5) {
        return UP;
    }
    if (y >= 0.5) {
        return DOWN;
    }
}

const directionClockWiseTurns = [
    [0, 0, -1, 1],
    [0, 0, 1, -1],
    [1, -1, 0, 0],
    [-1, 1, 0, 0],
];

function isTurnClockWise(direction1, direction2) {
    return directionClockWiseTurns[direction1][direction2] > 0;
}

function directionType(direction) {
    if (direction === RIGHT || direction === LEFT) {
        return HORIZONTAL;
    }
    if (direction === UP || direction === DOWN) {
        return VERTICAL;
    }
    return ANY;
}

function invertDirection(direction) {
    return directionInversions[direction];
}

function stepV(y1, y2) {
    return {
        way: y2 > y1 ? DOWN: UP,
        value: Math.abs(y2 - y1),
    };
}

function stepH(x1, x2) {
    return {
        way: x2 > x1 ? RIGHT: LEFT,
        value: Math.abs(x2 - x1),
    };
}

const lineV2V = (x1, y1, x2, y2) => {
    const ym = (y1 + y2) / 2;
    return [
        stepV(y1, ym),
        stepH(x1, x2),
        stepV(ym, y2),
    ];
}

const lineH2V = (x1, y1, x2, y2) => {
    return [
        stepH(x1, x2),
        stepV(y1, y2)
    ];
};

const lineV2H = (x1, y1, x2, y2) => {
    return [
        stepV(y1, y2),
        stepH(x1, x2)
    ];
};

const lineH2H = (x1, y1, x2, y2) => {
    const xm = (x1 + x2) / 2;
    return [
        stepH(x1, xm),
        stepV(y1, y2),
        stepH(xm, x2)
    ];
};


function findWayToThePoint(x1, y1, previousDirection, x2, y2, preferedDirection) {
    const restrictedDirection = invertDirection(previousDirection);
    let possibleDirections = [];

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (!myMath.tooSmall(dx)) {
        possibleDirections.push(x2 > x1 ? RIGHT : LEFT);
    }
    if (!myMath.tooSmall(dy)) {
        possibleDirections.push(y2 > y1 ? DOWN: UP);
    }

    if (possibleDirections.length === 2) {
        if (possibleDirections[0] === restrictedDirection) {
            possibleDirections = [possibleDirections[1], possibleDirections[0]];
        } else if (preferedDirection === possibleDirections[0] && possibleDirections[1] !== restrictedDirection) {
            possibleDirections = [possibleDirections[1], possibleDirections[0]];
        } else if (preferedDirection === ANY && possibleDirections[1] === previousDirection) {
            possibleDirections = [possibleDirections[1], possibleDirections[0]];
        }
    }


    const previousDirectionType = directionType(previousDirection);
    const firstDirectionType = directionType(possibleDirections[0]);
    const preferedDirectionType = directionType(preferedDirection);
    if (firstDirectionType === preferedDirectionType || previousDirectionType === preferedDirectionType) {
        if (preferedDirectionType === VERTICAL) {
            if ((y2 < y1 && previousDirection !== DOWN) || (y2 > y1 && previousDirection !== UP)) {
                return lineV2V(x1, y1, x2, y2);
            }
        } else {
            if ((x2 < x1 && previousDirection !== RIGHT) || (x2 > x1 && previousDirection !== LEFT)) {
                return lineH2H(x1, y1, x2, y2);
            }
        }
    }

    if (firstDirectionType === HORIZONTAL) {
        return lineH2V(x1, y1, x2, y2);
    } else {
        return lineV2H(x1, y1, x2, y2);
    }
}

function movePointWithStep(x, y, stepWay, stepValue) {
    if (stepWay === RIGHT) {
        x = x + stepValue;
    } else if (stepWay === LEFT) {
        x = x - stepValue;
    } else if (stepWay === UP) {
        y = y - stepValue;
    } else if (stepWay === DOWN) {
        y = y + stepValue;
    }

    return {x, y};
}

function computeStepPathAndCaps(item, useCut, roundCuts) {
    const points = utils.clone(item.shapeProps.points);
    const caps = [];

    // identifying a required direction of first and last points
    let firstPointDirection = UP;
    let lastPointDirection = ANY;

    if (points[0].hasOwnProperty('nx')) {
        firstPointDirection = identifyDirection(points[0].nx, points[0].ny);
    }

    const lastPoint = points[points.length - 1];
    if (lastPoint.hasOwnProperty('nx')) {
        lastPointDirection = identifyDirection(lastPoint.nx, lastPoint.ny);
    }

    if (item.shapeProps.sourceCap && item.shapeProps.sourceCap !== 'empty') {
        const wayPoint = movePointWithStep(0, 0, firstPointDirection, item.shapeProps.sourceCapSize);
        const cap = computeCapByPosition(points[0].x, points[0].y, points[0].x + wayPoint.x, points[0].y + wayPoint.y, item.shapeProps.sourceCapSize, item.shapeProps.sourceCap);
        if (cap) {
            if (!cap.prolongLine) {
                points[0].x = cap.entryPoint.x;
                points[0].y = cap.entryPoint.y;
            }
            caps.push(cap);
        }
    }

    const pathSteps = [];

    let currentDirection = firstPointDirection;
    let currentPoint = points[0];

    const applySteps = (steps) => {
        forEach(steps, step => {
            if (step.value > 0) {
                pathSteps.push(step);
            }
            currentPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value);
        });
        currentDirection = steps[steps.length - 1].way;
    };

    for (let i = 1; i < points.length - 1; i++) {
        applySteps(findWayToThePoint(currentPoint.x, currentPoint.y, currentDirection, points[i].x, points[i].y, ANY));
    }

    applySteps(findWayToThePoint(currentPoint.x, currentPoint.y, currentDirection, lastPoint.x, lastPoint.y, invertDirection(lastPointDirection)));

    if (pathSteps.length === 0) {
        return {
            path:  `M ${points[0].x} ${points[0].y}  L ${points[1].x} ${points[1].y}`,
            caps: []
        }
    }

    let path = `M ${points[0].x} ${points[0].y}`;


    currentPoint = points[0];
    if (!useCut) {
        forEach(pathSteps, (step, i) => {
            const nextPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value);
            let cap = null;
            if (i === pathSteps.length - 1 && item.shapeProps.destinationCap && item.shapeProps.destinationCap !== 'empty') {
                cap = computeCapByPosition(nextPoint.x, nextPoint.y, currentPoint.x, currentPoint.y, item.shapeProps.destinationCapSize, item.shapeProps.destinationCap);
            }
            if (cap) {
                if (!cap.prolongLine) {
                    path += ` L ${cap.entryPoint.x} ${cap.entryPoint.y}`;
                } else {
                    path += ` L ${nextPoint.x} ${nextPoint.y}`;
                }
                caps.push(cap);
            } else {
                path += ` L ${nextPoint.x} ${nextPoint.y}`;
                currentPoint = nextPoint;
            }
        });
        return {
            path,
            caps
        };
    }

    // using cuts
    const maxStepCut = Math.max(0, item.shapeProps.stepSize);
    let previousCut = 0;

    for (let i = 0; i < pathSteps.length - 1; i++) {
        const step = pathSteps[i];
        const nextStep = pathSteps[i + 1];
        const minStepValue = Math.min(step.value, nextStep.value);
        if (minStepValue > 1 && nextStep.way !== step.way) {
            const cut = Math.min(maxStepCut, minStepValue / 2);
            const nextPhantomPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value - previousCut);
            const nextPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value - cut - previousCut);
            const cutExitPoint = movePointWithStep(nextPhantomPoint.x, nextPhantomPoint.y, nextStep.way, cut);
            if (roundCuts) {
                const sweepFlag = isTurnClockWise(step.way, nextStep.way) ? 1 : 0;
                path += ` L ${nextPoint.x} ${nextPoint.y} A ${cut} ${cut} 0 0 ${sweepFlag} ${cutExitPoint.x} ${cutExitPoint.y}`;
            } else {
                path += ` L ${nextPoint.x} ${nextPoint.y} L ${cutExitPoint.x} ${cutExitPoint.y}`;
            }
            previousCut = cut;
            currentPoint = cutExitPoint;
        } else {
            const nextPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value - previousCut);
            path += ` L ${nextPoint.x} ${nextPoint.y}`;
            currentPoint = nextPoint;
            previousCut = 0;
        }
    }
    const step = pathSteps[pathSteps.length - 1];
    const nextPoint = movePointWithStep(currentPoint.x, currentPoint.y, step.way, step.value - previousCut);
    let cap = null;
    if (item.shapeProps.destinationCap && item.shapeProps.destinationCap !== 'empty') {
        cap = computeCapByPosition(nextPoint.x, nextPoint.y, currentPoint.x, currentPoint.y, item.shapeProps.destinationCapSize, item.shapeProps.destinationCap);
    }
    if (cap) {
        path += ` L ${cap.entryPoint.x} ${cap.entryPoint.y}`;
        if (cap.prolongLine) {
            path += ` L ${nextPoint.x} ${nextPoint.y}`;
        }
        caps.push(cap);
    } else {
        path += ` L ${nextPoint.x} ${nextPoint.y}`;
    }
    return {
        path,
        caps
    };
}


function computeSmoothPath(item) {
    const points = utils.clone(item.shapeProps.points);

    if (points.length < 2) {
        return {
            path: null,
            caps: []
        };
    }

    let path = '';
    const caps = [];
    let firstCap = null;
    let lastCap = null;
    let previousPoint = null;

    if (item.shapeProps.sourceCap && item.shapeProps.sourceCap !== 'empty') {
        let x2 = points[1].x, y2 = points[1].y;
        if (typeof points[0].nx !== 'undefined') {
            x2 = points[0].x + points[0].nx * item.shapeProps.sourceCapSize;
            y2 = points[0].y + points[0].ny * item.shapeProps.sourceCapSize;
        }

        firstCap = computeCapByPosition(points[0].x, points[0].y, x2, y2, item.shapeProps.sourceCapSize, item.shapeProps.sourceCap);
        if (firstCap) {
            points[0].x = firstCap.entryPoint.x;
            points[0].y = firstCap.entryPoint.y;
            caps.push(firstCap);
        }
    }
    if (item.shapeProps.destinationCap && item.shapeProps.destinationCap !== 'empty') {
        const id = points.length - 1;
        let x2 = points[id - 1].x, y2 = points[id - 1].y;
        if (typeof points[id].nx !== 'undefined') {
            x2 = points[id].x + points[id].nx * item.shapeProps.destinationCapSize;
            y2 = points[id].y + points[id].ny * item.shapeProps.destinationCapSize;
        }

        lastCap = computeCapByPosition(points[id].x, points[id].y, x2, y2, item.shapeProps.destinationCapSize, item.shapeProps.destinationCap, item.shapeProps.fill);
        if (lastCap) {
            points[id].x = lastCap.entryPoint.x;
            points[id].y = lastCap.entryPoint.y;
            caps.push(lastCap);
        }
    }

    // special situation, it is easier to handle it separately
    if (points.length === 2 && item.shapeProps.sourceItem && item.shapeProps.destinationItem
         && typeof points[0].nx !== 'undefined' && typeof points[1].nx !== 'undefined') {

        const p0 = points[0], p1 = points[1];
        const pointsDistance = myMath.distanceBetweenPoints(p0.x, p0.y, p1.x, p1.y);
        let k = pointsDistance / 3;

        const normalOverlap = myMath.vectorLength(p0.nx + p1.nx, p0.ny + p1.ny);
        const normalCapsDistance = myMath.distanceBetweenPoints(p0.x + p0.nx, p0.y + p0.ny, p1.x + p1.nx, p1.y + p1.ny);
        if (normalOverlap < 0.2 && normalCapsDistance < pointsDistance) {
            // This is a special case of when normal are "looking" into each other
            // This is possible when one item is located on top of another and the connector
            // is connected to the bottom pin of the top item and top pin of the bottom item
            // If we don't perform such check then the connector becomes curved too much
            const v0 = myMath.rotateVector90Clockwise(p0.nx, p0.ny);
            const line = myMath.createLineEquation(p0.x, p0.y, p0.x + v0.x, p0.y + v0.y);
            const d = myMath.distanceFromPointToLine(p1.x, p1.y, line);
            k = d / 1.5;
        }

        let path = '';

        if (firstCap && firstCap.prolongLine) {
            const p = item.shapeProps.points[0];
            path = `M ${p.x} ${round(p.y)} L ${round(p0.x)} ${round(p0.y)} `;
        } else {
            path =  `M ${round(p0.x)} ${round(p0.y)} `;
        }

        path += `C ${round(p0.x + k * p0.nx)} ${round(p0.y + k * p0.ny)}`
                + ` ${round(p1.x + k * p1.nx)}  ${round(p1.y + k * p1.ny)}`
                + ` ${round(p1.x)} ${round(p1.y)} `;

        if (lastCap && lastCap.prolongLine) {
            const p = item.shapeProps.points[item.shapeProps.points.length - 1];
            path += `L ${round(p.x)} ${round(p.y)}`;
        }

        return { path, caps };
    }

    const vectors = [];
    forEach(points, (point, i) => {
        let prevPoint = point;
        if (i > 0) {
            prevPoint = points[i - 1];
        }
        let nextPoint = point;
        if (i < points.length - 1) {
            nextPoint = points[i + 1];
        }

        let x = (nextPoint.x - prevPoint.x);
        let y = (nextPoint.y - prevPoint.y);
        const d = Math.sqrt(x*x + y*y);
        if (d > 0.00001) {
            x = x / d;
            y = y / d;
        }
        vectors[i] = {x, y};
    });

    // tested different values and this one works best so far
    const smoothingFactor = 3.5;

    forEach(points, (point, i) => {
        if (i === 0) {
            if (firstCap && firstCap.prolongLine) {
                path = `M ${round(item.shapeProps.points[0].x)} ${round(item.shapeProps.points[0].y)} `
                    + `L ${round(point.x)} ${round(point.y)} `;
            } else {
                path = `M ${round(point.x)} ${round(point.y)} `;
            }

        } else if (i === 1 && item.shapeProps.sourceItem && typeof previousPoint.nx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i < points.length - 1) {
                vx = vectors[i].x;
                vy = vectors[i].y;
            }
            path += ` C ${round(previousPoint.x + k * previousPoint.nx)} ${round(previousPoint.y + k * previousPoint.ny)} ${round(point.x - k * vx)} ${round(point.y - k * vy)} ${round(point.x)} ${round(point.y)}`;

        } else if (i === points.length - 1 && item.shapeProps.destinationItem && typeof point.nx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i > 1) {
                vx = vectors[i-1].x;
                vy = vectors[i-1].y;
            }
            path += ` C ${round(previousPoint.x + k * vx)} ${round(previousPoint.y + k *vy)}  ${round(point.x + k*point.nx)} ${round(point.y + k*point.ny)} ${round(point.x)} ${round(point.y)}`;

        } else {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let pvx = vectors[i - 1].x;
            let pvy = vectors[i - 1].y;
            let vx = vectors[i].x;
            let vy = vectors[i].y;

            path += ` C ${round(previousPoint.x + k * pvx)} ${round(previousPoint.y + k * pvy)}  ${round(point.x - k * vx)} ${round(point.y - k * vy)} ${round(point.x)} ${round(point.y)}`;
        }
        previousPoint = point;
    });

    if (lastCap && lastCap.prolongLine) {
        const p = item.shapeProps.points[item.shapeProps.points.length - 1];
        path += `L ${p.x} ${p.y}`;
    }
    return { path, caps };
}

function computeThickPath(item) {
    if (item.shapeProps.points.length < 2) {
        return '';
    }

    let path = '';

    const V = [];
    const W = [];
    const A = [];
    const B = [];
    const Pa = [];
    const Pb = [];

    forEach(item.shapeProps.points, (point, i) => {
        if (i < item.shapeProps.points.length - 1) {
            const nextPoint = item.shapeProps.points[i + 1];
            V[i] = {
                x: nextPoint.x - point.x,
                y: nextPoint.y - point.y
            };
            const dSquared = V[i].x * V[i].x + V[i].y * V[i].y;
            if (dSquared > 0.001) {
                const d = Math.sqrt(dSquared);
                W[i] = {
                    x: V[i].x / d,
                    y: V[i].y /d
                };
            } else {
                W[i] = V[i];
            }
            // rotating W by 90 degrees
            A[i] = {
                x: W[i].y * item.shapeProps.thickWidth,
                y: -W[i].x * item.shapeProps.thickWidth
            };
            B[i] = {
                x: -A[i].x,
                y: -A[i].y
            }
            Pa[i] = {
                x: point.x + A[i].x,
                y: point.y + A[i].y,
            };
            Pb[i] = {
                x: point.x + B[i].x,
                y: point.y + B[i].y,
            };
        }
    });

    const alpha = [];

    // ratios for triangle
    const M = 3;
    const K = 2;

    let shouldDrawEndArrow = false;
    let shouldDrawSourceArrow = false;

    // first creating left edge
    forEach(item.shapeProps.points, (point, i) => {
        if (i === 0) {
            const d = V[0].x * V[0].x + V[0].y * V[0].y;
            const arrowLength = item.shapeProps.thickWidth * M;
            if (item.shapeProps.sourceCap === 'triangle' && Math.sqrt(d) > arrowLength) {
                shouldDrawSourceArrow = true;
                const Sx = point.x + W[0].x * item.shapeProps.thickWidth * M;
                const Sy = point.y + W[0].y * item.shapeProps.thickWidth * M;
                path += ` M ${round(point.x)} ${round(point.y)}  L ${Sx + A[0].x * K} ${Sy + A[0].y * K} L ${Sx + A[0].x} ${Sy + A[0].y}`
            } else {
                path = `M ${round(Pa[i].x)} ${round(Pa[i].y)}`;
            }
            return;
        }

        if (i > 0 && i < item.shapeProps.points.length - 1) {
            alpha[i] = myMath.angleBetweenVectors(V[i].x, V[i].y, -V[i-1].x, -V[i-1].y);
            if (alpha[i] < 0) {
                // should merge left points
                const intersection = myMath.linesIntersection(
                    myMath.createLineEquation(Pa[i-1].x, Pa[i-1].y, Pa[i-1].x + V[i-1].x, Pa[i-1].y + V[i-1].y),
                    myMath.createLineEquation(Pa[i].x, Pa[i].y, Pa[i].x + V[i].x, Pa[i].y + V[i].y),
                );

                if (intersection && alpha[i] < -0.1) {
                    path += ` L ${intersection.x} ${intersection.y}`;
                } else {
                    path += ` L ${Pa[i].x} ${Pa[i].y}`;
                }
            } else {
                // should not merge left points
                path += ` L ${point.x + A[i-1].x} ${point.y + A[i-1].y}  L ${point.x + A[i].x} ${point.y + A[i].y}`;
            }
        }

        // last point
        if (i === item.shapeProps.points.length - 1 && i > 0) {
            const d = V[i - 1].x * V[i - 1].x + V[i - 1].y * V[i - 1].y;
            const arrowLength = item.shapeProps.thickWidth * M;
            if (item.shapeProps.destinationCap === 'triangle' && Math.sqrt(d) > arrowLength) {
                shouldDrawEndArrow = true;
                const Sx = point.x - W[i-1].x * arrowLength;
                const Sy = point.y - W[i-1].y * arrowLength;
                path += ` L ${Sx + A[i-1].x} ${Sy + A[i-1].y} L ${Sx + A[i-1].x * K} ${Sy + A[i-1].y * K} L ${point.x} ${point.y}`
            } else {
                path += ` L ${point.x + A[i-1].x} ${point.y + A[i-1].y}`;
            }
        }
    });

    for (let i = item.shapeProps.points.length - 1; i >=0; i--) {
        const point = item.shapeProps.points[i];
        if (i === item.shapeProps.points.length - 1) {
            if (shouldDrawEndArrow) {
                const Sx = point.x - W[i-1].x * item.shapeProps.thickWidth * M;
                const Sy = point.y - W[i-1].y * item.shapeProps.thickWidth * M;
                path += ` L ${Sx + B[i-1].x * K} ${Sy + B[i-1].y * K} L ${Sx + B[i-1].x} ${Sy + B[i-1].y}`
            } else {
                path += ` L ${point.x + B[i-1].x} ${point.y + B[i-1].y}`;
            }
        } else if (i > 0) {
            if (alpha[i] > 0) {
                // should merge right points
                const intersection = myMath.linesIntersection(
                    myMath.createLineEquation(Pb[i-1].x, Pb[i-1].y, Pb[i-1].x + V[i-1].x, Pb[i-1].y + V[i-1].y),
                    myMath.createLineEquation(Pb[i].x, Pb[i].y, Pb[i].x + V[i].x, Pb[i].y + V[i].y),
                );
                if (intersection && alpha[i] > 0.1) {
                    path += ` L ${intersection.x} ${intersection.y}`;
                } else {
                    path += ` L ${Pb[i].x} ${Pb[i].y}`;
                }
            } else {
                // should not merge right points
                path += ` L ${point.x + B[i].x} ${point.y + B[i].y} L ${point.x + B[i-1].x} ${point.y + B[i-1].y}`;
            }
        } else if (i === 0) {
            if (shouldDrawSourceArrow) {
                const Sx = point.x + W[0].x * item.shapeProps.thickWidth * M;
                const Sy = point.y + W[0].y * item.shapeProps.thickWidth * M;
                path += ` L ${Sx + B[0].x} ${Sy + B[0].y} L ${Sx + B[0].x * K} ${Sy + B[0].y * K} Z`;
            } else {
                path += `L ${point.x + B[i].x} ${point.y + B[i].y} z`;
            }
        }
    }

    return path;
}

function computeLinearPathAndCaps(item) {
    let path = '';
    const caps = [];
    forEach(item.shapeProps.points, (point, i) => {
        if (i === 0) {
            let cap = null;
            if (item.shapeProps.sourceCap && item.shapeProps.sourceCap !== 'empty') {
                const nextPoint = item.shapeProps.points[1];
                cap = computeCapByPosition(point.x, point.y, nextPoint.x, nextPoint.y, item.shapeProps.sourceCapSize, item.shapeProps.sourceCap);
            }
            if (cap) {
                if (cap.prolongLine) {
                    path = `M ${point.x} ${point.y} L ${cap.entryPoint.x} ${cap.entryPoint.y} `;
                } else {
                    path = `M ${cap.entryPoint.x} ${cap.entryPoint.y} `;
                }
                caps.push(cap);
            } else {
                path = `M ${point.x} ${point.y} `;
            }
        } else if (i === item.shapeProps.points.length - 1) {
            let cap = null;
            if (item.shapeProps.destinationCap && item.shapeProps.destinationCap !== 'empty') {
                const prevPoint = item.shapeProps.points[i - 1];
                cap = computeCapByPosition(point.x, point.y, prevPoint.x, prevPoint.y, item.shapeProps.destinationCapSize, item.shapeProps.destinationCap);
            }
            if (cap) {
                path += `L ${cap.entryPoint.x} ${cap.entryPoint.y} `;
                if (cap.prolongLine) {
                    path += `L ${point.x} ${point.y} `;
                }
                caps.push(cap);
            } else {
                path += `L ${point.x} ${point.y} `;
            }
        } else {
            path += ` L ${point.x} ${point.y} `;
        }
    });

    return {
        path,
        caps
    };
}

function computePathAndCaps(item) {
    if (item.shapeProps.points.length < 2) {
        return null;
    }

    if (item.shapeProps.thick) {
        return {
            path: computeThickPath(item),
            caps: []
        };
    }

    if (item.shapeProps.smoothing === 'smooth') {
        return computeSmoothPath(item);
    } else if (item.shapeProps.smoothing === 'step') {
        return computeStepPathAndCaps(item, false, false);
    } else if (item.shapeProps.smoothing === 'step-cut') {
        return computeStepPathAndCaps(item, true, false);
    } else if (item.shapeProps.smoothing === 'step-smooth') {
        return computeStepPathAndCaps(item, true, true);
    } else {
        return computeLinearPathAndCaps(item);
    }
};

function computeRawPath(item) {
    const pathAndCaps = computePathAndCaps(item);
    if (pathAndCaps) {
        return pathAndCaps.path;
    }
    return null;
}

function computeCapByPosition(x1, y1, x2, y2, capSize, capType) {
    if (capType !== 'empty') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const squaredD = dx*dx + dy*dy;
        if (squaredD > 0.0001) {
            const d = Math.sqrt(squaredD);
            return createConnectorCap(x1, y1, dx*capSize/d, dy*capSize/d, capType);
        }
    }
    return null;
}


export function realignConnectorNormal(point, secondPoint) {
    if (point.hasOwnProperty('nx') && point.hasOwnProperty('ny') && secondPoint) {
        const dx = secondPoint.x - point.x;
        const dy = secondPoint.y - point.y;
        const angle = myMath.cosineAngleBetweenVectors(point.nx, point.ny, dx, dy) * 180 / Math.PI;

        if (angle > 90) {
            // inverting the normal
            point.nx = -point.nx;
            point.ny = -point.ny;
        }
    }
};


/**
 * @property {Item} item
 * @property {SchemeContainer} schemeContainer
 * @property {Boolean} isSoft
 * @property {ItemModificationContext} context
 * @property {Number} precision - number of digits after point which it should round to
 */
function readjustItem(item, schemeContainer, isSoft, context, precision) {
    log.info('readjustItem', item.id, item.name, {item, isSoft, context}, precision);

    if (!isSoft) {
        const parentItem = item.meta.parentId ?  schemeContainer.findItemById(item.meta.parentId) : null;
        if (shouldAreaByAdjusted(item)) {
            readjustItemArea(item, parentItem, precision);
        }
    }

    // Realigning connector attachments normals so that it does not get weirdly curved when attached to such shapes as lifeline.
    // But we should avoid realigning in case of pins, because pin normals should be respected

    if (item.shapeProps.sourceItem && !item.shapeProps.sourcePin && item.shapeProps.points.length > 1) {
        realignConnectorNormal(item.shapeProps.points[0], item.shapeProps.points[1]);
    }

    if (item.shapeProps.destinationItem && !item.shapeProps.destinationPin && item.shapeProps.points.length > 1) {
        realignConnectorNormal(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[item.shapeProps.points.length - 2]);
    }

    return true;
}

function shouldAreaByAdjusted(item) {
    return item.shapeProps.points.length > 0;
}

function readjustItemArea(item, parentItem, precision) {
    log.info('readjustItemArea', item.id, item.name, {item}, precision);
    if (item.shapeProps.points.length < 1) {
        return;
    }

    const worldPoints = [];

    forEach(item.shapeProps.points, point => {
        const wp = parentItem ? localPointOnItemToLocalPointOnOtherItem(point.x, point.y, item, parentItem) : worldPointOnItem(point.x, point.y, item);
        worldPoints.push(wp);
    });

    let minX = worldPoints[0].x,
        minY = worldPoints[0].y,
        maxX = worldPoints[0].x,
        maxY = worldPoints[0].y;

    forEach(worldPoints, p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    const newPoints = [];
    forEach(worldPoints, (p, pointIdx) => {
        const originPoint = item.shapeProps.points[pointIdx];
        newPoints.push({
            ...originPoint,
            x: p.x - minX,
            y: p.y - minY,
        });
    });
    item.shapeProps.points = newPoints;

    item.area.r = 0;
    item.area.w = Math.max(1, maxX - minX);
    item.area.h = Math.max(1, maxY - minY);
    item.area.x = minX;
    item.area.y = minY;
}

function getSnappers(item) {
    const snappers = [];

    forEach(item.shapeProps.points, point => {
        const worldPoint = worldPointOnItem(point.x, point.y, item);

        snappers.push({
            item,
            snapperType: 'horizontal',
            value: worldPoint.y
        });
        snappers.push({
            item,
            snapperType: 'vertical',
            value: worldPoint.x
        });
    });
    return snappers;
}

const menuItemPoints = [{"t":"L", "x":4,"y":88}, {"t":"L","x":136,"y":4}];
const groupName = 'Connections';


/**
 * @param {String} editorId
 * @param {SchemeContainer} schemeContainer
 * @param {Item} item
 */
function scriptFunctions(editorId, schemeContainer, item) {
    const withPoint = (pointIdx, callback) => {
        if (pointIdx < 0 || pointIdx >= item.shapeProps.points.length) {
            throw new Error(`Invalid point index: ${pointIdx}`);
        }

        return callback(item.shapeProps.points[pointIdx]);
    }

    const withSVGPathElement = (callback) => {
        const encodedPath = computeRawPath(item);
        if (!item.meta.scriptCache) {
            item.meta.scriptCache = new Map();
        }
        const cachedPath = item.meta.scriptCache.get('svgPath');
        if (cachedPath && cachedPath.encodedPath === encodedPath) {
            return callback(cachedPath.svgElement);
        }
        const shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shadowSvgPath.setAttribute('d', encodedPath);

        item.meta.scriptCache.set('svgPath', {
            encodedPath, svgElement: shadowSvgPath
        });
        return callback(shadowSvgPath);
    };

    const emitItemChanged = () => {
        schemeContainer.readjustItemAndDescendants(item.id, true);
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
    };

    return {
        totalPoints() {
            return item.shapeProps.points.length;
        },

        getPointWorldPos(pointIdx) {
            return withPoint(pointIdx, p => {
                return Vector.fromPoint(worldPointOnItem(p.x, p.y, item));
            });
        },

        setPointWorldPos(pointIdx, x, y) {
            return withPoint(pointIdx, point => {
                if (pointIdx === 0) {
                    item.shapeProps.sourceItem = null;
                } else if (pointIdx === item.shapeProps.points.length - 1) {
                    item.shapeProps.destinationItem = null;
                }
                const lp = localPointOnItem(x, y, item);
                point.x = lp.x;
                point.y = lp.y;
                emitItemChanged();
            });
        },

        addWorldPoint(x, y) {
            item.shapeProps.destinationItem = null;
            const lp = localPointOnItem(x, y, item);
            item.shapeProps.points.push({
                x: lp.x,
                y: lp.y
            });
            emitItemChanged();
            return item.shapeProps.points.length - 1;
        },

        removePoint(pointIdx) {
            if (pointIdx < 0 || pointIdx >= item.shapeProps.points.length) {
                return;
            }
            item.shapeProps.points.splice(pointIdx, 1);
            emitItemChanged();
        },

        getLength() {
            return withSVGPathElement(shadowSvgPath => {
                return shadowSvgPath.getTotalLength();
            });
        },

        getWorldPosAtLength(length) {
            return withSVGPathElement(shadowSvgPath => {
                const p = shadowSvgPath.getPointAtLength(length);
                return Vector.fromPoint(worldPointOnItem(p.x, p.y, item));
            });
        },
    };
}

export default {
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'connector',

        computePath: computeRawPath,
        readjustItem,
        getSnappers,
        scriptFunctions,

        menuItems: [{
            group: groupName,
            name: 'Empty Connector',
            iconUrl: '/assets/images/items/connector-empty.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'empty',
                    points: menuItemPoints,
                }
            }
        }, {
            group: groupName,
            name: 'Step Connector',
            iconUrl: '/assets/images/items/connector-step.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'empty',
                    smoothing: 'step',
                    points: [{x: 4, y: 88}, {x: 70, y: 51}, {x: 136, y: 4}],
                }
            }
        }, {
            group: groupName,
            name: 'Step Connector',
            iconUrl: '/assets/images/items/connector-step-smooth.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'empty',
                    smoothing: 'step-smooth',
                    points: [{x: 4, y: 88}, {x: 70, y: 51}, {x: 136, y: 4}],
                }
            }
        }, {
            group: groupName,
            name: 'Triangle Connector',
            iconUrl: '/assets/images/items/connector-triangle.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'triangle',
                    points: menuItemPoints
                }
            }
        }, {
            group: groupName,
            name: 'Triangle Connector',
            iconUrl: '/assets/images/items/connector-triangle-white.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'triangle-h',
                    points: menuItemPoints,
                }
            }
        }, {
            group: groupName,
            name: 'Arrow Connector',
            iconUrl: '/assets/images/items/connector-arrow.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'empty',
                    destinationCap: 'arrow',
                    points: menuItemPoints
                }
            }
        }, {
            group: groupName,
            name: 'Triangle Connector (Both Sides)',
            iconUrl: '/assets/images/items/connector-triangle-both.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'triangle',
                    destinationCap: 'triangle',
                    points: menuItemPoints
                }
            }
        }, {
            group: groupName,
            name: 'Triangle Connector (Both Sides)',
            iconUrl: '/assets/images/items/connector-triangle-white-both.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'triangle-h',
                    destinationCap: 'triangle-h',
                    points: menuItemPoints,
                }
            }
        }, {
            group: groupName,
            name: 'Arrow Connector (Both Sides)',
            iconUrl: '/assets/images/items/connector-arrow-both.svg',
            item: {
                shapeProps: {
                    thick: false,
                    sourceCap: 'arrow',
                    destinationCap: 'arrow',
                    points: menuItemPoints
                }
            }
        }, {
            group: groupName,
            name: 'Thick Connector',
            iconUrl: '/assets/images/items/connector-arrow-thick.svg',
            item: {
                shapeProps: {
                    sourceCap: 'empty',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    thick: true,
                    thickWidth: 10
                }
            }
        }, {
            group: groupName,
            name: 'Thick Connector (Both Arrows)',
            iconUrl: '/assets/images/items/connector-arrow-thick-both.svg',
            item: {
                shapeProps: {
                    sourceCap: 'triangle',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    thick: true,
                    thickWidth: 10
                }
            }
        }],

        /**
         * Disabling any text slots for curve items. Otherwise users will be confused when they double click on it in edit mode.
         */
        getTextSlots() {
            return [];
        },

        getPins(item) {
            const pins = {};
            forEach(item.shapeProps.points, point => {
                pins[point.id] = {
                    x: point.x,
                    y: point.y
                };
            });
            return pins;
        },

        editorProps: {
            description: 'rich',
        },

        args: {
            strokeColor       : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
            strokeSize        : {type: 'number',        value: 2, name: 'Stroke size', min: 0, softMax: 100},
            strokePattern     : {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
            points            : {type: 'path-points',   value: [], name: 'Path points', hidden: true},
            sourceCap         : {type: 'path-cap',      value: 'empty', name: 'Source Cap'},
            sourceCapSize     : {type: 'number',        value: 20, name: 'Source Cap Size', min: 0, softMax: 100},
            destinationCap    : {type: 'path-cap',      value: 'empty', name: 'Destination Cap'},
            destinationCapSize: {type: 'number',        value: 20, name: 'Destination Cap Size', min: 0, softMax: 100},

            smoothing         : {type: 'choice',        value: 'smooth', options: ['linear', 'smooth', 'step', 'step-cut', 'step-smooth'], name: 'Smoothing Type'},
            stepSize          : {type: 'number',        value: 10, name: 'Step size', depends: {smoothing: ['step-cut', 'step-smooth']}, min: 0, softMax: 100},

            thick     : {type: 'boolean',       value: false, name: 'Thick'},
            fill      : {type: 'advanced-color',value: {type: 'solid', color: 'rgba(255,255,255,1.0)'}, name: 'Fill', depends: {thick: true}},
            thickWidth: {type: 'number',        value: 10, name: 'Thick Width', min: 1, max: 1000, depends: {thick: true}},

            autoAttach: {type: 'boolean', value: true, name: 'Attach automatically', description: 'Let connector attach to other items. Disable this property if you don\'t want your connector to stick to other items'},

            sourceItem             : {type: 'element',  value: null, name: 'Source Item', description: 'Attach this curve to an item as a source', hidden: true},
            destinationItem        : {type: 'element',  value: null, name: 'Destination Item', description: 'Attach this curve to an item as a destination', hidden: true},
            sourceItemPosition     : {type: 'number',   value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
            destinationItemPosition: {type: 'number',   value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
            sourcePin              : {type: 'string', value: '', name: 'Source Item Pin', description: 'If non-empty it means that the connector is attached to a specific pin', hidden: true},
            destinationPin         : {type: 'string', value: '', name: 'Destination Item Pin', description: 'If non-empty it means that the connector is attached to a specific pin', hidden: true},
        },
    },

    mounted() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChange);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChange);
    },

    data() {
        const pathAndCaps = computePathAndCaps(this.item);
        return {
            shapePath: pathAndCaps? pathAndCaps.path : null,
            caps: pathAndCaps? pathAndCaps.caps: null
        }
    },

    methods: {
        onItemChange() {
            log.info('onItemChange', this.item.id, this.item.name, this.item);
            if (this.item.shape !== 'connector') {
                return;
            }
            const pathAndCaps = computePathAndCaps(this.item);

            if (pathAndCaps) {
                this.shapePath = pathAndCaps.path;
                this.caps = pathAndCaps.caps;
            }

            log.info('computed path and caps', this.item.id, this.item.name, this.shapePath, this.caps);
            this.$forceUpdate();
        },
    },

    computed: {
        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
        svgFill() {
            if (this.item.shapeProps.thick) {
                return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
            }
            return 'none';
        }
    }
}
</script>
