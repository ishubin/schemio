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
import EditorEventBus from '../../EditorEventBus';

const log = new Logger('Path');


function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}


function computePath(item) {
    let svgPath = '';
    item.shapeProps.paths.forEach(path => {
        const segmentPath = computeCurvePath(item.area.w, item.area.h, path.points, path.closed);
        if (segmentPath) {
            svgPath += segmentPath + ' ';
        }
    });
    return svgPath;
};


/**
 * Takes points of the path and simplifies them (tries to delete as many points as possible)
 * @property {Array} points - points of the path
 * @property {Number} epsilon - minimum distance of the points to keep (used in Ramer-Douglas-Peucker algorithm)
 * @returns {Array} simplified path points
 */
export function simplifyPathPoints(points, epsilon) {
    if (!epsilon) {
        epsilon = 5;
    }

    // first we need to break the curve into smaller curves based on the point breaks

    const curves = [];

    let currentPathPoints = [];
    curves.push(currentPathPoints);

    points.forEach((point, i) => {
        if (point.break) {
            currentPathPoints = [];
            curves.push(currentPathPoints);
        }
        currentPathPoints.push(point);
    });

    let newPoints = [];

    curves.forEach((curvePoints, i) => {
        const simplifiedPoints = myMath.smoothPathPoints(myMath.simplifyPathPointsUsingRDP(curvePoints, epsilon));

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
        // readjustItemArea(item, precision);
    }

    return true;
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
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'path',

        menuItems: [],

        computePath,
        readjustItem,
        getSnappers,

        getPins(item) {
            return [];
        },

        /**
         * Disabling any text slots for path items. Otherwise users will be confused when they double click on it in edit mode.
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
            paths             : {type: 'path-array',   value: [], name: 'Paths', hidden: true},
            sourceCap         : {type: 'path-cap',     value: 'empty', name: 'Source Cap'},
            sourceCapSize     : {type: 'number',        value: 20, name: 'Source Cap Size'},
            sourceCapFill     : {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Source Cap Fill'},
            destinationCap    : {type: 'path-cap',     value: 'empty', name: 'Destination Cap'},
            destinationCapSize: {type: 'number',        value: 20, name: 'Destination Cap Size'},
            destinationCapFill: {type: 'color',         value: 'rgba(30,30,30,1.0)', name: 'Destination Cap Fill'},
        },
    },

    mounted() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChange);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChange);
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