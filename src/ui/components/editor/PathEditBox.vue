<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <path v-for="segment in pathSegments"
            data-type="path-segment"
            :data-path-index="segment.pathId"
            :data-path-segment-index="segment.segmentId"
            :d="segment.path"
            fill="none"
            stroke="rgba(0,0,0,0.0)"
            :stroke-width="`${strokeSize}px`"
            />
        <g v-for="(path, pathId) in curvePaths">
            <g v-for="(point, pointId) in path.points" class="path-control-points">
                <g v-if="point.t === 'B'">
                    <line :x1="point.x" :y1="point.y" :x2="point.x1+point.x" :y2="point.y1+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                    <line :x1="point.x" :y1="point.y" :x2="point.x2+point.x" :y2="point.y2+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                </g>

                <circle
                    data-type="path-point"
                    :data-path-point-index="pointId"
                    :data-path-index="pathId"
                    :cx="point.x" :cy="point.y"
                    :r="5/safeZoom"
                    :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>


                <g v-if="point.t === 'B'">
                    <path
                        data-type="path-control-point"
                        :data-path-point-index="pointId"
                        :data-path-index="pathId"
                        data-path-control-point-index="1"
                        :transform="`translate(${point.x1+point.x} ${point.y1+point.y})`"
                        :d="`M ${5*(point.vx1 + point.vy1)/safeZoom} ${5*(point.vy1 - point.vx1)/safeZoom}  l ${-10*point.vx1/safeZoom} ${-10*point.vy1/safeZoom}  l ${-10*point.vy1/safeZoom} ${10*point.vx1/safeZoom} l ${10*point.vx1/safeZoom} ${10*point.vy1/safeZoom} z`"
                        :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>
                    <path
                        data-type="path-control-point"
                        :data-path-point-index="pointId"
                        :data-path-index="pathId"
                        data-path-control-point-index="2"
                        :transform="`translate(${point.x2+point.x} ${point.y2+point.y})`"
                        :d="`M ${5*(point.vx2 + point.vy2)/safeZoom} ${5*(point.vy2 - point.vx2)/safeZoom}  l ${-10*point.vx2/safeZoom} ${-10*point.vy2/safeZoom}  l ${-10*point.vy2/safeZoom} ${10*point.vx2/safeZoom} l ${10*point.vx2/safeZoom} ${10*point.vy2/safeZoom} z`"
                        :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>
                </g>

                <g v-if="point.t === 'A'">
                    <circle
                        data-type="path-control-point"
                        :data-path-point-index="pointId"
                        :data-path-index="pathId"
                        data-path-control-point-index="1"
                        :cx="point.h * (path.points[(pointId+1)%path.points.length].y - point.y) / 100 + (path.points[(pointId+1)%path.points.length].x + point.x) / 2"
                        :cy="point.h * (point.x - path.points[(pointId+1)%path.points.length].x) / 100 + (path.points[(pointId+1)%path.points.length].y + point.y) / 2"
                        :r="5/safeZoom"
                        fill="rgba(255, 255, 255, 0.1)" :stroke="point.selected ? controlPointsColor : boundaryBoxColor" :stroke-width="3/safeZoom"/>
                </g>
            </g>
        </g>

    </g>
</template>
<script>
import { worldPointOnItem } from '../../scheme/SchemeContainer';
import EditorEventBus from './EditorEventBus';
import { computeCurvePath, convertCurvePointToItemScale, PATH_POINT_CONVERSION_SCALE } from './items/shapes/StandardCurves';

function convertPathPointToWorld(p, item) {
    const wp = worldPointOnItem(p.x, p.y, item);
    wp.t = p.t;
    if (p.hasOwnProperty('x1')) {
        const p1 = worldPointOnItem(p.x + p.x1, p.y + p.y1, item);
        wp.x1 = p1.x - wp.x;
        wp.y1 = p1.y - wp.y;
    }
    if (p.hasOwnProperty('x2')) {
        const p1 = worldPointOnItem(p.x + p.x2, p.y + p.y2, item);
        wp.x2 = p1.x - wp.x;
        wp.y2 = p1.y - wp.y;
    }
    if (p.hasOwnProperty('h')) {
        wp.h = p.h;
    }
    return wp;
}

export default {
    props: {
        editorId           : {type: String, required: true},
        curvePaths         : { type: Object, required: true},
        pathPointsUpdateKey: {type: Number, required: true},
        item               : {type: Object},
        zoom               : {type: Number},
        boundaryBoxColor   : {type: String},
        controlPointsColor : {type: String}
    },
    mounted() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    data() {
        return {
            pathSegments: this.buildPathSegments()
        }
    },

    methods: {
        onItemChanged() {
            this.pathSegments = this.buildPathSegments();
            this.$forceUpdate();
        },

        buildPathSegments() {
            const segments = [];
            this.item.shapeProps.paths.forEach((path, pathId) => {
                let ending = path.points.length - 1;
                if (path.closed) {
                    ending = path.points.length;
                }
                for (let i = 0; i < ending; i++) {
                    const j = (i + 1) % path.points.length;
                    const p1 = convertPathPointToWorld(convertCurvePointToItemScale(path.points[i], this.item.area.w, this.item.area.h), this.item);
                    const p2 = convertPathPointToWorld(convertCurvePointToItemScale(path.points[j], this.item.area.w, this.item.area.h), this.item);
                    segments.push({
                        pathId,
                        segmentId: i,
                        path: computeCurvePath(PATH_POINT_CONVERSION_SCALE, PATH_POINT_CONVERSION_SCALE, [p1, p2], false)
                    });
                }
            });
            return segments;
        },

        update() {
            this.$forceUpdate();
        }
    },

    computed: {
        safeZoom() {
            if (this.zoom > 0.00001) {
                return this.zoom;
            }
            return 1.0;
        },

        strokeSize() {
            return Math.max(1, this.item.shapeProps.strokeSize) + 2;
        },

    },

    watch: {
        pathPointsUpdateKey() {
            this.update();
        }
    }
}
</script>