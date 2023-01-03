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
    </g>
</template>

<script>
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
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
        }
    },

    methods: {
        onItemChange() {
            log.info('onItemChange', this.item.id, this.item.name, this.item);

            this.shapePath = computePath(this.item);
            this.$forceUpdate();
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