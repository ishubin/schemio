<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <circle cx="15" cy="15" r="5" fill="#EC6762"/>
        <circle cx="30" cy="15" r="5" fill="#F4BE5E"/>
        <circle cx="45" cy="15" r="5" fill="#61C761"/>
    </g>
</template>
<script>
import _ from 'lodash';


const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

export default {
    props: ['item'],
    computePath,

    getTextSlots(item) {
        return [{
            name: "title", area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.shapeProps.headerHeight)}
        }, {
            name: "body", area: {x: 0, y: item.shapeProps.headerHeight, w: item.area.w, h: Math.max(1, item.area.h - item.shapeProps.headerHeight)}
        }];
    },

    editorProps: {},
    args: {
        fillColor:          {type: 'color', value: 'rgba(240, 240, 240, 1.0)', name: 'Fill color'},
        strokeColor:        {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
        strokeSize:         {type: 'number', value: 1, name: 'Stroke size'},
        cornerRadius:       {type: 'number', value: 4, name: 'Corner radius'},
        headerHeight:       {type: 'number', value: 30, name: 'Header hight', min: 0}
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },
    },
}
</script>