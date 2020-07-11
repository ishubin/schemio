<template>
    <g>
        <defs v-if="fill.type === 'image' && fill.image">
            <pattern :id="fillId" patternUnits="userSpaceOnUse" :width="area.w" :height="area.h">
                <image :xlink:href="fill.image" x="0" y="0" :width="area.w" :height="area.h"/>
            </pattern>
        </defs>

        <defs v-if="fill.type === 'gradient' && fill.gradient">
            <linearGradient v-if="fill.gradient.type === 'linear'" :id="fillId" :x1="`${direction.x1}%`" :y1="`${direction.y1}%`" :x2="`${direction.x2}%`" :y2="`${direction.y2}%`" >
                <stop v-for="color in fill.gradient.colors"  :style="{'stop-color': color.c}" :offset="`${color.p}%`"/>
            </linearGradient>
        </defs>
    </g>
</template>
<script>
export default {
    props: ['fillId', 'fill', 'area'],

    computeSvgFill(fill, fillId) {
        if (fill.type === 'solid') {
            return fill.color;
        } else if ((fill.type === 'image' && fill.image) || (fill.type === 'gradient' && fill.gradient)) {
            return `url(#${fillId})`;
        }
        return 'none';
    },

    computed: {
        direction() {
            return { x1: 0, y1: 0, x2: 100, y2: 0 };
        }
    }
}
</script>