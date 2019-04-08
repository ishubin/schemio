<template lang="html">
    <g>
        <rect
            class="overlay-rect-inactive"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.inactiveBackground.color"
            :style="{'opacity': item.style.inactiveBackground.alpha}"
        />
        <rect
            class="overlay-rect-active"
            :x="item.area.x"
            :y="item.area.y"
            :width="item.area.w"
            :height="item.area.h"
            :fill="item.style.background.color"
            :style="{'opacity': item.style.background.alpha}"
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
