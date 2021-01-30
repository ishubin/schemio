<template>
    <g :style="{cursor: 'pointer'}"
        @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick"
        >
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-hover-${item.id}`" :fill="item.shapeProps.hoverFill" :area="item.area"/>

        <path v-if="hovered" :d="shapePath" 
            :stroke-width="item.shapeProps.hoverStrokeSize + 'px'"
            :stroke="item.shapeProps.hoverStrokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFillHovered"></path>

        <path v-else :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <g v-if="!hideTextSlot">
            <foreignObject x="0" y="0" :width="item.area.w" :height="item.area.h">
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="textStyle" v-html="sanitizedItemText"></div>
            </foreignObject>
        </g>
    </g>

</template>
<script>
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import AdvancedFill from '../AdvancedFill.vue';
import htmlSanitize from '../../../../../htmlSanitize';
import {generateTextStyle} from '../../text/ItemText';

const computePath = (item) => {
    if (item.shapeProps.overlayShape === 'ellipse') {
        const rx = item.area.w / 2;
        const ry = item.area.h / 2;
        return `M ${rx} ${item.area.h} a ${rx} ${ry} 0 1 1 1 0 Z`;

    } else {
        const W = item.area.w;
        const H = item.area.h;
        const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

        return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
    }
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

    shapeConfig: {
        shapeType: 'vue',

        getTextSlots(item) {
            return [{
                name: 'body',
                area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
            }];
        },
        computePath,

        args: {
            overlayShape      : {type: 'choice', value: 'rect', name: 'Overlay Shape', options: ['rect', 'ellipse']},
            fill              : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,0.1)'}, name: 'Fill'},
            hoverFill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(100,200,255,0.3)'}, name: 'Hover Fill'},
            strokeColor       : {type: 'color', value: 'rgba(30,30,30,0.1)', name: 'Stroke Color'},
            hoverStrokeColor  : {type: 'color', value: 'rgba(30,30,30,0.2)', name: 'Hover Stroke Color'},
            strokeSize        : {type: 'number', value: 2, name: 'Stroke Size'},
            hoverStrokeSize   : {type: 'number', value: 2, name: 'Hover Stroke Size'},
            strokePattern     : {type: 'stroke-pattern', value: 'solid', name: 'Stroke Pattern'},
            cornerRadius      : {type: 'number', value: 0, name: 'Corner Radius', depends: {overlayShape: 'rect'}},
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
        
        editorProps: {
            customTextRendering: true,
            ignoreEventLayer   : true   // tells not to draw a layer for events handling, as this shape will handle everything itself
        },
    },


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


    data() {
        return {
            hovered: false,
            hideTextSlot: false,
            textStyle: this.createTextStyle()
        };
    },

    methods: {
        onItemChanged() {
            this.hovered = false;
            this.textStyle = this.createTextStyle();
        },
        onMouseOver() {
            this.hovered = true;
            this.$forceUpdate();
            this.$emit('custom-event', 'mousein');
        },
        onMouseLeave() {
            this.hovered = false;
            this.$forceUpdate();
            this.$emit('custom-event', 'mouseout');
        },
        onMouseClick() {
            this.$emit('custom-event', 'clicked');
        },
        createTextStyle() {
            let style = {};
            if (this.item.textSlots && this.item.textSlots.body) {
                style = generateTextStyle(this.item.textSlots.body);
                style.width = `${this.item.area.w}px`;
                style.height = `${this.item.area.h}px`;
            }
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

        sanitizedItemText() {
            let text = '';
            if (this.item.textSlots && this.item.textSlots.body) {
                text = this.item.textSlots.body.text;
            }
            return htmlSanitize(text);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
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