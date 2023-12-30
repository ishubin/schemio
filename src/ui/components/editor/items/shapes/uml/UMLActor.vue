<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <path
            :d="shapePath"
            :fill="fill"
            :stroke="item.shapeProps.strokeColor"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            />
    </g>
</template>

<script>
import AdvancedFill from '../../AdvancedFill.vue';

export function computeActorPath(w, h) {
    const armY = h/4;
    const bodyY = h*2/3;
    const r = Math.min(w/4, h/8);
    return `M ${w/2} ${r*2}  L ${w/2} ${bodyY}  M 0 ${armY} L ${w} ${armY}  M 0 ${h} L ${w/2} ${bodyY} M ${w/2} ${bodyY} L ${w} ${h} `
        + ` M ${w/2} ${r} m ${r} 0 a ${r},${r} 0 1,0 -${r*2},0 a ${r},${r} 0 1,0  ${r*2},0`;
}

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

        computeOutline(item) {
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
        shapePath() {
            return computeActorPath(this.item.area.w, this.item.area.h);
        },


        fill() {
            return AdvancedFill.computeStandardFill(this.item);
        }
    }
}
</script>