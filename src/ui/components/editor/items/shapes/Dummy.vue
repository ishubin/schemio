<template>
    <g data-preview-ignore="true">
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <foreignObject v-if="item.shapeProps.showName"
            :x="0" :y="-20" :width="item.area.w" :height="20">
            <div :style="{background: item.shapeProps.strokeColor, color: 'white'}"
                style="font-size: 12px; font-weight: bold; display: inline-block; padding: 2px 5px; height: 20px; font-family: Arial, Helvetica, sans-serif; text-align: left; vertical-align: bottom; white-space: normal; display: table-cell;"
                :data-item-id="item.id"
                >
                {{item.name}}
            </div>
        </foreignObject>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="fill"></path>

    </g>
</template>
<script>
import AdvancedFill from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
}

export default {
    props: ['item'],

    shapeConfig: {
        shapeType: 'vue',

        id: 'dummy',

        menuItems: [{
            group: 'General',
            name: 'Dummy',
            iconUrl: '/assets/images/items/dummy.svg',
            description: `
                Dummy item can be used in order to group mulitple items together.
                It is only visible in the edit mode and completely transparent in view mode.
            `,
            item: {
                shapeProps: {cornerRadius: 0}
            }
        }],

        components: {AdvancedFill},

        // it doesn't support text slots
        getTextSlots(item) {
            return [];
        },

        computePath,

        editorProps: {
            // flag to specify that it should only be rendered in edit mode
            onlyEditMode: true
        },

        args: {
            fill         : {name: 'Fill', type: 'advanced-color', value: {type: 'solid', color: 'rgba(159, 227, 249, 0.1)'}},
            strokeColor  : {name: 'Stroke', type: 'color', value: 'rgba(50, 175, 209, 1)'},
            strokeSize   : {name: 'Stroke Size', type: 'number', value: 1},
            strokePattern: {type: 'stroke-pattern',value: 'dashed', name: 'Stroke pattern'},
            cornerRadius : {type: 'number', value: 0, name: 'Corner radius'},
            showName     : {type: 'boolean', value: true, name: 'Display Name'},
        },
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>