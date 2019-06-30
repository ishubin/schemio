<template>
    <g>
        <foreignObject v-if="item.text"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="item.text"
                :style="{'padding-left': item.style.textPaddingLeft+'px', 'padding-right': item.style.textPaddingRight+'px', 'padding-top': item.style.textPaddingTop+'px', 'padding-bottom': item.style.textPaddingBottom+'px' }"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
export default {
    props: ['item'],

    args: {
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'}
    }
    
}
</script>

