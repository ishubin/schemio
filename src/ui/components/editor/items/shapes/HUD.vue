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
            :stroke-dashoffset="item.meta.strokeOffset"
            fill="none"></path>

    </g>
</template>
<script>
import StrokePattern from '../StrokePattern.js';
import {computeBrokenRectPath, computeRectPath} from '../../../../scheme/Item';

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

        computePath: computeRectPath,

        computeOutline: computeBrokenRectPath,


        editorProps: {
            // flag to specify that it should only be rendered in edit mode
            onlyEditMode: true
        },

        args: {
            strokeColor       : {name: 'Stroke', type: 'color', value: '#32D143'},
            strokeSize        : {name: 'Stroke Size', type: 'number', value: 2},
            strokePattern     : {type: 'stroke-pattern',value: 'dashed', name: 'Stroke pattern'},
            horizontalPosition: {type: 'choice', value: 'left', options: ['left', 'right', 'center'], name: 'Horizontal Position'},
            verticalPosition  : {type: 'choice', value: 'top', options: ['top', 'bottom', 'center'], name: 'Vertical Position'},
        },
    },


    computed: {
        shapePath() {
            return computeRectPath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },
    }
}
</script>