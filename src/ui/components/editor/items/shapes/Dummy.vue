<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true">
        <foreignObject v-if="item.shapeProps.showName"
            :x="0" :y="-20 - boundsCorrection" :width="item.area.w" :height="20">
            <div :style="{background: item.shapeProps.strokeColor, color: 'white'}"
                style="font-size: 12px; font-weight: bold; display: inline-block; padding: 2px 5px; height: 20px; font-family: Arial, Helvetica, sans-serif; text-align: left; vertical-align: bottom; white-space: nowrap; display: table-cell;"
                :data-item-id="item.id"
                >
                {{item.name}}
            </div>
        </foreignObject>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :data-item-id="item.id"
            fill="none"></path>

        <path v-if="item.shapeProps.screenBounds" :d="screenBoundsPath"
            :stroke-width="item.shapeProps.strokeSize*2 + 'px'"
            :stroke="item.shapeProps.strokeColor"
            fill="none"
            :data-item-id="item.id"
            ></path>

    </g>
</template>
<script>
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
                name: 'Dummy',
                shapeProps: {cornerRadius: 0}
            },
            previewArea: {x: 3, y: 30, w: 150, h: 120},
        }, {
            group: 'General',
            name: 'Screen bounds',
            iconUrl: '/assets/images/items/screen-bounds.svg',
            description: `
                Specifies the bounds of the screen. Users will not be able to scroll outside of it in view mode.
                If the document is loaded inside of a component it will also work as view box and limit the rendering of the component items to the view box area.
            `,
            item: {
                name: 'Bounds',
                shapeProps: {cornerRadius: 0, screenBounds: true, strokeColor: '#E8821B87', strokePattern: 'dotted'}
            },
            previewArea: {x: 3, y: 30, w: 150, h: 120},
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
            strokeColor    : {name: 'Stroke', type: 'color', value: 'rgba(50, 175, 209, 1)'},
            strokeSize     : {name: 'Stroke Size', type: 'number', value: 2},
            strokePattern  : {type: 'stroke-pattern',value: 'dashed', name: 'Stroke pattern'},
            cornerRadius   : {type: 'number', value: 0, name: 'Corner radius', min: 0},
            showName       : {type: 'boolean', value: true, name: 'Display Name'},
            screenBounds   : {type: 'boolean', value: false, name: 'Screen bounds',
                description: 'If set to true than this item will specifies the bounds of the screen. Users will not be able to scroll outside of it in view mode.'
                            +'If the document is loaded inside of a component it will also work as view box and limit '
                            +'the rendering of the component items to the view box area.'
            },
        },
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        screenBoundsPath() {
            const w = this.item.area.w;
            const h = this.item.area.h;
            const d = Math.min(w, h) / 6;
            return `M 0 ${d} l 0 ${-d} l ${d} 0 `
                + `M ${w - d} 0 l ${d} 0 l 0 ${d}`
                + `M ${w} ${h-d} l 0 ${d} l ${-d} 0`
                + `M ${d} ${h} l ${-d} 0 l 0 ${-d}`;
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        boundsCorrection() {
            if (this.item.shapeProps.screenBounds) {
                return this.item.shapeProps.strokeSize + 1;
            }
            return 0;
        }
    }
}
</script>