<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true">
        <foreignObject
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
            fill="none"></path>

    </g>
</template>
<script>
import StrokePattern from '../StrokePattern.js';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    return `M ${W} ${H}  L 0 ${H} L 0 ${0}  L ${W} 0  L ${W} ${H} Z`;
}

export default {
    props: ['item'],

    shapeConfig: {
        shapeType: 'vue',

        components: {},

        id: 'hud',

        menuItems: [{
            group: 'General',
            name: 'HUD',
            iconUrl: '/assets/images/items/hud.svg',
            description: `
                HUD stands for Heads Up Display.
                When going into view mode, HUD item will always be rendered in the viewport.
                This lets you design your own menu on top of the scene, which will always stay in the same spot`,
        }],

        // it doesn't support text slots
        getTextSlots(item) {
            return [];
        },

        computePath,

        computeOutline(item) {
            const w = item.area.w;
            const h = item.area.h;
            // doing these broken lines so that event layer gets created without any fill
            // we don't want to keep selecting this shape when clicking inside of it
            // to make it easier to select its child items
            return `M 0 0 L ${w} 0  M ${w} 0 L ${w} ${h} M ${w} ${h} L 0 ${h} M 0 ${h} L 0 0`;
        },


        editorProps: {
            // flag to specify that it should only be rendered in edit mode
            onlyEditMode: true
        },

        args: {
            strokeColor       : {name: 'Stroke', type: 'color', value: 'rgba(50, 175, 209, 1)'},
            strokeSize        : {name: 'Stroke Size', type: 'number', value: 2},
            strokePattern     : {type: 'stroke-pattern',value: 'dashed', name: 'Stroke pattern'},
            horizontalPosition: {type: 'choice', value: 'left', options: ['left', 'right', 'center'], name: 'Horizontal Position'},
            verticalPosition  : {type: 'choice', value: 'top', options: ['top', 'bottom', 'center'], name: 'Vertical Position'},
        },
    },


    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
    }
}
</script>