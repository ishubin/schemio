<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g :transform="`translate(${item.meta.transform.x},${item.meta.transform.y}) rotate(${item.meta.transform.r})`">
        <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`">
            <g v-for="point in curvePoints" class="curve-control-points">
                <g v-if="point.t === 'B'">
                    <line :x1="point.x" :y1="point.y" :x2="point.x1+point.x" :y2="point.y1+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                    <line :x1="point.x" :y1="point.y" :x2="point.x2+point.x" :y2="point.y2+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                </g>

                <circle 
                    data-type="curve-point"
                    :data-curve-point-index="point.id"
                    :cx="point.x" :cy="point.y"
                    :r="5/safeZoom"
                    :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>


                <g v-if="point.t === 'B'">
                    <path 
                        data-type="curve-control-point"
                        :data-curve-point-index="point.id"
                        data-curve-control-point-index="1"
                        :transform="`translate(${point.x1+point.x} ${point.y1+point.y})`"
                        :d="`M ${5*(point.vx1 + point.vy1)/safeZoom} ${5*(point.vy1 - point.vx1)/safeZoom}  l ${-10*point.vx1/safeZoom} ${-10*point.vy1/safeZoom}  l ${-10*point.vy1/safeZoom} ${10*point.vx1/safeZoom} l ${10*point.vx1/safeZoom} ${10*point.vy1/safeZoom} z`"
                        :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>
                    <path 
                        data-type="curve-control-point"
                        :data-curve-point-index="point.id"
                        data-curve-control-point-index="2"
                        :transform="`translate(${point.x2+point.x} ${point.y2+point.y})`"
                        :d="`M ${5*(point.vx2 + point.vy2)/safeZoom} ${5*(point.vy2 - point.vx2)/safeZoom}  l ${-10*point.vx2/safeZoom} ${-10*point.vy2/safeZoom}  l ${-10*point.vy2/safeZoom} ${10*point.vx2/safeZoom} l ${10*point.vx2/safeZoom} ${10*point.vy2/safeZoom} z`"
                        :fill="point.selected ? controlPointsColor : boundaryBoxColor" stroke="none"/>
                </g>

                <g v-if="point.t === 'A'">
                    <circle 
                        data-type="curve-control-point"
                        :data-curve-point-index="point.id"
                        data-curve-control-point-index="1"
                        :cx="point.x + point.x1" :cy="point.y + point.y1"
                        :r="5/safeZoom"
                        fill="rgba(255, 255, 255, 0.1)" :stroke="point.selected ? controlPointsColor : boundaryBoxColor" :stroke-width="3/safeZoom"/>
                </g>
            </g>
        </g>
    </g>
</template>
<script>
import EventBus from './EventBus';
export default {
    props: ['item', 'zoom', 'boundaryBoxColor', 'controlPointsColor'],
    mounted() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    methods: {
        onItemChanged() {
            this.$forceUpdate();
        },
    },

    computed: {
        safeZoom() {
            if (this.zoom > 0.001) {
                return this.zoom;
            }
            return 1.0;
        },

        curvePoints() {
            return this.$store.getters.curveEditPoints;
        }
    }
}
</script>