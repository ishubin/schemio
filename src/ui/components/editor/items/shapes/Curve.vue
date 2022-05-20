<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
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
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import { createConnectorCap } from './ConnectorCaps';
import '../../../../typedef';
import { computeCurvePath } from './StandardCurves';

const log = new Logger('Curve');


function computePath(item) {
    let path = '';
    item.shapeProps.paths.forEach(curvePath => {
        const segmentPath = computeCurvePath(curvePath.points, curvePath.closed);
        if (segmentPath) {
            path += segmentPath + ' ';
        }
    });
    return path;
};


/**
 * Takes points of the curve and simplifies them (tries to delete as many points as possible)
 * @property {Array} points - points of the curve 
 * @property {Number} epsilon - minimum distance of the points to keep (used in Ramer-Douglas-Peucker algorithm)
 * @returns {Array} simplified curve points 
 */
export function simplifyCurvePoints(points, epsilon) {
    if (!epsilon) {
        epsilon = 5;
    }

    // first we need to break the curve into smaller curves based on the point breaks

    const curves = [];

    let currentCurvePoints = [];
    curves.push(currentCurvePoints);

    points.forEach((point, i) => {
        if (point.break) {
            currentCurvePoints = [];
            curves.push(currentCurvePoints);
        }
        currentCurvePoints.push(point);
    });

    let newPoints = [];

    curves.forEach((curvePoints, i) => {
        const simplifiedPoints = myMath.smoothCurvePoints(myMath.simplifyCurvePointsUsingRDP(curvePoints, epsilon));

        if (i > 0 && curvePoints.length > 0) {
            curvePoints[0].break = true;
        }
        newPoints = newPoints.concat(simplifiedPoints);
    });

    return newPoints;
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

    return true;
}

function readjustItemArea(item, precision) {
    const worldPoints = [];
    item.shapeProps.paths.forEach((path, pathId) => {
        path.points.forEach((point, pointId) => {
            const p = worldPointOnItem(point.x, point.y, item);
            p.t = point.t;

            if (point.t === 'B' || point.t === 'A') {
                const p1 = worldPointOnItem(point.x + point.x1, point.y + point.y1, item);
                p.p1 = p1;
            }
            if (point.t === 'B') {
                const p2 = worldPointOnItem(point.x + point.x2, point.y + point.y2, item);
                p.p2 = p2;
            }

            worldPoints.push({pathId, pointId, point: p});
        });
    });

    if (worldPoints.length < 1) {
        return;
    }

    let minX = worldPoints[0].point.x,
        minY = worldPoints[0].point.y,
        maxX = worldPoints[0].point.x,
        maxY = worldPoints[0].point.y;
    
    worldPoints.forEach(p => {
        minX = Math.min(minX, p.point.x);
        minY = Math.min(minY, p.point.y);
        maxX = Math.max(maxX, p.point.x);
        maxY = Math.max(maxY, p.point.y);
        if (p.point.t === 'B' || p.point.t === 'A') {
            minX = Math.min(minX, p.point.p1.x);
            minY = Math.min(minY, p.point.p1.y);
            maxX = Math.max(maxX, p.point.p1.x);
            maxY = Math.max(maxY, p.point.p1.y);
        }
        if (p.point.t === 'B') {
            minX = Math.min(minX, p.point.p2.x);
            minY = Math.min(minY, p.point.p2.y);
            maxX = Math.max(maxX, p.point.p2.x);
            maxY = Math.max(maxY, p.point.p2.y);
        }
    });

    worldPoints.forEach(p => {
        const itemPoint = {
            x: p.point.x - minX,
            y: p.point.y - minY,
            t: p.point.t
        };
        if (p.point.t === 'B' || p.point.t === 'A') {
            itemPoint.x1 = p.point.p1.x - p.point.x;
            itemPoint.y1 = p.point.p1.y - p.point.y;
        }
        if (p.point.t === 'B') {
            itemPoint.x2 = p.point.p2.x - p.point.x;
            itemPoint.y2 = p.point.p2.y - p.point.y;
        }

        item.shapeProps.paths[p.pathId].points[p.pointId] = itemPoint;
    });

    item.area.r = 0;
    item.area.w = Math.max(0, maxX - minX);
    item.area.h = Math.max(0, maxY - minY);

    const position = myMath.findTranslationMatchingWorldPoint(minX, minY, item.area, item.meta.transformMatrix);
    item.area.x = position.x;
    item.area.y = position.y;
}

function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}

function getSnappers(item) {
    const snappers = [];

    item.shapeProps.paths.forEach(path => {
        path.points.forEach(point => {
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
    });
    return snappers;
}


export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'curve',

        menuItems: [],

        computePath,
        readjustItem,
        getSnappers,

        getPins(item) {
            return [];
        },

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
            // points            : {type: 'curve-points',  value: [], name: 'Curve points', hidden: true},
            paths             : {type: 'curve-paths',   value: [], name: 'Paths', hidden: true},
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