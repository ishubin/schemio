<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="item.shapeProps.fillColor"></path>

        <foreignObject v-if="item.text"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="item.text"
                :style="{'padding-left': item.shapeProps.textPaddingLeft+'px', 'padding-right': item.shapeProps.textPaddingRight+'px', 'padding-top': item.shapeProps.textPaddingTop+'px', 'padding-bottom': item.shapeProps.textPaddingBottom+'px' }"
                style="text-align: center; vertical-align: middle; position: relative; top: 50%; transform: translateY(-50%);"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
import StrokePattern from '../StrokePattern.js';

const computePath = (item) => {
    const rx = item.area.w / 2;
    const ry = item.area.h / 2;
    return `M ${rx}, 0 a ${rx}, ${ry} 0 1,0 1,0 Z`;
};
export default {
    props: ['item'],

    computePath,
    args: {
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern: {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},

        fillColor: {type: 'color', value: 'rgba(240,240,240,0.5)', name: 'Fill color'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
    },

    computed: {
        shapePath() { return computePath(this.item); },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        }
    }
}
</script>


