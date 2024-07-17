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
            :stroke-dashoffset="item.meta.strokeOffset"
            :fill="fill"></path>
    </g>
</template>

<script>
import AdvancedFill from '../AdvancedFill.vue';
import {computeSvgFill} from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import {Logger} from '../../../../logger';
import myMath from '../../../../myMath';
import '../../../../typedef';
import { computeCurvePath, convertCurvePointToItemScale, convertCurvePointToRelative } from './StandardCurves';
import EditorEventBus from '../../EditorEventBus';
import {Vector} from '../../../../templater/vector';
import { localPointOnItem, worldPointOnItem } from '../../../../scheme/ItemMath';
import ItemProperties from '../../properties/ItemProperties.vue';

const log = new Logger('Path');


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

/**
 * @param {String} editorId
 * @param {SchemeContainer} schemeContainer
 * @param {Item} item
 */
function scriptFunctions(editorId, schemeContainer, item) {
    const emitItemChanged = () => {
        schemeContainer.readjustItemAndDescendants(item.id, true);
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
    };

    const withPath = (pathIdx, callback) => {
        if (pathIdx < 0 || pathIdx >= item.shapeProps.length) {
            throw new Error(`Invalid path index: ${pathIdx}`);
        }

        return callback(item.shapeProps.paths[pathIdx]);
    };

    const withPoint = (path, pointIdx, callback) => {
        if (pointIdx < 0 || pointIdx >= path.points.length) {
            throw new Error(`Invalid point index: ${pointIdx}`);
        }

        return callback(path.points[pointIdx]);
    }

    const ensurePathIsValid = () => {
        if (item.area.w < 1 || item.area.h < 1) {
            const allPathWorldPoints = item.shapeProps.paths.map(path => {
                return path.points.map(point => {
                    const p = convertCurvePointToItemScale(point, item.area.w, item.area.h);
                    return worldPointOnItem(p.x, p.y, item);
                });
            });

            item.area.w = 100;
            item.area.h = 100;

            item.shapeProps.paths.forEach((path, pathIdx) => {
                path.points.forEach((point, pointIdx) => {
                    const wp = allPathWorldPoints[pathIdx][pointIdx];
                    const localPoint = localPointOnItem(wp.x, wp.y, item);
                    const p = convertCurvePointToRelative(localPoint, item.area.w, item.area.h);
                    point.x = p.x;
                    point.y = p.y;
                });
            });
        }
    };

    return {
        totalPaths() {
            return item.shapeProps.paths.length;
        },

        totalPathPoints(pathIdx) {
            return withPath(pathIdx, path => path.points.length);
        },

        isPathClosed(pathIdx) {
            return withPath(pathIdx, path => path.closed);
        },

        closePath(pathIdx) {
            withPath(pathIdx, path => {
                path.closed = true;
                emitItemChanged();
            });
        },

        openPath(pathIdx) {
            withPath(pathIdx, path => {
                path.closed = false;
                emitItemChanged();
            });
        },

        getPathPointWorldPos(pathIdx, pointIdx) {
            return withPath(pathIdx, path => {
                return withPoint(path, pointIdx, point => {
                    const p = convertCurvePointToItemScale(point, item.area.w, item.area.h);
                    return Vector.fromPoint(worldPointOnItem(p.x, p.y, item));
                })
            });
        },

        setPathPointWorldPos(pathIdx, pointIdx, x, y) {
            ensurePathIsValid();
            return withPath(pathIdx, path => {
                return withPoint(path, pointIdx, point => {
                    const localPoint = localPointOnItem(x, y, item);
                    const p = convertCurvePointToRelative(localPoint, item.area.w, item.area.h);
                    point.x = p.x;
                    point.y = p.y;
                    emitItemChanged();
                });
            });
        },

        addPath() {
            ensurePathIsValid();
            item.shapeProps.paths.push({
                closed: false,
                points: []
            });
            return item.shapeProps.paths.length - 1;
        },

        addPoint(pathIdx, x, y) {
            return withPath(pathIdx, path => {
                const localPoint = localPointOnItem(x, y, item);
                const p = convertCurvePointToRelative(localPoint, item.area.w, item.area.h);
                path.points.push({
                    t: 'L',
                    x: p.x,
                    y: p.y
                });
                emitItemChanged();
            });
        },

        addBeizerPoint(pathIdx, x, y, x1, y1, x2, y2) {
            return withPath(pathIdx, path => {
                const lp = localPointOnItem(x, y, item);
                const lp1 = localPointOnItem(x + x1, y + y1, item);
                const lp2 = localPointOnItem(x + x2, y + y2, item);

                const p = convertCurvePointToRelative({
                    t: 'B',
                    x: lp.x,
                    y: lp.y,
                    x1: lp1.x - lp.x,
                    y1: lp1.y - lp.y,
                    x2: lp2.x - lp.x,
                    y2: lp2.y - lp.y,
                }, item.area.w, item.area.h);
                path.points.push(p);
                emitItemChanged();
                return path.points.length - 1;
            });
        },
    };
}


export default {
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'path',

        menuItems: [],

        computePath,
        getSnappers,

        getPins(item) {
            const pins = {};

            item.shapeProps.paths.forEach(path => {
                path.points.forEach(p => {
                    const cp = convertCurvePointToItemScale(p, item.area.w, item.area.h);
                    pins[p.id] = {
                        x: cp.x,
                        y: cp.y
                    };
                });
            });
            return pins;
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

        scriptFunctions
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
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        }
    }
}
</script>