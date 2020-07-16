<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

    </g>
</template>
<script>
import shortid from 'shortid';
import StrokePattern from '../StrokePattern.js';
import AdvancedFill from '../AdvancedFill.vue';

const computePath = (item) => {
    const rx = item.area.w / 2;
    const ry = item.area.h / 2;
    return `M ${rx}, 0 a ${rx}, ${ry} 0 1,0 1,0 Z`;
};

export default {
    props: ['item', 'hiddenTextProperty'],
    components: {AdvancedFill},

    computePath,

    editorProps: {
        description: 'rich',
        text: 'rich'
    },

    args: {
        fill             : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
        strokeColor      : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize       : {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern    : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
    },

    data() {
        return {
            backgroundImageId: `bimg-${shortid.generate()}`
        }
    },

    computed: {
        shapePath() { return computePath(this.item); },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        }
    }
}
</script>


