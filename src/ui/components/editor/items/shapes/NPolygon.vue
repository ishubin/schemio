<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="item.shapeProps.fillColor"></path>

    </g>
</template>
<script>
import StrokePattern from '../StrokePattern.js';

const computePath = (item) => {
    const cx = item.area.w/2;
    const cy = item.area.h/2;
    const R = Math.min(item.area.w/2, item.area.h/2);

    const corners = Math.max(3, item.shapeProps.corners);
    let path = `M ${item.area.w/2} ${item.area.h/2 - R} `;

    for(let i = 0; i < corners; i++) {
        const x = R * Math.cos(i * 2* Math.PI / corners - Math.PI / 2) + cx;
        const y = R * Math.sin(i * 2* Math.PI / corners - Math.PI / 2) + cy;

        path += ` L ${x} ${y}`;
    }

    return path + ' Z';
};
export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    args: {
        corners: {type: 'number', value: 6, name: 'Corners'},
        fillColor: {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        textColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
    },
    
    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
    }
}
</script>