<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            style="stroke-linejoin: round;"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

        <path v-for="cap in caps" :d="cap.path"
            :data-item-id="item.id"
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
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import { createConnectorCap } from './ConnectorCaps';
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

    if (item.shapeProps.closed && item.shapeProps.points.length) {
        path += connectPoints(item.shapeProps.points[item.shapeProps.points.length - 1], item.shapeProps.points[0]);
        path += ' Z';
    }

    return path;
};



/**
 * @property {Item} item 
 * @property {Object} schemeContainer 
 * @property {Boolean} isSoft 
 * @property {ItemModificationContext} context 
 */
function readjustItem(item, schemeContainer, isSoft, context) {
    log.info('readjustItem', item.id, item.name, {item, isSoft, context});

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


export default {
    props: ['item'],
    components: {AdvancedFill},

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

        controlPoints: null,

        args: {
            fill              : {type: 'advanced-color',value: {type: 'none'}, name: 'Fill'},
            strokeColor       : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
            strokeSize        : {type: 'number',        value: 2, name: 'Stroke size'},
            strokePattern     : {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
            closed            : {type: 'boolean',       value: false, name: 'Closed path'},
            points            : {type: 'curve-points',  value: [], name: 'Curve points'},
            sourceCap         : {type: 'curve-cap',     value: 'empty', name: 'Source Cap'},
            sourceCapSize     : {type: 'number',        value: 20, name: 'Source Cap Size'},
            sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill'},
            destinationCap    : {type: 'curve-cap',     value: 'empty', name: 'Destination Cap'},
            destinationCapSize: {type: 'number',        value: 20, name: 'Destination Cap Size'},
            destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill'},
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
        },

        fill() {
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>