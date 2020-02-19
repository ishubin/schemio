<template>
    <g @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick">
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>
    </g>
    
</template>
<script>
import StrokePattern from '../StrokePattern.js';
import htmlSanitize from '../../../../../htmlSanitize';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'name',
        style: generateTextStyle(item)
    };
};


function generateTextStyle(item) {
    return {
        'color'           : item.shapeProps.textColor,
        'font-size'       : item.shapeProps.fontSize + 'px',
        'padding-left'    : item.shapeProps.textPaddingLeft + 'px',
        'padding-right'   : item.shapeProps.textPaddingRight + 'px',
        'padding-top'     : item.shapeProps.textPaddingTop + 'px',
        'padding-bottom'  : item.shapeProps.textPaddingBottom + 'px',
        'text-align'      : item.shapeProps.textHorizontalAlign,
        'vertical-align'  : item.shapeProps.textVerticalAlign,
        'display'         : 'table-cell',
        'width'           : item.area.w + 'px',
        'height'          : item.area.h + 'px',
    };
}

function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath() {return null;},
    identifyTextEditArea,

    controlPoints: {
        make(item, pointId) {
            if (!pointId) {
                return {
                    cornerRadius: makeCornerRadiusControlPoint(item),
                };
            } else if (pointId === 'cornerRadius') {
                return makeCornerRadiusControlPoint(item);
            }
        },
        handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
            if (controlPointName === 'cornerRadius') {
                item.shapeProps.cornerRadius = Math.max(0, item.area.w - Math.max(item.area.w/2, originalX + dx));
            }
        }
    },

    args: {
        fillColor             : {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        hoverFillColor        : {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Hover Fill color'},
        strokeColor           : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        hoverStrokeColor      : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Hover Stroke color'},
        textColor             : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text color'},
        hoverTextColor       : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Hover Text color'},
        strokeSize            : {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        cornerRadius          : {type: 'number', value: '0', name: 'Corner radius'},
        fontSize              : {type: 'number', value: 16, name: 'Font Size'},
        textPaddingLeft       : {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight      : {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop        : {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom     : {type: 'number', value: 10, name: 'Text Padding Bottom'},
        textHorizontalAlign   : {type:'choice', value: 'center', options: ['left', 'center', 'right'], name: 'Horizontal align'},
        textVerticalAlign     : {type:'choice', value: 'middle', options: ['top', 'middle', 'bottom'], name: 'Vertical align'},
    },
    data() {
        return {
            fill: this.item.shapeProps.fillColor
        };
    },
    methods: {
        onMouseOver() {
            this.fill = this.item.shapeProps.hoverFillColor;
            this.$emit('custom-event', 'mousein');
        },
        onMouseLeave() {
            this.fill = this.item.shapeProps.fillColor;
            this.$emit('custom-event', 'mouseout');
        },
        onMouseClick() {
            this.$emit('custom-event', 'clicked');
        }
    },
    computed: {
        textStyle() {
            return generateTextStyle(this.item);
        },

        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        sanitizedItemText() {
            return htmlSanitize(this.item.name);
        }
    }
}
</script>