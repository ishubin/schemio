<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g>
        <rect
            class="overlay-rect-inactive"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.inactive.background.color"
            :stroke="item.style.inactive.stroke.color"
            :stroke-width="item.style.inactive.stroke.size"
            :stroke-dasharray="inactiveStrokeDashArray"
        />
        <rect
            class="overlay-rect-active"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.active.background.color"
            :stroke="item.style.active.stroke.color"
            :stroke-width="item.style.active.stroke.size"
            :stroke-dasharray="activeStrokeDashArray"
        />
    </g>
</template>

<script>
export default {
    props: ['item'],

    data() {
        return {
        };
    },
    methods: {
        calculateDashArray(stroke) {
            var w = stroke.size;
            if (stroke.pattern === 'dotted') {
                return  w + ' ' + (w * 2);
            } else if (stroke.pattern === 'dashed') {
                return (w * 4) + ' ' + (w * 4);
            }
            return '';
        }
    },
    computed: {
        inactiveStrokeDashArray() {
            return this.calculateDashArray(this.item.style.inactive.stroke);
        },
        activeStrokeDashArray() {
            return this.calculateDashArray(this.item.style.active.stroke);
        }
    }
}
</script>

<style lang="css">
</style>
