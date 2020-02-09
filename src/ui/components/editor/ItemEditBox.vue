<template>
    <g :transform="`translate(${item.meta.transform.x},${item.meta.transform.y}) rotate(${item.meta.transform.r})`">
        <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`">
            <path :d="`M 0 0 L ${item.area.w} 0  L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`" stroke-width="1" fill="none" :stroke="boundaryBoxColor" style="opacity: 0.4;"/>
            <ellipse class="boundary-box-dragger rotational-dragger"
                :data-dragger-item-id="item.id"
                data-dragger-type="rotation"
                :fill="boundaryBoxColor"
                :cx="item.area.w / 2"
                :cy="-60/safeZoom"
                :rx="5/safeZoom"
                :ry="5/safeZoom"
            />
            <g v-for="(dragger, draggerIndex) in provideBoundingBoxDraggers(item)">
                <rect v-if="!dragger.rotation" class="boundary-box-dragger"
                    :data-dragger-item-id="item.id"
                    :data-dragger-index="draggerIndex"
                    :fill="boundaryBoxColor"
                    :x="dragger.x - dragger.s / safeZoom"
                    :y="dragger.y - dragger.s / safeZoom"
                    :width="dragger.s * 2 / safeZoom"
                    :height="dragger.s * 2 / safeZoom"
                />
            </g>
            
            <!-- rendering item custom control points -->
            <circle v-for="(controlPoint, controlPointName) in item.meta.controlPoints"
                class="item-control-point"
                :data-control-point-item-id="item.id"
                :data-control-point-id="controlPointName"
                :cx="controlPoint.x" :cy="controlPoint.y"
                :fill="boundaryBoxColor"
                :r="5/safeZoom"
                />

            <path class="boundary-box-connector-starter"
                :transform="`translate(${item.area.w/2 + 3/safeZoom}  ${item.area.h + 20/safeZoom}) scale(${1/safeZoom}) rotate(90)`"
                :data-connector-starter-item-id="item.id"
                :fill="boundaryBoxColor"
                d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

            <path class="boundary-box-connector-starter"
                :transform="`translate(${item.area.w/2 - 3/safeZoom}  ${-20/safeZoom}) scale(${1/safeZoom}) rotate(270)`"
                :data-connector-starter-item-id="item.id"
                :fill="boundaryBoxColor"
                d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

            <path class="boundary-box-connector-starter"
                :transform="`translate(${item.area.w + 20/safeZoom}  ${item.area.h/2 - 3/safeZoom}) scale(${1/safeZoom})`"
                :data-connector-starter-item-id="item.id"
                :fill="boundaryBoxColor"
                d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

            <path class="boundary-box-connector-starter"
                :transform="`translate(${-20/safeZoom}  ${item.area.h/2 + 3/safeZoom}) scale(${1/safeZoom}) rotate(180)`"
                :data-connector-starter-item-id="item.id"
                :fill="boundaryBoxColor"
                d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>
        </g>
    </g>
</template>

<script>
import EventBus from './EventBus';

export default {
    props: ['item', 'zoom', 'boundaryBoxColor'],

    mounted() {
        EventBus.$on(EventBus.ANY_ITEM_CHANGED, this.onItemChanged);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.ANY_ITEM_CHANGED, this.onItemChanged);
    },

    data() {
        return {
        };
    },

    methods: {
        // unfortunatelly Vue is not able to spot the change when user selects another item
        // the trick is that the first item in SchemeContainr.selectedItems array is getting replaced
        // and Vue is not noticing the change
        onItemChanged(itemId) {
            if (itemId === this.item.id) {
                this.$forceUpdate();
            }
        },

        provideBoundingBoxDraggers(item) {
            // OPTIMIZE: should not construct entire array of draggers each time, as it is used in mouseMove event
            var s = 5;
            return [{
                x: -10/this.safeZoom, y: -10/this.safeZoom, s: s, edges: ['top', 'left']
            }, {
                x: Math.floor(item.area.w / 2), y: -10/this.safeZoom, s: s, edges: ['top']
            },{
                x: item.area.w + 10/this.safeZoom, y: -10/this.safeZoom, s: s, edges: ['top', 'right']
            },{
                x: item.area.w + 10/this.safeZoom, y: Math.floor(item.area.h / 2), s: s, edges: ['right']
            },{
                x: item.area.w + 10/this.safeZoom, y: item.area.h + 10/this.safeZoom, s: s, edges: ['bottom', 'right']
            },{
                x: Math.floor(item.area.w / 2), y: item.area.h + 10/this.safeZoom, s: s, edges: ['bottom']
            },{
                x: -10/this.safeZoom, y: item.area.h + 10/this.safeZoom, s: s, edges: ['bottom', 'left']
            },{
                x: -10/this.safeZoom, y: Math.floor(item.area.h / 2), s: s, edges: ['left']
            }];
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