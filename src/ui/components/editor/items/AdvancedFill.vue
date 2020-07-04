<template>
    <g>
        <defs v-if="fill.type === 'image' && fill.image">
            <pattern :id="fillId" patternUnits="userSpaceOnUse" :width="area.w" :height="area.h">
                <image :xlink:href="fill.image" x="0" y="0" :width="area.w" :height="area.h"/>
            </pattern>
        </defs>
    </g>
</template>
<script>
export default {
    props: ['fillId', 'fill', 'area'],

    computeSvgFill(fill, fillId) {
        if (fill.type === 'solid') {
            return fill.color;
        } else if (fill.type === 'image') {
            return `url(#${fillId})`;
        }
        return 'none';
    }
}
</script>