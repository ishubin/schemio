<template>
    <g>
        <rect x="0" y="0" :width="item.area.w" :height="item.area.h"
            :data-item-id="item.id"
            class="item-hoverable"
            :stroke-width="item.style.strokeSize + 'px'"
            :stroke="item.style.strokeColor"
            :fill="item.style.fillColor"></rect>
    </g>
</template>
<script>
export default {
    props: ['item'],

    args: {
        strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(255,125,125,0.5)', name: 'Fill color'},
    },

    name: 'rect-shape-svg-component'
}
</script>

