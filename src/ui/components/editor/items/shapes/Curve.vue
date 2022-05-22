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


function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}


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

function forAllPoints(item, callback) {
    item.shapeProps.paths.forEach((path, pathIndex) => {
        path.points.forEach((point, pointIndex) => {
            callback(point, pathIndex, pointIndex);
        });
    });
}

function readjustItemArea(item, precision) {
    let bounds = null;

    const updateBounds = (x, y) => {
        bounds.x1 = Math.min(bounds.x1, x);
        bounds.y1 = Math.min(bounds.y1, y);
        bounds.x2 = Math.max(bounds.x2, x);
        bounds.y2 = Math.max(bounds.y2, y);
    };
    forAllPoints(item, (p) => {
        if (!bounds) {
            bounds = {
                x1: p.x,
                y1: p.y,
                x2: p.x,
                y2: p.y
            };
        }
        updateBounds(p.x, p.y);


        if (p.t === 'B' || p.t === 'A') {
            updateBounds(p.x + p.x1, p.y + p.y1);
        }
        if (p.t === 'B') {
            updateBounds(p.x + p.x2, p.y + p.y2);
        }
    });

    forAllPoints(item, (p, pathIndex, pointIndex) => {
        const itemPoint = {
            x: p.x - bounds.x1,
            y: p.y - bounds.y1,
            t: p.t
        };
        if (p.t === 'B' || p.t === 'A') {
            itemPoint.x1 = p.x1;
            itemPoint.y1 = p.y1;
        }
        if (p.t === 'B') {
            itemPoint.x2 = p.x2;
            itemPoint.y2 = p.y2;
        }

        item.shapeProps.paths[pathIndex].points[pointIndex] = itemPoint;
    });

    const boundsWorldPoint = worldPointOnItem(bounds.x1, bounds.y1, item);

    item.area.w = Math.max(0, bounds.x2 - bounds.x1);
    item.area.h = Math.max(0, bounds.y2 - bounds.y1);

    const position = myMath.findTranslationMatchingWorldPoint(boundsWorldPoint.x, boundsWorldPoint.y, item.area, item.meta.transformMatrix);
    item.area.x = position.x;
    item.area.y = position.y;
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