<template>
    <g :transform="`translate(${item.meta.transform.x},${item.meta.transform.y}) rotate(${item.meta.transform.r})`">
        <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`">
            <g v-for="point in item.shapeProps.points">
                <g v-if="point.t === 'B'">
                    <line :x1="point.x" :y1="point.y" :x2="point.x1" :y2="point.y1" :stroke="boundaryBoxColor" stroke-width="1"/>
                    <line :x1="point.x" :y1="point.y" :x2="point.x2" :y2="point.y2" :stroke="boundaryBoxColor" stroke-width="1"/>
                    <circle :cx="point.x1" :cy="point.y1" :r="3/safeZoom" :fill="boundaryBoxColor" stroke="none"/>
                    <circle :cx="point.x2" :cy="point.y2" :r="3/safeZoom" :fill="boundaryBoxColor" stroke="none"/>
                </g>
                <circle :cx="point.x" :cy="point.y" :r="5/safeZoom" :fill="boundaryBoxColor" stroke="none"/>
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