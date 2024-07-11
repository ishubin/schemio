<template>
    <g>
        <AdvancedFill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <rect
            x="0" y="0"
            :width="item.area.w"
            :height="item.area.h"
            :stroke="edgeStroke"
            :stroke-width="item.shapeProps.strokeSize"
            :fill="svgFill"
        />
        <line v-for="x in xLines"
            :x1="x" y1="0" :x2="x" :y2="item.area.h"
            :stroke="item.shapeProps.strokeColor"
            :stroke-width="item.shapeProps.strokeSize"
            ></line>

        <line v-for="y in yLines"
            x1="0" :y1="y" :x2="item.area.w" :y2="y"
            :stroke="item.shapeProps.strokeColor"
            :stroke-width="item.shapeProps.strokeSize"
            ></line>
    </g>
</template>

<script>
import { createRectPath } from './ShapeDefaults';
import AdvancedFill, { computeStandardFill } from '../AdvancedFill.vue';

export default {
    props: ['item', 'editorId'],

    components: { AdvancedFill },

    shapeConfig: {
        id: 'grid',
        shapeType: 'vue',

        menuItems: [ {
            group: 'Tables',
            name: 'Grid',
            iconUrl: '/assets/images/items/grid.svg',
            item: {
                shapeProps: {}
            }
        } ],

        computePath(item) {
            return createRectPath(item.area.w, item.area.h);
        },

        args: {
            cols       : {type: 'number', value: 10, min: 1, name: 'Columns'},
            rows       : {type: 'number', value: 10, min: 1, name: 'Rows'},
            fill       : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255, 255, 255, 1.0)'}, name: 'Fill'},
            edges      : {type: 'boolean', value: true, name: 'Edges'},
            strokeColor: {type: 'color', value: 'rgba(230, 230, 230, 1.0)', name: 'Stroke'},
            strokeSize : {type: 'number', value: 1, name: 'Stroke size'},
        }
    },

    data() {
        return {
            xLines: generateLineValues(this.item.area.w, Math.max(1, this.item.shapeProps.cols)),
            yLines: generateLineValues(this.item.area.h, Math.max(1, this.item.shapeProps.rows)),
        }
    },

    computed: {
        svgFill() {
            return computeStandardFill(this.item);
        },

        edgeStroke() {
            if (this.item.shapeProps.edges) {
                return this.item.shapeProps.strokeColor;
            } else {
                return 'none';
            }
        }
    }

}

function generateLineValues(maxValue, numberOfCells) {
    const step = maxValue / numberOfCells;
    return Array.from(Array(numberOfCells - 1).keys()).map(idx => step * (idx+1));
}

</script>
