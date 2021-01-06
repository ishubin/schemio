<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

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
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import Path from '../../../../scheme/Path';
import Shape from './Shape';
import utils from '../../../../utils';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import '../../../../typedef';

const log = new Logger('Curve');


function connectPoints(p1, p2) {
    if (p1.t === 'L' && p2.t === 'B') {
        return `Q ${p2.x1+p2.x} ${p2.y1+p2.y} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'L') {
        return `Q ${p1.x2+p1.x} ${p1.y2+p1.y} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'B') {
        return `C ${p1.x2+p1.x} ${p1.y2+p1.y} ${p2.x1+p2.x} ${p2.y1+p2.y} ${p2.x} ${p2.y} `;
    }
    return `L ${p2.x} ${p2.y} `;
}

/**
 * Computes item outline path and return a shadow svg path for it
 * @returns {SVGPathElement}
 */
function computeOutlinePath(item) {
    const shape = Shape.find(item.shape);
    if (shape && shape.computeOutline) {
        const path = shape.computeOutline(item);
        if (path) {
            const shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shadowSvgPath.setAttribute('d', path);
            return shadowSvgPath;
        }
    }
    return null;
}

function getPointOnItemPath(item, shadowSvgPath, positionOnPath, schemeContainer) {
    if (shadowSvgPath) {
        const point = shadowSvgPath.getPointAtLength(positionOnPath);
        return schemeContainer.worldPointOnItem(point.x, point.y, item);
    }
    // returning the center of item if it failed to find its path
    return schemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
}

function computePath(item) {
    if (item.shapeProps.points.length < 2) {
        return null;
    }
    let path = 'M 0 0';

    let prevPoint = null;

    forEach(item.shapeProps.points, point => {
        if (!prevPoint) {
            path = `M ${point.x} ${point.y} `;
        } else if (!point.break) {
            path += connectPoints(prevPoint, point);
        } else {
            path += `M ${point.x} ${point.y} `;
        }
        prevPoint = point;
    });

    if (item.shapeProps.closed && item.shapeProps.points.length && !item.shapeProps.sourceItem && !item.shapeProps.destinationItem) {
        path += connectPoints(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[0]);
        path += ' Z';
    }

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
 * @param {Function} callback - function which is used to pass changed attachment item position
 */
function readjustCurveAttachment(schemeContainer, item, curvePoint, attachmentItemSelector, attachmentItemPosition, context, callback) {
    const attachmentItem = schemeContainer.findFirstElementBySelector(attachmentItemSelector);
    if (attachmentItem && attachmentItem.id !== item.id && attachmentItem.shape) {
        const shadowSvgPath = computeOutlinePath(attachmentItem);
        let oldPoint = null;
        let worldOldPoint = null;
        if (context && context.id) {
            if (item.meta[DST_READJUST_CTX] && item.meta[DST_READJUST_CTX].id === context.id) {
                oldPoint  = item.meta[DST_READJUST_CTX].oldPoint;
                worldOldPoint  = item.meta[DST_READJUST_CTX].worldOldPoint;
            } else {
                oldPoint = curvePoint;
                worldOldPoint = schemeContainer.worldPointOnItem(oldPoint.x, oldPoint.y, item);
                item.meta[DST_READJUST_CTX] = { id: context.id, oldPoint, worldOldPoint };
            }
        } else {
            oldPoint = item.shapeProps.points[item.shapeProps.points.length - 1];
            worldOldPoint = schemeContainer.worldPointOnItem(oldPoint.x, oldPoint.y, item);
        }
        let destinationPoint = null;

        let distanceOnPath = attachmentItemPosition;
        
        if (context && (context.rotated || context.resized)) {
            const localToDestinationItemOldPoint = schemeContainer.localPointOnItem(worldOldPoint.x, worldOldPoint.y, attachmentItem);
            const closestPointOnPath = myMath.closestPointOnPath(localToDestinationItemOldPoint.x, localToDestinationItemOldPoint.y, shadowSvgPath);

            // readjusting destination attachment to try to keep it in the same world point while the item is rotated, resized or moved
            distanceOnPath = closestPointOnPath.distance;

            const destinationWorldPoint = getPointOnItemPath(attachmentItem, shadowSvgPath, distanceOnPath, schemeContainer);
            destinationPoint = schemeContainer.localPointOnItem(destinationWorldPoint.x, destinationWorldPoint.y, item);
        } else {
            const destinationWorldPoint = getPointOnItemPath(attachmentItem, shadowSvgPath, attachmentItemPosition, schemeContainer);
            destinationPoint = schemeContainer.localPointOnItem(destinationWorldPoint.x, destinationWorldPoint.y, item);
        }
        const newPoint = {
            t: oldPoint.t,
            x: destinationPoint.x,
            y: destinationPoint.y,
        };
        if (oldPoint.t === 'B') {
            newPoint.x1 = oldPoint.x1;
            newPoint.y1 = oldPoint.y1;
            newPoint.x2 = oldPoint.x2;
            newPoint.y2 = oldPoint.y2;
        }
        callback(newPoint, distanceOnPath);
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

    if (item.shapeProps.connector) {
        if (item.shapeProps.sourceItem) {
            readjustCurveAttachment(schemeContainer, item, item.shapeProps.points[0], item.shapeProps.sourceItem, item.shapeProps.sourceItemPosition, context, (newPoint, newSourceItemPosition) => {
                item.shapeProps.points[0] = newPoint;
                item.shapeProps.sourceItemPosition = newSourceItemPosition;
            });
        }

        if (item.shapeProps.destinationItem && item.shapeProps.destinationItem && item.shapeProps.points.length > 1) {
            readjustCurveAttachment(schemeContainer, item, item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.destinationItem, item.shapeProps.destinationItemPosition, context, (newPoint, newDestinationItemPosition) => {
                item.shapeProps.points[item.shapeProps.points.length - 1] = newPoint;
                item.shapeProps.destinationItemPosition = newDestinationItemPosition;
            });
        }
    }

    if (!isSoft) {
        readjustItemArea(item);
    }

    return true;
}

function readjustItemArea(item) {
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
        if (point.t === 'B') {
            minX = Math.min(minX, point.x1 + point.x + item.area.x, point.x2 + point.x + item.area.x);
            minY = Math.min(minY, point.y1 + point.y + item.area.y, point.y2 + point.y + item.area.y);
            maxX = Math.max(maxX, point.x1 + point.x + item.area.x, point.x2 + point.x + item.area.x);
            maxY = Math.max(maxY, point.y1 + point.y + item.area.y, point.y2 + point.y + item.area.y);
        }
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

const _zeroTransform = {x: 0, y: 0, r: 0};
function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
}


export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeType: 'vue',

    computePath,
    readjustItem,

    /**
     * Disabling any text slots for curve items. Otherwise users will be confused when they double click on it in edit mode.
     */ 
    getTextSlots() {
        return [];
    },

    getSnappers(item) {
        // for now only generating snapper if this curve is just a simple straight line
        if (item.shapeProps.points.length === 2) {
            const p0 = item.shapeProps.points[0];
            const p1 = item.shapeProps.points[1];
            if (p0.t === 'L' && p0.t === 'L') {
                const w0 = worldPointOnItem(p0.x, p0.y, item);
                const w1 = worldPointOnItem(p1.x, p1.y, item);
                if (Math.abs(w0.x - w1.x) < 0.0001) {
                    return [{
                        item,
                        snapperType: 'vertical',
                        value: w0.x
                    }];
                }
                if (Math.abs(w0.y - w1.y) < 0.0001) {
                    return [{
                        item,
                        snapperType: 'horizontal',
                        value: w0.y
                    }];
                }
            }
        }
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
        /**
         * @param {Item} item
         * @param {String} pointId
         * @param {Number} originalX
         * @param {Number} originaly
         * @param {Number} dx
         * @param {Number} dy
         * @param {Snapper} snapper
         * @param {SchemeContainer} schemeContainer
         */
        handleDrag(item, pointId, originalX, originalY, dx, dy, snapper, schemeContainer) {
            const point = item.shapeProps.points[pointId];
            if (point) {
                const worldPoint = schemeContainer.worldPointOnItem(originalX + dx, originalY + dy, item);
                const localPoint = schemeContainer.localPointOnItem(snapper.snapX(worldPoint.x), snapper.snapY(worldPoint.y), item);
                point.x = localPoint.x;
                point.y = localPoint.y;
            }
        }
    },


    args: {
        fill              : {type: 'advanced-color',value: {type: 'none'}, name: 'Fill'},
        strokeColor       : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize        : {type: 'number',        value: 2, name: 'Stroke size'},
        strokePattern     : {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
        closed            : {type: 'boolean',       value: false, name: 'Closed path'},
        points            : {type: 'curve-points',  value: [], name: 'Curve points'},
        sourceCap         : {type: 'curve-cap',     value: Path.CapType.EMPTY, name: 'Source Cap'},
        sourceCapSize     : {type: 'number',        value: 5, name: 'Source Cap Size'},
        sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill'},
        destinationCap    : {type: 'curve-cap',     value: Path.CapType.EMPTY, name: 'Destination Cap'},
        destinationCapSize: {type: 'number',        value: 5, name: 'Destination Cap Size'},
        destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill'},

        connector         : {type: 'boolean',       value: false, name: 'Item Connector', description: 'Allows to attach it edge curve to other items'},
        sourceItem        : {type: 'element',       value: null, name: 'Source Item', description: 'Attach this curve to an item as a source', hidden: true},
        destinationItem   : {type: 'element',       value: null, name: 'Destination Item', description: 'Attach this curve to an item as a destination', hidden: true},
        sourceItemPosition: {type: 'number',        value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
        destinationItemPosition: {type: 'number',   value: 0, name: 'Position On Source Item', description: 'Distance on the path of the item where this curve should be attached to', hidden: true},
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

            let sourceCap         = this.item.shapeProps.sourceCap || Path.CapType.EMPTY;
            let destinationCap    = this.item.shapeProps.destinationCap || Path.CapType.EMPTY;

            if (sourceCap === Path.CapType.EMPTY && destinationCap === Path.CapType.EMPTY) {
                return caps;
            }

            const shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shadowSvgPath.setAttribute('d', svgPath);

            const totalLength = shadowSvgPath.getTotalLength();
            if (totalLength < 3)  {
                return caps;
            }

            const p1 = shadowSvgPath.getPointAtLength(0);
            const p1d = shadowSvgPath.getPointAtLength(2);

            let cap = this.createCap(p1.x, p1.y, p1d.x, p1d.y, sourceCap, this.item.shapeProps.sourceCapSize, this.item.shapeProps.sourceCapFill);
            if (cap) {
                caps.push(cap);
            }

            const p2 = shadowSvgPath.getPointAtLength(totalLength);
            const p2d = shadowSvgPath.getPointAtLength(totalLength - 2);
            cap = this.createCap(p2.x, p2.y, p2d.x, p2d.y, destinationCap, this.item.shapeProps.destinationCapSize, this.item.shapeProps.destinationCapFill);
            if (cap) {
                caps.push(cap);
            }

            return caps;
        },

        createCap(x, y, px, py, capType, capSize, capFill) {
            let r = 1;
            if (capSize) {
                r = capSize /2;
            }

            if (capType === Path.CapType.CIRCLE) {
                return {
                    path: `M ${x - r} ${y}   a ${r},${r} 0 1,0 ${r * 2},0  a ${r},${r} 0 1,0 -${r*2},0`,
                    fill: capFill
                };
            } else if (capType === Path.CapType.ARROW) {
                return this.createArrowCap(x, y, px, py, capSize, capFill, false);
            } else if (capType === Path.CapType.TRIANGLE) {
                return this.createArrowCap(x, y, px, py, capSize, capFill, true);
            }
            return null;
        },

        createArrowCap(x, y, px, py, capSize, capFill, close) {
            var Vx = px - x, Vy = py - y;
            var V = Vx * Vx + Vy * Vy;
            if (V !== 0) {
                V = Math.sqrt(V);
                Vx = Vx/V;
                Vy = Vy/V;

                var Pax = x + (Vx * 2 - Vy) * capSize;
                var Pay = y + (Vy * 2 + Vx) * capSize;
                var Pbx = x + (Vx * 2 + Vy) * capSize;
                var Pby = y + (Vy * 2 - Vx) * capSize;
                var path = `M ${Pax} ${Pay} L ${x} ${y} L ${Pbx} ${Pby}`;
                if (close) {
                    path += ' z';
                }
                return {
                    path: path,
                    fill: close ? capFill : 'none'
                }
            }
            return null;
        },
    },

    computed: {
        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            if (this.item.shapeProps.connector) {
                return 'none';
            }
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>