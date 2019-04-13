<template lang="html">
    <g>
        <rect
            class="overlay-rect-inactive"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.inactive.background.color"
        />
        <rect
            class="overlay-rect-active"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.active.background.color"
        />
    </g>
</template>

<script>
export default {
    props: ['item'],

    data() {
        return {
        };
    }
}
</script>

<style lang="css">
</style>
