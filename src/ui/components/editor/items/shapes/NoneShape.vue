<template>
    <g></g>
</template>
<script>

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
}

export default {
    props: ['item'],

    shapeType: 'vue',

    computePath,
    editorProps: {
        description: 'rich',
        text: 'rich'
    },
    args: {
    },
}
</script>