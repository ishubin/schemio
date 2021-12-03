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
            style="stroke-linejoin: round;"
            :fill="svgFill"></path>

        <g v-if="!item.shapeProps.fat">
            <path v-for="cap in caps" :d="cap.path"
                :data-item-id="item.id"
                :stroke="item.shapeProps.strokeColor"
                :stroke-width="item.shapeProps.strokeSize"
                :fill="cap.fill"
                stroke-linejoin="round"
            />
        </g>
    </g>
</template>

<script>
import forEach from 'lodash/forEach';
import map from 'lodash/forEach';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import { createConnectorCap } from './ConnectorCaps';
import '../../../../typedef';
import AdvancedFill from '../AdvancedFill.vue';

const log = new Logger('Connector');


function getPointOnItemPath(item, shadowSvgPath, positionOnPath, schemeContainer) {
    if (shadowSvgPath) {
        const point = shadowSvgPath.getPointAtLength(positionOnPath);
        return schemeContainer.worldPointOnItem(point.x, point.y, item);
    }
    // returning the center of item if it failed to find its path
    return schemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
}

function round(value) {
    return myMath.roundPrecise2(value);
}

function computeSmoothPath(item) {
    const points = item.shapeProps.points;

    // special situation, it is easier to handle it separately
    if (points.length === 2 && item.shapeProps.sourceItem && item.shapeProps.destinationItem
         && typeof points[0].bx !== 'undefined' && typeof points[1].bx !== 'undefined') {

        const k = myMath.distanceBetweenPoints(points[0].x, points[0].y, points[1].x, points[1].y) / 3;

        return `M ${round(points[0].x)} ${round(points[0].y)} `
            +`C ${round(points[0].x + k * points[0].bx)} ${round(points[0].y + k * points[0].by)}`
            + ` ${round(points[1].x + k * points[1].bx)}  ${round(points[1].y + k * points[1].by)}`
            + ` ${round(points[1].x)} ${round(points[1].y)}`;
    }

    let path = '';
    let previousPoint = null;

    const vectors = [];
    forEach(item.shapeProps.points, (point, i) => {
        let prevPoint = point;
        if (i > 0) {
            prevPoint = item.shapeProps.points[i - 1];
        }
        let nextPoint = point;
        if (i < item.shapeProps.points.length - 1) {
            nextPoint = item.shapeProps.points[i + 1];
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
            path = `M ${round(point.x)} ${round(point.y)} `;

        } else if (i === 1 && item.shapeProps.sourceItem && typeof previousPoint.bx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i < points.length - 1) {
                vx = vectors[i].x;
                vy = vectors[i].y;
            }
            path += ` C ${round(previousPoint.x + k * previousPoint.bx)} ${round(previousPoint.y + k * previousPoint.by)} ${round(point.x - k * vx)} ${round(point.y - k * vy)} ${round(point.x)} ${round(point.y)}`;

        } else if (i === points.length - 1 && item.shapeProps.destinationItem && typeof point.bx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i > 1) {
                vx = vectors[i-1].x;
                vy = vectors[i-1].y;
            }
            path += ` C ${round(previousPoint.x + k * vx)} ${round(previousPoint.y + k *vy)}  ${round(point.x + k*point.bx)} ${round(point.y + k*point.by)} ${round(point.x)} ${round(point.y)}`;

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
    return path;
}

function computeFatPath(item) {
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
                x: W[i].y * item.shapeProps.fatWidth,
                y: -W[i].x * item.shapeProps.fatWidth
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
            const arrowLength = item.shapeProps.fatWidth * M;
            if (item.shapeProps.sourceCap === 'triangle' && Math.sqrt(d) > arrowLength) {
                shouldDrawSourceArrow = true;
                const Sx = point.x + W[0].x * item.shapeProps.fatWidth * M;
                const Sy = point.y + W[0].y * item.shapeProps.fatWidth * M;
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
            const arrowLength = item.shapeProps.fatWidth * M;
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
                const Sx = point.x - W[i-1].x * item.shapeProps.fatWidth * M;
                const Sy = point.y - W[i-1].y * item.shapeProps.fatWidth * M;
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
                const Sx = point.x + W[0].x * item.shapeProps.fatWidth * M;
                const Sy = point.y + W[0].y * item.shapeProps.fatWidth * M;
                path += ` L ${Sx + B[0].x} ${Sy + B[0].y} L ${Sx + B[0].x * K} ${Sy + B[0].y * K} Z`;
            } else {
                path += `L ${point.x + B[i].x} ${point.y + B[i].y} z`;
            }
        }
    }

    return path;
}

function computePath(item) {
    if (item.shapeProps.points.length < 2) {
        return null;
    }

    if (item.shapeProps.fat) {
        return computeFatPath(item);
    }

    if (item.shapeProps.smoothing === 'smooth') {
        return computeSmoothPath(item);
    }

    let path = '';
    forEach(item.shapeProps.points, (point, i) => {
        if (i === 0) {
            path = `M ${point.x} ${point.y} `;
        } else {
            path += ` L ${point.x} ${point.y} `;
        }
    });

    return path;
};


const DST_READJUST_CTX = Symbol('dstReadjustCtx');
const SRC_READJUST_CTX = Symbol('srcReadjustCtx');



function realignNormal(point, secondPoint) {
    if (point.hasOwnProperty('bx') && point.hasOwnProperty('by') && secondPoint) {
        const dx = secondPoint.x - point.x;
        const dy = secondPoint.y - point.y;
        const angle = myMath.cosineAngleBetweenVectors(point.bx, point.by, dx, dy) * 180 / Math.PI;

        if (angle > 90) {
            // inverting the normal
            point.bx = -point.bx;
            point.by = -point.by;
        }
    }
};

/**
 * @param {SchemeContainer} schemeContainer
 * @param {Item} item
 * @param {CurvePoint} curvePoint
 * @param {CurvePoint} secondCurvePoint - for source edge it would be second, for destination edge it would the the one before last
 * @param {String} attachmentItemSelector
 * @param {Number} attachmentItemPosition
 * @param {ItemModificationContext} context
 * @param {Boolean} isSource 
 * @param {Function} callback - function which is used to pass changed attachment item position
 */
function readjustCurveAttachment(schemeContainer, item, curvePoint, secondCurvePoint, attachmentItemSelector, attachmentItemPosition, context, isSource, callback) {
    const attachmentItem = schemeContainer.findFirstElementBySelector(attachmentItemSelector);
    if (attachmentItem && attachmentItem.id !== item.id && attachmentItem.shape) {
        if (attachmentItemPosition < 0) {
            // this means that connector is attached to item pin

            const pinIndex = Math.round(-attachmentItemPosition - 1);
            const pinPoint = schemeContainer.getItemWorldPinPoint(attachmentItem, pinIndex);
            const localPinPoint = schemeContainer.localPointOnItem(pinPoint.x, pinPoint.y, item)
            if (pinPoint) {
                const newPoint = {
                    t: 'L',
                    x: localPinPoint.x,
                    y: localPinPoint.y,
                };
                if (pinPoint.hasOwnProperty('nx')) {
                    newPoint.bx = pinPoint.nx;
                    newPoint.by = pinPoint.ny;
                }

                callback(newPoint, attachmentItemPosition);
                
            }
            return;
        }


        const shadowSvgPath = schemeContainer.getSvgOutlineOfItem(attachmentItem);
        if (!shadowSvgPath) {
            return;
        }

        let oldPoint = null;
        let worldOldPoint = null;
        let metaCtxKey = SRC_READJUST_CTX;
        if (!isSource) {
            metaCtxKey = DST_READJUST_CTX;
        }
        if (context && context.id) {
            if (item.meta[metaCtxKey] && item.meta[metaCtxKey].id === context.id) {
                oldPoint  = item.meta[metaCtxKey].oldPoint;
                worldOldPoint  = item.meta[metaCtxKey].worldOldPoint;
            } else {
                oldPoint = curvePoint;
                worldOldPoint = schemeContainer.worldPointOnItem(oldPoint.x, oldPoint.y, item);
                item.meta[metaCtxKey] = { id: context.id, oldPoint, worldOldPoint };
            }
        } else {
            oldPoint = item.shapeProps.points[item.shapeProps.points.length - 1];
            worldOldPoint = schemeContainer.worldPointOnItem(oldPoint.x, oldPoint.y, item);
        }
        let attachmentPoint = null;

        let distanceOnPath = attachmentItemPosition;

        if (context && (context.rotated || context.resized)) {
            const localToAttachmentItemOldPoint = schemeContainer.localPointOnItem(worldOldPoint.x, worldOldPoint.y, attachmentItem);
            const closestPointOnPath = myMath.closestPointOnPath(localToAttachmentItemOldPoint.x, localToAttachmentItemOldPoint.y, shadowSvgPath);

            // readjusting destination attachment to try to keep it in the same world point while the item is rotated, resized or moved
            distanceOnPath = closestPointOnPath.distance;

            const attachmentWorldPoint = getPointOnItemPath(attachmentItem, shadowSvgPath, distanceOnPath, schemeContainer);
            attachmentPoint = schemeContainer.localPointOnItem(attachmentWorldPoint.x, attachmentWorldPoint.y, item);
        } else {
            const attachmentWorldPoint = getPointOnItemPath(attachmentItem, shadowSvgPath, attachmentItemPosition, schemeContainer);
            attachmentPoint = schemeContainer.localPointOnItem(attachmentWorldPoint.x, attachmentWorldPoint.y, item);
        }

        const normal = schemeContainer.calculateNormalOnPointInItemOutline(attachmentItem, distanceOnPath, shadowSvgPath);
        const newPoint = {
            t: oldPoint.t,
            x: attachmentPoint.x,
            y: attachmentPoint.y,
            bx: normal.x,
            by: normal.y,
        };

        callback(newPoint, distanceOnPath);
    }
}

/**
 * @property {Item} item 
 * @property {Object} schemeContainer 
 * @property {Boolean} isSoft 
 * @property {ItemModificationContext} context 
 * @property {Number} precision - number of digits after point which it should round to
 */
function readjustItem(item, schemeContainer, isSoft, context, precision) {
    log.info('readjustItem', item.id, item.name, {item, isSoft, context}, precision);

    if (!isSoft) {
        readjustItemArea(item, precision);
    }


    if (item.shapeProps.sourceItem) {
        readjustCurveAttachment(schemeContainer,
            item,
            item.shapeProps.points[0],
            item.shapeProps.points[1],
            item.shapeProps.sourceItem,
            item.shapeProps.sourceItemPosition,
            context,
            true,
            (newPoint, newSourceItemPosition) => {
                item.shapeProps.points[0] = newPoint;
                item.shapeProps.sourceItemPosition = newSourceItemPosition;
            }
        );
    }

    if (item.shapeProps.destinationItem && item.shapeProps.points.length > 1) {
        readjustCurveAttachment(schemeContainer,
            item,
            item.shapeProps.points[item.shapeProps.points.length - 1],
            item.shapeProps.points[item.shapeProps.points.length - 2],
            item.shapeProps.destinationItem,
            item.shapeProps.destinationItemPosition,
            context,
            false,
            (newPoint, newDestinationItemPosition) => {
                item.shapeProps.points[item.shapeProps.points.length - 1] = newPoint;
                item.shapeProps.destinationItemPosition = newDestinationItemPosition;
            }
        );
    }

    if (item.shapeProps.sourceItem && item.shapeProps.points.length > 1) {
        realignNormal(item.shapeProps.points[0], item.shapeProps.points[1]);
    }

    if (item.shapeProps.destinationItem && item.shapeProps.points.length > 1) {
        realignNormal(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[item.shapeProps.points.length - 2]);
    }

    return true;
}

function readjustItemArea(item, precision) {
    log.info('readjustItemArea', item.id, item.name, {item}, precision);
    if (item.shapeProps.points.length < 1) {
        return;
    }

    const worldPoints = [];

    forEach(item.shapeProps.points, point => {
        worldPoints.push(worldPointOnItem(point.x, point.y, item));
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
    forEach(worldPoints, p => {
        newPoints.push({
            x: p.x - minX,
            y: p.y - minY,
        });
    });
    item.shapeProps.points = newPoints;

    item.area.r = 0;
    item.area.w = Math.max(0, maxX - minX);
    item.area.h = Math.max(0, maxY - minY);

    const position = myMath.findTranslationMatchingWorldPoint(minX, minY, item.area, item.meta.transformMatrix);
    item.area.x = position.x;
    item.area.y = position.y;
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

function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}


const menuItemPoints = [{"t":"L", "x":4,"y":88}, {"t":"L","x":136,"y":4}];
const groupName = 'Connections';

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'connector',

        computePath,
        readjustItem,
        getSnappers,

        menuItems: [{
            group: groupName,
            name: 'Empty Connector',
            iconUrl: '/assets/images/items/connector-empty.svg',
            item: {
                shapeProps: {
                    fat: false,
                    sourceCap: 'empty',
                    destinationCap: 'empty',
                    points: menuItemPoints,
                }
            }
        }, {
            group: groupName,
            name: 'Triangle Connector',
            iconUrl: '/assets/images/items/connector-triangle.svg',
            item: {
                shapeProps: {
                    fat: false,
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
                    fat: false,
                    sourceCap: 'empty',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    destinationCapFill: 'rgba(255, 255, 255, 1.0)'
                }
            }
        }, {
            group: groupName,
            name: 'Arrow Connector',
            iconUrl: '/assets/images/items/connector-arrow.svg',
            item: {
                shapeProps: {
                    fat: false,
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
                    fat: false,
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
                    fat: false,
                    sourceCap: 'triangle',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    sourceCapFill: 'rgba(255, 255, 255, 1.0)',
                    destinationCapFill: 'rgba(255, 255, 255, 1.0)'
                }
            }
        }, {
            group: groupName,
            name: 'Arrow Connector (Both Sides)',
            iconUrl: '/assets/images/items/connector-arrow-both.svg',
            item: {
                shapeProps: {
                    fat: false,
                    sourceCap: 'arrow',
                    destinationCap: 'arrow',
                    points: menuItemPoints
                }
            }
        }, {
            group: groupName,
            name: 'Fat Connector',
            iconUrl: '/assets/images/items/connector-arrow-fat.svg',
            item: {
                shapeProps: {
                    sourceCap: 'empty',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    fat: true,
                    fatWidth: 10
                }
            }
        }, {
            group: groupName,
            name: 'Fat Connector (Both Arrows)',
            iconUrl: '/assets/images/items/connector-arrow-fat-both.svg',
            item: {
                shapeProps: {
                    sourceCap: 'triangle',
                    destinationCap: 'triangle',
                    points: menuItemPoints,
                    fat: true,
                    fatWidth: 10
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
            return map(item.shapeProps.points, point => {
                return {
                    x: point.x,
                    y: point.y
                };
            });
        },

        editorProps: {
            description: 'rich',
        },

        controlPoints: {
            make(item, pointId) {
                if (!pointId) {
                    const controlPoints = {};
                    forEach(item.shapeProps.points, (point, pointIndex) => {
                        controlPoints[pointIndex] = {x: point.x, y: point.y, isEdgeStart: pointIndex === 0, isEdgeEnd: pointIndex === item.shapeProps.points.length - 1};
                    });
                    return controlPoints;
                } else {
                    const pId = parseInt(pointId);
                    if (item.shapeProps.points[pointId]) {
                        return {x: item.shapeProps.points[pointId].x, y: item.shapeProps.points[pointId].y, isEdgeStart: pId === 0, isEdgeEnd: pId === item.shapeProps.points.length - 1};
                    }
                }
            },

            handleDrag(item, pointId, originalX, originalY, dx, dy, snapper, schemeContainer) {
                //do nothing as control point dragging is handled in StateDragItem.js
            }
        },


        args: {
            strokeColor       : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
            strokeSize        : {type: 'number',        value: 2, name: 'Stroke size'},
            strokePattern     : {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
            points            : {type: 'curve-points',  value: [], name: 'Curve points', hidden: true},
            sourceCap         : {type: 'curve-cap',     value: 'empty', name: 'Source Cap'},
            sourceCapSize     : {type: 'number',        value: 20, name: 'Source Cap Size'},
            sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill', depends: {fat: false}},
            destinationCap    : {type: 'curve-cap',     value: 'empty', name: 'Destination Cap'},
            destinationCapSize: {type: 'number',        value: 20, name: 'Destination Cap Size'},
            destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill', depends: {fat: false}},

            smoothing         : {type: 'choice',        value: 'smooth', options: ['linear', 'smooth'], name: 'Smoothing Type'},

            fat               : {type: 'boolean',       value: false, name: 'Fat'},
            fill              : {type: 'advanced-color',value: {type: 'solid', color: 'rgba(255,255,255,1.0)'}, name: 'Fill', depends: {fat: true}},
            fatWidth          : {type: 'number',        value: 10, name: 'Fat Width', min: 1, max: 1000, depends: {fat: true}},

            sourceItem        : {type: 'element',       value: null, name: 'Source Item', description: 'Attach this curve to an item as a source', hidden: true},
            destinationItem   : {type: 'element',       value: null, name: 'Destination Item', description: 'Attach this curve to an item as a destination', hidden: true},
            sourceItemPosition: {type: 'number',        value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
            destinationItemPosition: {type: 'number',   value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
        },
    },

    mounted() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChange);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChange);
    },

    data() {
        const shapePath = computePath(this.item);
        return {
            shapePath: shapePath,
            caps: this.computeCaps(shapePath),
        }
    },

    methods: {
        onItemChange() {
            log.info('onItemChange', this.item.id, this.item.name, this.item);

            this.shapePath = computePath(this.item);
            this.caps = this.computeCaps(this.shapePath);
            log.info('computed path and caps', this.item.id, this.item.name, this.shapePath, this.caps);
            this.$forceUpdate();
        },

        computeCaps(svgPath) {
            if (this.item.shapeProps.fat) {
                return [];
            }

            const caps = [];

            let sourceCap         = this.item.shapeProps.sourceCap || 'empty';
            let destinationCap    = this.item.shapeProps.destinationCap || 'empty';

            if (sourceCap === 'empty' && destinationCap === 'empty') {
                return caps;
            }

            const shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shadowSvgPath.setAttribute('d', svgPath);

            const totalLength = shadowSvgPath.getTotalLength();
            if (totalLength < 3)  {
                return caps;
            }

            let cap = this.computeCapByPosition(shadowSvgPath, 0, this.item.shapeProps.sourceCapSize, sourceCap, this.item.shapeProps.sourceCapFill);
            if (cap) {
                caps.push(cap);
            }

            cap = this.computeCapByPosition(shadowSvgPath, totalLength, totalLength - this.item.shapeProps.destinationCapSize, destinationCap, this.item.shapeProps.destinationCapFill);
            if (cap) {
                caps.push(cap);
            }

            return caps;
        },

        computeCapByPosition(shadowSvgPath, d1, d2, capType, capFill) {
            if (capType !== 'empty') {
                const p1 = shadowSvgPath.getPointAtLength(d1);
                const p2 = shadowSvgPath.getPointAtLength(d2);

                const squaredD = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
                if (squaredD > 0.01) {
                    return createConnectorCap(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y, capType, capFill);
                }
            }
            return null;
        }

    },

    computed: {
        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
        svgFill() {
            if (this.item.shapeProps.fat) {
                return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
            }
            return 'none';
        }
    }
}
</script>
