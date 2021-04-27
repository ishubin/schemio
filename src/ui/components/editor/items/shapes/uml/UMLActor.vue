<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        
        <path
            :d="`M ${item.area.w/2} ${headRadius*2}  L ${item.area.w/2} ${bodyY}  M 0 ${armY} L ${item.area.w} ${armY}  M 0 ${item.area.h} L ${item.area.w/2} ${bodyY} L ${item.area.w} ${item.area.h}`" 
            fill="none"
            :stroke="item.shapeProps.strokeColor"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            />

        <circle :cx="item.area.w/2" :cy="headRadius" :r="headRadius" :fill="fill" :stroke="item.shapeProps.strokeColor" :stroke-width="item.shapeProps.strokeSize + 'px'" />

    </g>
</template>

<script>
import AdvancedFill from '../../AdvancedFill.vue';


export default {
    props: ['item'],

    shapeConfig: {
        shapeType: 'vue',

        components: {AdvancedFill},

        id: 'uml_actor',

        menuItems: [{
            group: 'UML',
            name: 'Actor',
            iconUrl: '/assets/images/items/uml-actor.svg',
            previewArea: {x: 0, y: 0, w: 30, h: 90, r: 0},
        }],

        computePath(item) {
            return `M 0 0  l ${item.area.w} 0  l 0 ${item.area.h}  l ${-item.area.w} 0 z`;
        },

        // it doesn't support text slots
        getTextSlots(item) {
            return [];
        },

        args: {
            fill         : {name: 'Fill', type: 'advanced-color', value: {type: 'solid', color: 'rgba(240, 240, 240, 1.0)'}},
            strokeColor  : {name: 'Stroke', type: 'color', value: 'rgba(0, 0, 0, 1)'},
            strokeSize   : {name: 'Stroke Size', type: 'number', value: 1},
        },
    },

    computed: {
        headRadius() {
            return Math.min(this.item.area.w/4, this.item.area.h/8);
        },

        armY() {
            return this.item.area.h/4;
        },

        bodyY() {
            return this.item.area.h - this.item.area.h/3;
        },

        fill() {
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>