<template>
    <g>
        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="item.text"
                :style="{'font-size': item.shapeProps.fontSize + 'px', 'padding-left': item.shapeProps.textPaddingLeft+'px', 'padding-right': item.shapeProps.textPaddingRight+'px', 'padding-top': item.shapeProps.textPaddingTop+'px', 'padding-bottom': item.shapeProps.textPaddingBottom+'px' }"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
const computePath = (item) => {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0  L ${w} 0  L ${w} ${h}  M 0 ${h} Z`;
};
export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    args: {
        fontSize: {type: 'number', value: 16, name: 'Text font size'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'}
    }
    
}
</script>

