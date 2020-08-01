<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

    </g>
</template>
<script>
import StrokePattern from '../StrokePattern.js';
import AdvancedFill from '../AdvancedFill.vue';

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
    props: ['item'],
    components: {AdvancedFill},

    editorProps: {
        description: 'rich',
        text: 'rich'
    },

    computePath,
    args: {
        fill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
        corners      : {type: 'number', value: 6, name: 'Corners'},
        strokeColor  : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize   : {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
    },
    
    computed: {
        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        }
    }
}
</script>