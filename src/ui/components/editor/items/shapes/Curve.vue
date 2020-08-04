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
import shortid from 'shortid';
import {forEach} from 'lodash';
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import Path from '../../../../scheme/Path';
import Shape from './Shape';
import utils from '../../../../utils';


function connectPoints(p1, p2) {
    if (p1.t === 'L' && p2.t === 'B') {
        return `Q ${p2.x1} ${p2.y1} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'L') {
        return `Q ${p1.x2} ${p1.y2} ${p2.x} ${p2.y} `;
    } else if (p1.t === 'B' && p2.t === 'B') {
        return `C ${p1.x2} ${p1.y2} ${p2.x1} ${p2.y1} ${p2.x} ${p2.y} `;
    }
    return `L ${p2.x} ${p2.y} `;
}

function getPointOnItemPath(item, positionOnPath, schemeContainer) {
    const shape = Shape.find(item.shape);
    if (shape && shape.computePath) {
        const path = shape.computePath(item);
        if (path) {
            const shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            shadowSvgPath.setAttribute('d', path);
            const point = shadowSvgPath.getPointAtLength(positionOnPath);
            return schemeContainer.worldPointOnItem(point.x, point.y, item);
        }
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
        if (prevPoint) {
            path += connectPoints(prevPoint, point);
        } else {
            path = `M ${point.x} ${point.y} `;
        }
        prevPoint = point;
    });

    if (item.shapeProps.closed && item.shapeProps.points.length && !item.shapeProps.sourceItem && !item.shapeProps.destinationItem) {
        path += connectPoints(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[0]);
        path += ' Z';
    }

    return path;
};

function readjustItem(item, schemeContainer, isSoft) {
    const worldPoint = schemeContainer.worldPointOnItem(0, 0, item);
    if (item.shapeProps.sourceItem) {
        const sourceItem = schemeContainer.findFirstElementBySelector(item.shapeProps.sourceItem);
        if (sourceItem && sourceItem.id !== item.id) {
            const sourceWorldPoint = getPointOnItemPath(sourceItem, item.shapeProps.sourceItemPosition, schemeContainer);
            if (sourceWorldPoint) {
                const sourcePoint = schemeContainer.localPointOnItem(sourceWorldPoint.x, sourceWorldPoint.y, item);
                item.shapeProps.points[0] = {
                    x: sourcePoint.x,
                    y: sourcePoint.y,
                };
            }
        } else {
            item.shapeProps.sourceItem = null;
        }
    }

    if (item.shapeProps.destinationItem && item.shapeProps.destinationItem && item.shapeProps.points.length > 1) {
        const destinationItem = schemeContainer.findFirstElementBySelector(item.shapeProps.destinationItem);
        if (destinationItem && destinationItem.id !== item.id && destinationItem.shape) {
            const destinationWorldPoint = getPointOnItemPath(destinationItem, item.shapeProps.destinationItemPosition, schemeContainer);
            if (destinationWorldPoint) {
                const destinationPoint = schemeContainer.localPointOnItem(destinationWorldPoint.x, destinationWorldPoint.y, item);
                item.shapeProps.points[item.shapeProps.points.length - 1] = {
                    t: 'L',
                    x: destinationPoint.x,
                    y: destinationPoint.y,
                };
            }
        } else {
            item.shapeProps.destinationItem = null;
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
            minX = Math.min(minX, point.x1 + item.area.x, point.x2 + item.area.x);
            minY = Math.min(minY, point.y1 + item.area.y, point.y2 + item.area.y);
            maxX = Math.max(maxX, point.x1 + item.area.x, point.x2 + item.area.x);
            maxY = Math.max(maxY, point.y1 + item.area.y, point.y2 + item.area.y);
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
        if (point.t === 'B') {
            point.x1 += dx;
            point.y1 += dy;
            point.x2 += dx;
            point.y2 += dy;
        }
    });
}


export default {
    props: ['item'],
    components: {AdvancedFill},

    computePath,
    readjustItem,

    /**
     * Disabling any text slots for curve items. Otherwise users will be confused when they double click on it in edit mode.
     */ 
    getTextSlots() {
        return [];
    },

    editorProps: {
        description: 'rich',
        text: 'none'
    },

    controlPoints: {
        make(item, pointId) {
            if (!pointId) {
                const controlPoints = {};
                forEach(item.shapeProps.points, (point, pointIndex) => {
                    controlPoints[pointIndex] = {x: point.x, y: point.y};
                });
                return controlPoints;
            } else {
                if (item.shapeProps.points[pointId]) {
                    return {x: item.shapeProps.points[pointId].x, y: item.shapeProps.points[pointId].y};
                }
            }
        },
        handleDrag(item, pointId, originalX, originalY, dx, dy) {
            const point = item.shapeProps.points[pointId];
            if (point) {
                const realDx = originalX + dx - point.x;
                const realDy = originalY + dy - point.y;

                point.x = originalX + dx;
                point.y = originalY + dy;
                if (point.t === 'B') {
                    point.x1 += realDx;
                    point.y1 += realDy;
                    point.x2 += realDx;
                    point.y2 += realDy;
                }
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
        sourceCap         : {type: 'choice',        value: Path.CapType.EMPTY, name: 'Source Cap',      options: Path.CapType.values()},
        sourceCapSize     : {type: 'number',        value: 5, name: 'Source Cap Size'},
        sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill'},
        destinationCap    : {type: 'choice',        value: Path.CapType.EMPTY, name: 'Destination Cap', options: Path.CapType.values()},
        destinationCapSize: {type: 'number',        value: 5, name: 'Destination Cap Size'},
        destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill'},
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
            backgroundImageId: `bimg-${shortid.generate()}`
        }
    },

    methods: {
        onItemChange() {
            this.shapePath = computePath(this.item);
            this.caps = this.computeCaps(this.shapePath);
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
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>