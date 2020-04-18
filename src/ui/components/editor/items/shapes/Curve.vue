<template>
    <g>
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
import {forEach} from 'lodash';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import Connector from '../../../../scheme/Connector';
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
    // to avoid internal loops in case curve items are attached to one another
    if (item.shape !== 'curve') {
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
    }

    // returning the center of item if it failed to find its path
    const worldPoint = schemeContainer.worldPointOnItem(item.area.w / 2, item.area.h / 2, item);
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

function readjustItem(item, schemeContainer) {
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
        if (destinationItem && destinationItem.id !== item.id && destinationItem.shape !== 'curve') {
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
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    readjustItem,

    editorProps: {
        description: 'rich',
        text: 'none'
    },

    args: {
        strokeColor       : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        fill              : {type: 'boolean',       value: false, name: 'Fill'},
        fillColor         : {type: 'color',         value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        closed            : {type: 'boolean',       value: false, name: 'Closed path'},
        strokeSize        : {type: 'number',        value: 2, name: 'Stroke size'},
        strokePattern     : {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
        points            : {type: 'curve-points',  value: [], name: 'Curve points'},
        sourceCap         : {type: 'choice',        value: Connector.CapType.EMPTY, name: 'Source Cap',      options: Connector.CapType.values()},
        sourceCapSize     : {type: 'number',        value: 10, name: 'Source Cap Size'},
        destinationCap    : {type: 'choice',        value: Connector.CapType.EMPTY, name: 'Destination Cap', options: Connector.CapType.values()},
        destinationCapSize: {type: 'number',        value: 10, name: 'Destination Cap Size'},
        sourceItem        : {type: 'element',       value: null, name: 'Source Item', description: 'Attach this curve to an item as a source'},
        destinationItem   : {type: 'element',       value: null, name: 'Destination Item', description: 'Attach this curve to an item as a destination'},
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
            this.shapePath = computePath(this.item);
            this.caps = this.computeCaps(this.shapePath);
            this.$forceUpdate();
        },

        computeCaps(svgPath) {
            const caps = [];

            let sourceCap         = this.item.shapeProps.sourceCap || Connector.CapType.EMPTY;
            let destinationCap    = this.item.shapeProps.destinationCap || Connector.CapType.EMPTY;

            if (sourceCap === Connector.CapType.EMPTY && destinationCap === Connector.CapType.EMPTY) {
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

            let cap = this.createCap(p1.x, p1.y, p1d.x, p1d.y, sourceCap, this.item.shapeProps.sourceCapSize);
            if (cap) {
                caps.push(cap);
            }

            const p2 = shadowSvgPath.getPointAtLength(totalLength);
            const p2d = shadowSvgPath.getPointAtLength(totalLength - 2);
            cap = this.createCap(p2.x, p2.y, p2d.x, p2d.y, destinationCap, this.item.shapeProps.destinationCapSize);
            if (cap) {
                caps.push(cap);
            }

            return caps;
        },

        createCap(x, y, px, py, capType, capSize) {
            let r = 1;
            if (capSize) {
                r = capSize /2;
            }

            if (capType === Connector.CapType.CIRCLE) {
                return {
                    path: `M ${x - r} ${y}   a ${r},${r} 0 1,0 ${r * 2},0  a ${r},${r} 0 1,0 -${r*2},0`,
                    fill: this.item.shapeProps.fillColor
                };
            } else if (capType === Connector.CapType.ARROW) {
                return this.createArrowCap(x, y, px, py, false);
            } else if (capType === Connector.CapType.TRIANGLE) {
                return this.createArrowCap(x, y, px, py, true);
            }
            return null;
        },

        createArrowCap(x, y, px, py, close) {
            var Vx = px - x, Vy = py - y;
            var V = Vx * Vx + Vy * Vy;
            if (V !== 0) {
                V = Math.sqrt(V);
                Vx = Vx/V;
                Vy = Vy/V;

                var size = 5;
                var Pax = x + (Vx * 2 - Vy) * size;
                var Pay = y + (Vy * 2 + Vx) * size;
                var Pbx = x + (Vx * 2 + Vy) * size;
                var Pby = y + (Vy * 2 - Vx) * size;
                var path = `M ${Pax} ${Pay} L ${x} ${y} L ${Pbx} ${Pby}`;
                if (close) {
                    path += ' z';
                }
                return {
                    path: path,
                    fill: close ? this.item.shapeProps.fillColor : 'none'
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
            if (this.item.shapeProps.fill) {
                return this.item.shapeProps.fillColor;
            }
            return 'none';
        }
    }
}
</script>