<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <foreignObject v-if="item.text && !textHidden"
            x="0" y="0" :width="item.area.w" :height="Math.max(0, item.area.h - item.shapeProps.tailLength)">
            <div class="item-text-container" v-html="item.text"
                :style="{'font-size': item.shapeProps.fontSize + 'px', 'padding-left': item.shapeProps.textPaddingLeft+'px', 'padding-right': item.shapeProps.textPaddingRight+'px', 'padding-top': item.shapeProps.textPaddingTop+'px', 'padding-bottom': item.shapeProps.textPaddingBottom+'px' }"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
import shortid from 'shortid';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);
    const TL = Math.min(Math.max(0, item.area.h - item.shapeProps.tailLength), item.shapeProps.tailLength);
    const TW = Math.min(Math.max(0, item.area.w - item.shapeProps.tailWidth), item.shapeProps.tailWidth);
    return `M ${W} ${H}  L ${W-TW} ${H-TL}  L ${R} ${H-TL}   a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H} Z`;
}

export default {
    props: ['item'],

    computePath,
    args: {
        cornerRadius: {type: 'number', value: 20, name: 'Corner radius'},
        tailLength: {type: 'number', value: 30, name: 'Tail Length'},
        tailWidth: {type: 'number', value: 40, name: 'Tail Width'},
        strokeColor: {type: 'color', value: 'rgba(100,100,100,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 1, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(230,230,230,1.0)', name: 'Fill color'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
        fontSize: {type: 'number', value: 16, name: 'Font size'}
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        }
    }
}
</script>


