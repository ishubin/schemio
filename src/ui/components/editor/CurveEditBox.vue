<template>
    <g :transform="`translate(${item.meta.transform.x},${item.meta.transform.y}) rotate(${item.meta.transform.r})`">
        <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`">
            <g v-for="(point, pointIndex) in item.shapeProps.points">
                <g v-if="point.t === 'B'">
                    <line :x1="point.x" :y1="point.y" :x2="point.x1+point.x" :y2="point.y1+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                    <line :x1="point.x" :y1="point.y" :x2="point.x2+point.x" :y2="point.y2+point.y" :stroke="boundaryBoxColor" :stroke-width="1/safeZoom"/>
                    <circle
                        data-type="curve-control-point"
                        :data-curve-point-index="pointIndex"
                        data-curve-control-point-index="1"
                        :cx="point.x1+point.x" :cy="point.y1+point.y"
                        :r="5/safeZoom"
                        :fill="boundaryBoxColor" stroke="none"/>
                    <circle
                        data-type="curve-control-point"
                        :data-curve-point-index="pointIndex"
                        data-curve-control-point-index="2"
                        :cx="point.x2+point.x" :cy="point.y2+point.y"
                        :r="5/safeZoom"
                        :fill="boundaryBoxColor" stroke="none"/>
                </g>

                <circle v-if="(item.shapeProps.sourceItem && pointIndex === 0) || (item.shapeProps.destinationItem && pointIndex === item.shapeProps.points.length - 1)"
                    data-type="curve-point"
                    style="opacity: 0.5"
                    :data-curve-point-index="pointIndex"
                    :cx="point.x" :cy="point.y"
                    :r="10/safeZoom"
                    :fill="boundaryBoxColor" stroke="none"/>
                <circle
                    data-type="curve-point"
                    :data-curve-point-index="pointIndex"
                    :cx="point.x" :cy="point.y"
                    :r="5/safeZoom"
                    :fill="boundaryBoxColor" stroke="none"/>
            </g>
        </g>
    </g>
</template>
<script>
import EventBus from './EventBus';
export default {
    props: ['item', 'zoom', 'boundaryBoxColor'],
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
        }
    }
}
</script>