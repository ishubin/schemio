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
import forEach from 'lodash/forEach';
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
    return computeCurvePath(item.shapeProps.points, item.shapeProps.closed);
};


/**
 * Takes points of the curve and simplifies them (tries to deletes as much points as possible)
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

    forEach(points, (point, i) => {
        if (point.break) {
            currentCurvePoints = [];
            curves.push(currentCurvePoints);
        }
        currentCurvePoints.push(point);
    });

    let newPoints = [];

    forEach(curves, (curvePoints, i) => {
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
    if (item.shapeProps.points.length < 1) {
        return;
    }

    const worldPoints = [];

    forEach(item.shapeProps.points, point => {
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

        worldPoints.push(p);
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
        if (p.t === 'B' || p.t === 'A') {
            minX = Math.min(minX, p.p1.x);
            minY = Math.min(minY, p.p1.y);
            maxX = Math.max(maxX, p.p1.x);
            maxY = Math.max(maxY, p.p1.y);
        }
        if (p.t === 'B') {
            minX = Math.min(minX, p.p2.x);
            minY = Math.min(minY, p.p2.y);
            maxX = Math.max(maxX, p.p2.x);
            maxY = Math.max(maxY, p.p2.y);
        }
    });

    const newPoints = [];
    forEach(worldPoints, (p, idx) => {
        const itemPoint = {
            x: p.x - minX,
            y: p.y - minY,
            t: p.t
        };
        if (p.t === 'B' || p.t === 'A') {
            itemPoint.x1 = p.p1.x - p.x;
            itemPoint.y1 = p.p1.y - p.y;
        }
        if (p.t === 'B') {
            itemPoint.x2 = p.p2.x - p.x;
            itemPoint.y2 = p.p2.y - p.y;
        }
        if (item.shapeProps.points[idx].break) {
            itemPoint.break = true;
        }
        newPoints.push(itemPoint);
    });
    item.shapeProps.points = newPoints;

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