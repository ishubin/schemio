<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <path :d="`M0 0 L ${brickWidth} 0`"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>
    </g>
</template>
<script>
const brickWidth = (item) => {
   return Math.max(0, item.area.w/3);
};
const brickHeight = (item) => {
    return Math.max(0, item.area.h/8);
};
const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const BW = brickWidth(item);
    const BH = brickHeight(item);
    return `M 0 0  L 0 ${-BH}  L ${BW} ${-BH}  L ${BW} 0  L ${W} 0  L ${W} ${H} L 0 ${H} Z`;
};

export default {
    props: ['item'],

    computePath,

    args: {
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(240,240,240, 1.0)', name: 'Fill color'},
    },

    computed: {
        shapePath() { return computePath(this.item); },
        brickWidth() {
            return Math.max(0, this.item.area.w/3);
        },
        brickHeight() {
            return Math.max(0, this.item.area.h/8);
        }
    }
}
</script>

