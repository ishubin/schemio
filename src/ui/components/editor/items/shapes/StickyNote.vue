<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <defs>
            <linearGradient :id="`sticky-note-gradient-${item.id}`" x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" style="stop-color: rgba(196, 196, 196, 0.14);"></stop>
                <stop offset="80.56%" style="stop-color: rgba(128, 128, 128, 0.4);"></stop>
                <stop offset="87.22%" style="stop-color: rgba(0, 0, 0, 0.23);"></stop>
                <stop offset="100%" style="stop-color: rgba(0, 0, 0, 0.3);"></stop>
            </linearGradient>

        </defs>

        <defs>
            <filter :id="`sticky-note-shadow-filter-${item.id}`">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4"></feGaussianBlur>
            </filter>
        </defs>

        <g :filter="`url(#sticky-note-shadow-filter-${item.id})`" :style="{opacity: 0.2}">
            <path :d="shadowPath" stroke="none" fill="rgba(0, 0, 0, 1)"></path>
        </g>

        <path :d="shapePath" stroke="none" :fill="svgFill"></path>
        <path :d="shapePath" stroke="none" :fill="`url(#sticky-note-gradient-${item.id})`" :style="{opacity: 0.5, 'mix-blend-mode': 'multiply'}"></path>

    </g>
</template>
<script>
import {getStandardRectPins} from './ShapeDefaults'
import AdvancedFill from '../AdvancedFill.vue';
import map from 'lodash/map';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;

    return `M ${W} ${H}  L 0 ${H} L 0 0   L ${W} 0 L ${W} ${H} Z`;
};

const palette = [ {
    name: 'yellow',
    color: 'rgba(240,234,55,1)'
}, {
    name: 'red',
    color: 'rgba(255,98,55,1)'
}, {
    name: 'lime',
    color: 'rgba(175,255,105,1)'
}, {
    name: 'green',
    color: 'rgba(148,255,112,1)'
}, {
    name: 'blue',
    color: 'rgba(116,255,255,1)'
}, {
    name: 'purple',
    color: 'rgba(212,184,255,1)'
}, {
    name: 'pink',
    color: 'rgba(255,184,235,1)'
}, {
    name: 'white',
    color: 'rgba(250,250,250,1)'
}, {
    name: 'grey',
    color: 'rgba(200,200,200,1)'
} ];

function generateItemMenu() {
    return map(palette, p => {
        return {
            group: 'Sticky Notes',
            name: `Sticky Note (${p.name})`,
            iconSVG: `<path fill="${p.color}" d="M 1 1  L 41 1  L 41 31  L 1 31 Z"/>`,

            item: {
                shapeProps: {
                    fill: {type: 'solid', color: p.color}
                },
            },
            size: {w: 180, h: 180}
        }
    });
}


export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'sticky_note',

        menuItems: generateItemMenu(),

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
            fill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240, 234, 55, 1.0)'}, name: 'Fill'},
        },
    },

    data() {
        return {
        };
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        shadowPath() {
            const x0 = this.item.area.w  * 0.1;
            const x1 = this.item.area.w * 0.99;
            const y0 = this.item.area.h * 0.1;
            const y1 = this.item.area.h * 0.99;
            const w = this.item.area.w * 1.03;
            const h = this.item.area.h * 1.03;
            return `M ${x0} ${y0}  L ${x1} ${y0} L ${w} ${h}  L ${x0} ${y1} Z`;
        },

        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },
    }

}
</script>