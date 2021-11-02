<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <rect fill="red" x="10" y="10" :width="item.area.w - 20" height="30" @click="onLoadSchemeClick"/>
    </g>
</template>

<script>
import {getStandardRectPins} from './ShapeDefaults'
import StrokePattern from '../StrokePattern.js';
import AdvancedFill from '../AdvancedFill.vue';
import EventBus from '../../EventBus';


const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;

    return `M ${W} ${H}  L 0 ${H}   L 0 ${0}   L ${W} 0  L ${W} ${H} Z`;
};
export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'component',

        menuItems: [{
            group: 'General',
            name: 'Component',
            iconUrl: '/assets/images/items/rect.svg',
            description: `
                Lets you embed other schemes into this item. 
            `,
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        getTextSlots(item) {
            return [{
                name: 'body',
                area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
            }];
        },

        computePath,

        args: {
            fill                  : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
            strokeColor           : {type: 'color', value: '#466AAA', name: 'Stroke color'},
            strokeSize            : {type: 'number', value: 2, name: 'Stroke size'},
            strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
            schemeId              : {type: 'string', value: '', name: 'Scheme ID'}
        },

        editorProps: {
            customTextRendering: true,
            ignoreEventLayer   : true   // tells not to draw a layer for events handling, as this shape will handle everything itself
        },
    },

    methods: {
        onLoadSchemeClick() {
            EventBus.emitComponentLoadRequested(this.item);
        }
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
    }
}
</script>
