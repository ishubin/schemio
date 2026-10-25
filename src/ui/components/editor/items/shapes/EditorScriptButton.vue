<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true"
        style="cursor: pointer"
        @touchstart="onItemClick"
        @mousedown="onItemClick"
        @mousemove="onItemMouseIn"
        @mouseout="onItemMouseOut"
        >
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath"
            :style="{opacity: opacity}"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :stroke-dashoffset="item.meta.strokeOffset"
            :fill="fill"></path>

        <foreignObject
            :x="0" :y="0" :width="item.area.w" :height="item.area.h">
            <div style="color: white; font-weight: bold; display: inline-block; padding: 2px 5px; height: 20px; font-family: Arial, Helvetica, sans-serif; text-align: center; vertical-align: middle; white-space: normal; display: table-cell;"
                :style="{'font-size': `${item.shapeProps.fontSize}px`, width: `${item.area.w}px`, height: `${item.area.h}px`}"
                :data-item-id="item.id"
                >
                {{ item.name }}
            </div>
        </foreignObject>

    </g>
</template>
<script>
import EditorEventBus from '../../EditorEventBus.js';
import AdvancedFill, { computeSvgFill } from '../AdvancedFill.vue';
import StrokePattern from '../StrokePattern.js';
import { createRoundRectPath } from './ShapeDefaults.js';

function computePath(item) {
    return createRoundRectPath(item.area.w, item.area.h, item.shapeProps.cornerRadius);
}

export default {
    props: [ 'item', 'editorId' ],

    shapeConfig: {
        shapeType: 'vue',

        components: {AdvancedFill},

        id: 'editor_script',

        menuItems: [{
            group: 'General',
            name: 'Editor Script',
            iconUrl: '/assets/images/items/editor-script.svg',
            description: `Lets you execute SchemioScript code while in editor`,
        }],

        getTextSlots(item) {
            return [];
        },

        computePath,


        editorProps: {
            // flag to specify that it should only be rendered in edit mode
            onlyEditMode: true,
            disableEventLayer: true,
        },

        args: {
            fill         : {type: 'advanced-color',value: {type: 'solid', color: '#3FDF4F'}, name: 'Fill'},
            strokeColor  : {name: 'Stroke', type: 'color', value: '#32D143'},
            strokeSize   : {name: 'Stroke Size', type: 'number', value: 2, min: 0, softMax: 100},
            strokePattern: {type: 'stroke-pattern',value: 'solid', name: 'Stroke pattern'},
            cornerRadius : {type: 'number', value: 5, name: 'Corner radius', min: 0, softMax: 100},
            fontSize     : {type: 'number',value: 14, name: 'Font size', min: 1, softMax: 100},
            script       : {type: 'script', value: '', name: 'Script'},
        },
    },

    data() {
        return {
            opacity: 1.0
        };
    },

    methods: {
        onItemClick(event) {
            EditorEventBus.editorScript.executeRequested.$emit(this.editorId, this.item.shapeProps.script);
            event.preventDefault();
            event.stopPropagation();
            return false;
        },

        onItemMouseIn(event) {
            this.opacity = 0.85;
            event.preventDefault();
            event.stopPropagation();
            return false;
        },

        onItemMouseOut(event) {
            this.opacity = 1.0;
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        fill() {
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },
    }
}
</script>