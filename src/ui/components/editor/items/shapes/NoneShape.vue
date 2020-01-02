<template>
    <g>
        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="sanitizedItemText" :style="textStyle" ></div>
        </foreignObject>
    </g>
</template>
<script>
import htmlSanitize from '../../../../../htmlSanitize';
const computePath = (item) => {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0  L ${w} 0  L ${w} ${h}  M 0 ${h} Z`;
};
export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    editorProps: {
        description: 'rich',
        text: 'rich'
    },
    args: {
        textColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text Color'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'}
    },

    computed: {
        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        },

        textStyle() {
            return {
                'color':            this.item.shapeProps.textColor,
                'font-size':        this.item.shapeProps.fontSize + 'px',
                'padding-left':     this.item.shapeProps.textPaddingLeft+'px',
                'padding-right':    this.item.shapeProps.textPaddingRight+'px',
                'padding-top':      this.item.shapeProps.textPaddingTop+'px',
                'padding-bottom':   this.item.shapeProps.textPaddingBottom+'px'
            };
        }
    }

}
</script>

