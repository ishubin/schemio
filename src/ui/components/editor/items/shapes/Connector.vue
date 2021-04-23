<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            style="stroke-linejoin: round;"
            fill="none"></path>

        <path v-for="cap in caps" :d="cap.path"
            :stroke="item.shapeProps.strokeColor"
            :stroke-width="item.shapeProps.strokeSize"
            :fill="cap.fill"
            stroke-linejoin="round"
        />
    </g>
</template>

<script>
import forEach from 'lodash/forEach';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import { createConnectorCap } from './ConnectorCaps';
import '../../../../typedef';

const log = new Logger('Connector');


function getPointOnItemPath(item, shadowSvgPath, positionOnPath, schemeContainer) {
    if (shadowSvgPath) {
        const point = shadowSvgPath.getPointAtLength(positionOnPath);
        return schemeContainer.worldPointOnItem(point.x, point.y, item);
    }
    // returning the center of item if it failed to find its path
    return schemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
}

function computeSmoothPath(item) {
    const points = item.shapeProps.points;

    // special situation, it is easier to handle it separately
    if (points.length === 2 && item.shapeProps.sourceItem && item.shapeProps.destinationItem
         && typeof points[0].bx !== 'undefined' && typeof points[1].bx !== 'undefined') {

        const k = myMath.distanceBetweenPoints(points[0].x, points[0].y, points[1].x, points[1].y) / 3;

        return `M ${points[0].x} ${points[0].y} `
            +`C ${points[0].x + k * points[0].bx} ${points[0].y + k * points[0].by}`
            + ` ${points[1].x + k * points[1].bx}  ${points[1].y + k * points[1].by}`
            + ` ${points[1].x} ${points[1].y}`;
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
            path = `M ${point.x} ${point.y} `;

        } else if (i === 1 && item.shapeProps.sourceItem && typeof previousPoint.bx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i < points.length - 1) {
                vx = vectors[i].x;
                vy = vectors[i].y;
            }
            path += ` C ${previousPoint.x + k * previousPoint.bx} ${previousPoint.y + k * previousPoint.by} ${point.x - k * vx} ${point.y - k * vy} ${point.x} ${point.y}`;

        } else if (i === points.length - 1 && item.shapeProps.destinationItem && typeof point.bx !== 'undefined') {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let vx = 0;
            let vy = 0;
            if (i > 1) {
                vx = vectors[i-1].x;
                vy = vectors[i-1].y;
            }
            path += ` C ${previousPoint.x + k * vx} ${previousPoint.y + k *vy}  ${point.x + k*point.bx} ${point.y + k*point.by} ${point.x} ${point.y}`;

        } else {
            const k = myMath.distanceBetweenPoints(previousPoint.x, previousPoint.y, point.x, point.y) / smoothingFactor;
            let pvx = vectors[i - 1].x;
            let pvy = vectors[i - 1].y;
            let vx = vectors[i].x;
            let vy = vectors[i].y;

            path += ` C ${previousPoint.x + k * pvx} ${previousPoint.y + k * pvy}  ${point.x - k * vx} ${point.y - k * vy} ${point.x} ${point.y}`;
        }
        previousPoint = point;
    });
    return path;
}

function computePath(item) {
    if (item.shapeProps.points.length < 2) {
        return null;
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

/**
 * @param {SchemeContainer} schemeContainer
 * @param {Item} item
 * @param {CurvePoint} curvePoint
 * @param {String} attachmentItemSelector
 * @param {Number} attachmentItemPosition
 * @param {ItemModificationContext} context
 * @param {Boolean} isSource 
 * @param {Function} callback - function which is used to pass changed attachment item position
 */
function readjustCurveAttachment(schemeContainer, item, curvePoint, attachmentItemSelector, attachmentItemPosition, context, isSource, callback) {
    const attachmentItem = schemeContainer.findFirstElementBySelector(attachmentItemSelector);
    if (attachmentItem && attachmentItem.id !== item.id && attachmentItem.shape) {
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
            by: normal.y
        };
        callback(newPoint, distanceOnPath, shadowSvgPath);
    }
}

/**
 * @property {Item} item 
 * @property {Object} schemeContainer 
 * @property {Boolean} isSoft 
 * @property {ItemModificationContext} context 
 */
function readjustItem(item, schemeContainer, isSoft, context) {
    log.info('readjustItem', item.id, item.name, {item, isSoft, context});

    if (item.shapeProps.sourceItem) {
        readjustCurveAttachment(schemeContainer, item, item.shapeProps.points[0], item.shapeProps.sourceItem, item.shapeProps.sourceItemPosition, context, true, (newPoint, newSourceItemPosition) => {
            item.shapeProps.points[0] = newPoint;
            item.shapeProps.sourceItemPosition = newSourceItemPosition;

        });
    }

    if (item.shapeProps.destinationItem && item.shapeProps.destinationItem && item.shapeProps.points.length > 1) {
        readjustCurveAttachment(schemeContainer, item, item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.destinationItem, item.shapeProps.destinationItemPosition, context, false, (newPoint, newDestinationItemPosition) => {
            item.shapeProps.points[item.shapeProps.points.length - 1] = newPoint;
            item.shapeProps.destinationItemPosition = newDestinationItemPosition;
        });
    }

    if (!isSoft) {
        readjustItemArea(item);
    }

    return true;
}

function readjustItemArea(item) {
    log.info('readjustItemArea', item.id, item.name, {item});
    if (item.shapeProps.points.length < 1) {
        return;
    }

    let minX = item.shapeProps.points[0].x + item.area.x,
        minY = item.shapeProps.points[0].y + item.area.y,
        maxX = minX,
        maxY = minY;

    forEach(item.shapeProps.points, point => {
        minX = Math.min(minX, point.x + item.area.x);
        minY = Math.min(minY, point.y + item.area.y);
        maxX = Math.max(maxX, point.x + item.area.x);
        maxY = Math.max(maxY, point.y + item.area.y);
    });

    const dx = item.area.x - minX;
    const dy = item.area.y - minY;
    item.area.x = minX;
    item.area.y = minY;
    item.area.w = maxX - minX;
    item.area.h = maxY - minY;

    forEach(item.shapeProps.points, point => {
        point.x += dx;
        point.y += dy;
    });
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

const _zeroTransform = {x: 0, y: 0, r: 0};
function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
}


export default {
    props: ['item'],
    components: {},

    shapeConfig: {
        shapeType: 'vue',

        computePath,
        readjustItem,
        getSnappers,

        /**
         * Disabling any text slots for curve items. Otherwise users will be confused when they double click on it in edit mode.
         */ 
        getTextSlots() {
            return [];
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
            sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill'},
            destinationCap    : {type: 'curve-cap',     value: 'empty', name: 'Destination Cap'},
            destinationCapSize: {type: 'number',        value: 20, name: 'Destination Cap Size'},
            destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill'},

            smoothing         : {type: 'choice',        value: 'smooth', options: ['linear', 'smooth'], name: 'Smoothing Type'},

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
        }
    }
}
</script>
