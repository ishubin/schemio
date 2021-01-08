<template>
    <g data-preview-ignore="true">
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <foreignObject
            :x="0" :y="-20" :width="item.area.w" :height="20">
            <div :style="{background: item.shapeProps.strokeColor, color: 'white'}"
                style="font-size: 12px; font-weight: bold; display: inline-block; padding: 2px 5px; height: 20px; font-family: Arial, Helvetica, sans-serif; text-align: left; vertical-align: bottom; white-space: normal; display: table-cell;"
                :data-item-id="item.id"
                >
                {{item.name}}
            </div>
        </foreignObject>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

    </g>
</template>
<script>
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    return `M ${W} ${H}  L 0 ${H} L 0 ${0}  L ${W} 0  L ${W} ${H} Z`;
}

export default {
    props: ['item'],

    shapeType: 'vue',

    components: {AdvancedFill},

    // it doesn't support text slots
    getTextSlots(item) {
        return [];
    },

    computePath,

    editorProps: {
        // flag to specify that it should only be rendered in edit mode
        onlyEditMode: true
    },

    args: {
        fill              : {name: 'Fill', type: 'advanced-color', value: {type: 'solid', color: 'rgba(159, 227, 249, 0.1)'}},
        strokeColor       : {name: 'Stroke', type: 'color', value: 'rgba(50, 175, 209, 1)'},
        strokeSize        : {name: 'Stroke Size', type: 'number', value: 1},
        strokePattern     : {type: 'stroke-pattern',value: 'dashed', name: 'Stroke pattern'},
        horizontalPosition: {type: 'choice', value: 'left', options: ['left', 'right', 'center'], name: 'Horizontal Position'},
        verticalPosition  : {type: 'choice', value: 'top', options: ['top', 'bottom', 'center'], name: 'Vertical Position'},
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>