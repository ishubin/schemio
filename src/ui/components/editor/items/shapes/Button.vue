<template>
    <g @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick">
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-hover-${item.id}`" :fill="item.shapeProps.hoverFill" :area="item.area"/>

        <path v-if="hovered" :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <path v-else :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFillHovered"></path>

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container"
                :style="textStyle"
                >
                <div v-if="hovered" v-html="sanitizedItemText" :style="{color: item.shapeProps.hoverTextColor}"></div>
                <div v-else v-html="sanitizedItemText" :style="{color: item.shapeProps.textColor}"></div>
            </div>
        </foreignObject>
    </g>
    
</template>
<script>
import StrokePattern from '../StrokePattern.js';
import htmlSanitize from '../../../../../htmlSanitize';
import EventBus from '../../EventBus';
import AdvancedFill from '../AdvancedFill.vue';

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
    components: {AdvancedFill},

    beforeMount() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    computePath,
    identifyTextEditArea,

    editorProps: {
        description     : 'rich',
        text            : 'rich',
        ignoreEventLayer: true
    },

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
        fill                  : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,140,240,1.0)'}, name: 'Fill'},
        hoverFill             : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Hover Fill'},

        strokeColor           : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        hoverStrokeColor      : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Hover Stroke color'},

        textColor             : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text color'},
        hoverTextColor        : {type: 'color', value: 'rgba(255,255,255,1.0)', name: 'Hover Text color'},

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
            hovered: false
        };
    },
    methods: {
        onMouseOver() {
            this.hovered = true;
            this.$emit('custom-event', 'mousein');
        },
        onMouseLeave() {
            this.hovered = false;
            this.$emit('custom-event', 'mouseout');
        },
        onMouseClick() {
            this.$emit('custom-event', 'clicked');
        },
        onItemChanged() {
            this.hovered = false;
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
        },

        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        svgFillHovered() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.hoverFill, `fill-pattern-hover-${this.item.id}`);
        },
    }
}
</script>