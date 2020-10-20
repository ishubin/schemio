<template>
    <g>
        <g :transform="`translate(${area.x},${area.y}) rotate(${area.r})`">
            <path :d="`M 0 0 L ${area.w} 0  L ${area.w} ${area.h} L 0 ${area.h} Z`" 
                data-type="multi-item-edit-box"
                :data-multi-item-edit-box-id="boxId"
                stroke-width="0"
                :fill="boundaryBoxColor"
                stroke="none"
                style="opacity: 0.2;"/>

            <path :d="`M 0 0 L ${area.w} 0  L ${area.w} ${area.h} L 0 ${area.h} Z`"
                data-type="multi-item-edit-box"
                :data-multi-item-edit-box-id="boxId"
                stroke-width="1"
                fill="none"
                :stroke="boundaryBoxColor"
                style="opacity: 0.8;"/>
        </g>
    </g>
</template>

<script>
import myMath from '../../myMath';
import utils from '../../utils';
import forEach from 'lodash/forEach';
import EventBus from './EventBus';

const _zeroTransform = {x: 0, y: 0, r: 0};

function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
}


export default {
    props: ['boxId', 'items', 'boundaryBoxColor'],

    beforeMount() {
        let minP = null;
        let maxP = null;

        // iterating over all corners of items area to calculate the boundary box
        const pointGenerators = [
            (item) => {return {x: 0, y: 0}},
            (item) => {return {x: item.area.w, y: 0}},
            (item) => {return {x: item.area.w, y: item.area.h}},
            (item) => {return {x: 0, y: item.area.h}},
        ];

        forEach(this.items, item => {
            forEach(pointGenerators, pointGenerator => {
                const localPoint = pointGenerator(item);
                const p = worldPointOnItem(localPoint.x, localPoint.y, item);
                if (minP) {
                    minP.x = Math.min(minP.x, p.x);
                    minP.y = Math.min(minP.y, p.y);
                } else {
                    minP = {x: p.x, y: p.y};
                }

                if (maxP) {
                    maxP.x = Math.max(maxP.x, p.x);
                    maxP.y = Math.max(maxP.y, p.y);
                } else {
                    maxP = {x: p.x, y: p.y};
                }
            });
        });

        this.area.x = minP.x;
        this.area.y = minP.y;
        this.area.w = maxP.x - minP.x;
        this.area.h = maxP.y - minP.y;
    },

    mounted() {
        EventBus.$on(EventBus.MULTI_ITEM_EDIT_BOX_DRAGGED, this.onDragged);
        EventBus.$on(EventBus.MULTI_ITEM_EDIT_BOX_DRAG_TRIGGERED, this.onDragTriggered);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.MULTI_ITEM_EDIT_BOX_DRAGGED, this.onDragged);
        EventBus.$off(EventBus.MULTI_ITEM_EDIT_BOX_DRAG_TRIGGERED, this.onDragTriggered);
    },

    data() {
        return {
            // the transformation area for a bounding box itself
            // will be recalculated based on items
            area: {x: 0, y: 0, w: 100, h: 100, r: 0},

            originalArea: {x: 0, y: 0, w: 100, h: 100, r: 0},

            originalItemAreas: {}
        };
    },

    methods: {
        onDragTriggered(boxId) {
            if (this.boxId !== boxId) {
                return;
            }

            this.originalArea.x = this.area.x;
            this.originalArea.y = this.area.y;
            this.originalArea.w = this.area.w;
            this.originalArea.h = this.area.h;
            this.originalArea.r = this.area.r;

            forEach(this.items, item => {
                this.originalItemAreas[item.id] = utils.clone(item.area);
            });
        },


        onDragged(dx, dy, boxId) {
            if (this.boxId !== boxId) {
                return;
            }

            forEach(this.items, item => {
                const originalItemArea = this.originalItemAreas[item.id];
                item.area.x = originalItemArea.x + dx;
                item.area.y = originalItemArea.y + dy;
                EventBus.emitItemChanged(item.id, 'area');
            });

            this.area.x = this.originalArea.x + dx;
            this.area.y = this.originalArea.y + dy;
        }
    }
}
</script>