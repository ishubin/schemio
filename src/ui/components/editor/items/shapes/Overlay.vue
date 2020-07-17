<template>
    <g :style="{cursor: 'pointer'}">
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-hover-${item.id}`" :fill="item.shapeProps.hoverFill" :area="item.area"/>

        <path v-if="hovered" :d="shapePath" 
            @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick"
            :stroke-width="item.shapeProps.hoverStrokeSize + 'px'"
            :stroke="item.shapeProps.hoverStrokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFillHovered"></path>

        <path v-else :d="shapePath" 
            @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <foreignObject v-if="item.shapeProps.showName && item.name && hiddenTextProperty !== 'name'"
            :x="nameArea.x" :y="nameArea.y" :width="nameArea.w" :height="nameArea.h">
            <div class="item-text-container"
                :style="nameStyle"
                >
                <div v-if="hovered" :style="{'color': hoverNameColor}">
                    {{item.name}}
                </div>
                <div v-else :style="{'color': nameColor}">
                    {{item.name}}
                </div>
            </div>
        </foreignObject>
    </g>

</template>
<script>
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';
import AdvancedFill from '../AdvancedFill.vue';
import {getFontFamilyFor} from '../../../../scheme/Fonts';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function generateNameStyle(item) {
    let displace = 50;
    if (item.shapeProps.namePosition === 'top') {
        displace = 100;
    } else if (item.shapeProps.namePosition === 'bottom') {
        displace = 0;
    }

    return {
        'color'             : item.textProps.color,
        'text-align'        : 'center',
        'font-size'         : item.textProps.fontSize + 'px',
        'font-family'       : getFontFamilyFor(item.textProps.font),
        'vertical-align'    : 'middle',
        'position'          : 'relative',
        'top'               : `${displace}%`,
        'transform'         : `translateY(${-displace}%)`
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

    args: {
        fill              : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,0.1)'}, name: 'Fill'},
        hoverFill         : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(100,200,255,0.3)'}, name: 'Hover Fill'},
        strokeColor       : {type: 'color', value: 'rgba(30,30,30,0.1)', name: 'Stroke Color'},
        hoverStrokeColor  : {type: 'color', value: 'rgba(30,30,30,0.2)', name: 'Hover Stroke Color'},
        nameColor         : {type: 'color', value: 'rgba(0,0,0,0.6)', name: 'Name Color', depends: {showName: true}},
        hoverNameColor    : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Hover Name Color', depends: {showName: true}},
        strokeSize        : {type: 'number', value: 2, name: 'Stroke Size'},
        hoverStrokeSize   : {type: 'number', value: 2, name: 'Hover Stroke Size'},
        strokePattern     : {type: 'stroke-pattern', value: 'solid', name: 'Stroke Pattern'},
        cornerRadius      : {type: 'number', value: 0, name: 'Corner Radius'},
        showName          : {type: 'boolean', value: true, name: 'Show Name'},
        namePosition      : {type: 'choice', value: 'bottom', options: ['top', 'center', 'bottom'], name: 'Name Position', depends: {showName: true}},
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
        description         : 'rich',
        text                : 'none',
        ignoreEventLayer    : true // tells not to draw a layer for events handling, as this shape will handle everything itself
    },

    data() {
        return {
            hovered: false
        };
    },

    methods: {
        onItemChanged() {
            this.hovered = false;
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
        }
    },
    computed: {
        shapePath() {
            return computePath(this.item);
        },

        nameStyle() {
            return generateNameStyle(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        nameArea() {
            const height = 60;
            if (this.item.shapeProps.namePosition === 'top') {
                return {x: 0, y:-height, w: this.item.area.w, h: height};
            } else if (this.item.shapeProps.namePosition === 'bottom') {
                return {x: 0, y:this.item.area.h, w: this.item.area.w, h: height};
            }
            return {x: 0, y: 0, w: this.item.area.w, h: this.item.area.h};
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