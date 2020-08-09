<template>
    <g @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick">
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-hover-${item.id}`" :fill="item.shapeProps.hoverFill" :area="item.area"/>

        <path v-if="hovered" :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.hoverStrokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFillHovered"></path>

        <path v-else :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <g v-if="!hideTextSlot">
            <foreignObject v-if="hovered" x="0" y="0" :width="item.area.w" :height="item.area.h">
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="hoveredStyle" v-html="sanitizedItemText"></div>
            </foreignObject>
            <foreignObject v-else x="0" y="0" :width="item.area.w" :height="item.area.h">
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="regularStyle" v-html="sanitizedItemText"></div>
            </foreignObject>
        </g>
    </g>
    
</template>
<script>
import StrokePattern from '../StrokePattern.js';
import htmlSanitize from '../../../../../htmlSanitize';
import EventBus from '../../EventBus';
import AdvancedFill from '../AdvancedFill.vue';
import {generateTextStyle} from '../../text/ItemText';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeType: 'vue',

    beforeMount() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },

    getTextSlots(item) {
        return [{
            name: 'body',
            area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
        }];
    },

    computePath,

    editorProps: {
        customTextRendering: true,
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
        fill                  : {type: 'advanced-color', value: {type: 'gradient', gradient: {type: 'linear', direction: -90, colors: [{c: '#2375D3', p: 0}, {c: '#7DB9FE', p: 100}]}}, name: 'Fill'},
        hoverFill             : {type: 'advanced-color', value: {type: 'gradient', gradient: {type: 'linear', direction: -90, colors: [{c: '#5C8FCA', p: 0}, {c: '#B1D5FF', p: 100}]}}, name: 'Hover Fill'},

        strokeColor           : {type: 'color', value: '#466AAA', name: 'Stroke color'},
        hoverStrokeColor      : {type: 'color', value: '#466AAA', name: 'Hover Stroke color'},

        hoverTextColor        : {type: 'color', value: '#000', name: 'Hovered Text color'},

        strokeSize            : {type: 'number', value: 2, name: 'Stroke size'},
        strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        cornerRadius          : {type: 'number', value: 5, name: 'Corner radius'},
    },
    data() {
        return {
            hovered: false,

            regularStyle: this.createRegularStyle(),
            hoveredStyle: this.createHoveredStyle(),
            hideTextSlot: false
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
            this.regularStyle = this.createRegularStyle();
            this.hoveredStyle = this.createHoveredStyle();
        },
        createRegularStyle() {
            let style = {};
            if (this.item.textSlots && this.item.textSlots.body) {
                style = generateTextStyle(this.item.textSlots.body);
                style.width = `${this.item.area.w}px`;
                style.height = `${this.item.area.h}px`;
            }
            return style;
        },
        createHoveredStyle() {
            const style = this.createRegularStyle();
            style.color = this.item.shapeProps.hoverTextColor;
            return style;
        },
        onItemTextSlotEditTriggered(item, slotName, area) {
            if (item.id === this.item.id) {
                this.hideTextSlot = true;
            }
        },
        onItemTextSlotEditCanceled(item, slotName) {
            if (item.id === this.item.id) {
                this.hideTextSlot = false;
            }
        }
    },
    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        sanitizedItemText() {
            let text = '';
            if (this.item.textSlots && this.item.textSlots.body) {
                text = this.item.textSlots.body.text;
            }
            return htmlSanitize(text);
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