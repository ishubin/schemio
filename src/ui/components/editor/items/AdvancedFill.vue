<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <defs v-if="fill.type === 'image' && fill.image">
            <pattern :id="fillId" patternUnits="userSpaceOnUse" :width="area.w" :height="area.h">
                <image :xlink:href="fill.image"
                    :x="area.w*imageBox.x"
                    :y="area.h*imageBox.y"
                    :width="area.w * imageBox.w"
                    :height="area.h * imageBox.h"
                    :preserveAspectRatio="imagePreserveAspectRatio"/>
            </pattern>
        </defs>

        <defs v-if="fill.type === 'gradient' && fill.gradient">
            <linearGradient v-if="fill.gradient.type === 'linear'" :id="fillId" :x1="`${direction.x1}%`" :y1="`${direction.y1}%`" :x2="`${direction.x2}%`" :y2="`${direction.y2}%`" >
                <stop v-for="color in fill.gradient.colors"  :style="{'stop-color': color.c}" :offset="`${color.p}%`"/>
            </linearGradient>
            <radialGradient v-if="fill.gradient.type === 'radial'" :id="fillId" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop v-for="color in fill.gradient.colors"  :style="{'stop-color': color.c}" :offset="`${color.p}%`"/>
            </radialGradient>
        </defs>
    </g>
</template>
<script>
export default {
    props: ['fillId', 'fill', 'area'],

    computeSvgFill(fill, fillId) {
        if (!fill) {
            return 'none';
        }
        if (fill.type === 'solid') {
            return fill.color;
        } else if ((fill.type === 'image' && fill.image) || (fill.type === 'gradient' && fill.gradient)) {
            return `url(#${fillId})`;
        }
        return 'none';
    },

    // Uses 'fill' property of shapeProps
    computeStandardFill(item) {
        return this.computeStandardFillForValue(item.shapeProps.fill, `fill-pattern-${item.id}`);
    },

    computeStandardFillForValue(fill, fillId) {
        return this.computeSvgFill(fill, fillId);
    },

    computed: {
        direction() {
            let direction = parseInt(this.fill.gradient.direction);
            if (!isFinite(direction)) {
                direction = 0;
            }

            if (this.fill.type === 'gradient' && this.fill.gradient) {
                const vx = 50 * Math.cos(Math.PI * (direction - 90) / 180);
                const vy = 50 * Math.sin(Math.PI * (direction - 90) / 180);
                return {
                    x1: 50 - vx, y1: 50 - vy,
                    x2: 50 + vx, y2: 50 + vy
                };
            }
            return { x1: 0, y1: 0, x2: 100, y2: 0 };
        },

        imagePreserveAspectRatio() {
            if (this.fill.stretch) {
                return 'none';
            }
            return 'xMidYMid meet';
        },

        imageBox() {
            if (this.fill.type === 'image' && this.fill.imageBox) {
                return this.fill.imageBox;
            }
            return {x: 0, y: 0, w: 1, h: 1};
        },
    }
}
</script>