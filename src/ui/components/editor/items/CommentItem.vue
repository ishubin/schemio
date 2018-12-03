<template lang="html">
    <g class="item-graphics">
        <rect
            :x="x"
            :y="y"
            :width="width"
            :height="height"
            :fill="itemStyle.background && itemStyle.background.color ? itemStyle.background.color : '#fff'"
        />
            <text
                :x="x + Math.floor(fontsize / 2)"
                :y="y + fontsize"
                :font-size="Math.floor(fontsize) + 'px'"
                :fill="itemStyle.text && itemStyle.text.color ? itemStyle.text.color : '#000'"
                >
                <!-- <tspan :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">some text line</tspan>
                <tspan :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">another text line</tspan>
                <tspan :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">line 3</tspan>
                <tspan :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">line 4</tspan> -->
                <tspan v-for="line in lines" :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">{{line}}</tspan>
            </text>
    </g>

</template>

<script>
import _ from 'lodash';

export default {
    props: ['x', 'y', 'width', 'height', 'itemStyle', 'text', 'fontsize'],
    mounted() {
        this.breakWords(this.text);
    },
    data() {
        return {
            lines: [],
            words: []
        };
    },
    methods: {
        breakWords(text) {
            this.words = text.split(/\s+/);
            this.buildLines(this.width);
        },

        buildLines(width) {
            var lines = [];
            lines.push('');
            var id = 0;
            _.forEach(this.words, word => {
                if ((word.length + lines[id].length) * this.fontsize / 2 > width) {
                    if (lines[id].length > 0 ) {
                        id += 1;
                    }
                    lines[id] = word;
                } else {
                    if (lines[id].length > 0) {
                        lines[id] += ' ';
                    }
                    lines[id] += word;
                }
            });
            this.lines = lines;
        }
    },
    watch: {
        text(newText) {
            this.breakWords(newText);
        },
        width(newWidth) {
            this.buildLines(newWidth);
        }
    }
}
</script>

<style lang="css">
</style>
