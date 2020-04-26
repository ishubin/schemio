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

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
}

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'text',
        style: generateTextStyle(item)
    }
};

function generateTextStyle(item) {
    return {
        'color':            item.shapeProps.textColor,
        'font-size':        item.shapeProps.fontSize + 'px',
        'padding-left':     item.shapeProps.textPaddingLeft+'px',
        'padding-right':    item.shapeProps.textPaddingRight+'px',
        'padding-top':      item.shapeProps.textPaddingTop+'px',
        'padding-bottom':   item.shapeProps.textPaddingBottom+'px'
    };
}
export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    identifyTextEditArea,
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
            return generateTextStyle(this.item);
        }
    }

}
</script>

