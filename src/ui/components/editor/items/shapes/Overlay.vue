<template>
    <g>
        <path :d="shapePath" 
            @mouseover="onMouseOver" @mouseleave="onMouseLeave" @click="onMouseClick"
            :stroke-width="strokeSize + 'px'"
            :stroke="stroke"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

        <foreignObject v-if="item.shapeProps.showName && item.name && hiddenTextProperty !== 'name'"
            :x="nameArea.x" :y="nameArea.y" :width="nameArea.w" :height="nameArea.h">
            <div class="item-text-container"
                :style="nameStyle"
                >
                <div :style="{'color': nameColor}">
                    {{item.name}}
                </div>
                </div>
        </foreignObject>
    </g>

</template>
<script>
import StrokePattern from '../StrokePattern.js';
import EventBus from '../../EventBus';

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
        'color'             : item.nameColor,
        'text-align'        : 'center',
        'font-size'         : item.shapeProps.fontSize + 'px',
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

    beforeMount() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    computePath,

    args: {
        fillColor         : {type: 'color', value: 'rgba(255,255,255,0.1)', name: 'Fill Color'},
        hoverFillColor    : {type: 'color', value: 'rgba(100,200,255,0.3)', name: 'Hover Fill Color'},
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
        fontSize          : {type: 'number', value: 16, name: 'Font Size'},
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
            fill          : this.item.shapeProps.fillColor,
            stroke        : this.item.shapeProps.strokeColor,
            strokeSize    : this.item.shapeProps.strokeSize,
            nameColor     : this.item.shapeProps.nameColor,
        };
    },

    methods: {
        onItemChanged() {
            this.fill = this.item.shapeProps.fillColor;
            this.stroke = this.item.shapeProps.strokeColor;
            this.strokeSize = this.item.shapeProps.strokeSize;
            this.nameColor = this.item.shapeProps.nameColor;
        },
        onMouseOver() {
            this.fill = this.item.shapeProps.hoverFillColor;
            this.stroke = this.item.shapeProps.hoverStrokeColor;
            this.strokeSize = this.item.shapeProps.hoverStrokeSize;
            this.nameColor = this.item.shapeProps.hoverNameColor;
            this.$forceUpdate();
            this.$emit('custom-event', 'mousein');
        },
        onMouseLeave() {
            this.fill = this.item.shapeProps.fillColor;
            this.stroke = this.item.shapeProps.strokeColor;
            this.strokeSize = this.item.shapeProps.strokeSize;
            this.nameColor = this.item.shapeProps.nameColor;
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

    }
}
</script>