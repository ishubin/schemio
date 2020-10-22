<template>
    <g>
        <g :transform="`translate(${editBox.area.x},${editBox.area.y}) rotate(${editBox.area.r})`">
            <path :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`" 
                data-type="multi-item-edit-box"
                :data-multi-item-edit-box-id="editBox.id"
                stroke-width="0"
                :fill="boundaryBoxColor"
                stroke="none"
                style="opacity: 0.2;"/>

            <path :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
                data-type="multi-item-edit-box"
                :data-multi-item-edit-box-id="editBox.id"
                stroke-width="1"
                fill="none"
                :stroke="boundaryBoxColor"
                style="opacity: 0.8;"/>
        </g>
    </g>
</template>

<script>
import utils from '../../utils';
import forEach from 'lodash/forEach';


export default {
    props: ['editBox', 'boundaryBoxColor'],

    beforeMount() {
    },

    data() {
        return {
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
    }
}
</script>