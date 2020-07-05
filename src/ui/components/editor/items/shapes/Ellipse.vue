<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
import shortid from 'shortid';
import StrokePattern from '../StrokePattern.js';
import htmlSanitize from '../../../../../htmlSanitize';
import AdvancedFill from '../AdvancedFill.vue';

const computePath = (item) => {
    const rx = item.area.w / 2;
    const ry = item.area.h / 2;
    return `M ${rx}, 0 a ${rx}, ${ry} 0 1,0 1,0 Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'text',
        style: generateTextStyle(item),
    }
};

function generateTextStyle(item) {
    return {
        'padding-left': item.shapeProps.textPaddingLeft+'px',
        'padding-right': item.shapeProps.textPaddingRight+'px',
        'padding-top': item.shapeProps.textPaddingTop+'px',
        'padding-bottom': item.shapeProps.textPaddingBottom+'px',
        'text-align': 'center',
        'vertical-align': 'middle',
        'position': 'relative',
        'color': item.shapeProps.textColor,
        'top': '50%',
        'transform': 'translateY(-50%)',
        'font-size': item.shapeProps.fontSize + 'px'
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],
    components: {AdvancedFill},

    computePath,
    identifyTextEditArea,

    editorProps: {
        description: 'rich',
        text: 'rich'
    },

    args: {
        strokeColor      : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        fill             : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
        textColor        : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text color'},
        strokeSize       : {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern    : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        fontSize         : {type: 'number', value: 16, name: 'Font Size'},
        textPaddingLeft  : {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight : {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop   : {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
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

        textStyle() {
            return generateTextStyle(this.item);
        },

        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        },

        fill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        }
    }
}
</script>


