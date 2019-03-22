<template lang="html">
    <g class="item-graphics">
        <g v-if="itemStyle.shape === 'simple-comment'">
            <polygon :points="points" style="stroke-width:1" :fill="backgroundColor" :stroke="strokeColor"/>
            <line :x1="x + delta" :y1="y" :x2="x + delta" :y2="y + delta" style="stroke-width:1" :stroke="strokeColor"/>
            <line :x1="x" :y1="y + delta" :x2="x + delta" :y2="y + delta" style="stroke-width:1" :stroke="strokeColor"/>
        </g>

        <text
            :x="x + Math.floor(fontsize / 2)"
            :y="y + topMargin"
            :font-size="Math.floor(fontsize) + 'px'"
            :fill="itemStyle.text && itemStyle.text.color ? itemStyle.text.color : '#000'"
            >
            <tspan v-for="line in svgLines" :x="x + Math.floor(fontsize / 2)" dx="0px" :dy="fontsize" dominant-baseline="alphabetic" style="baseline-shift: 0%;">{{line}}</tspan>
        </text>
    </g>

</template>

<script>
import _ from 'lodash';

export default {
    props: ['x', 'y', 'scale', 'width', 'height', 'itemStyle', 'text', 'fontsize'],
    mounted() {
        this.breakWords(this.text);
    },
    data() {
        return {
            svgLines: [],
            wordsInLines: []
        };
    },
    methods: {
        breakWords(text) {
            var lines = text.split('\n');
            this.wordsInLines = [];

            _.forEach(lines, line => {
                this.wordsInLines.push(line.split(/\s+/));
            })
            this.buildLines(this.width);
        },

        buildLines(width) {
            var lines = [];
            var id = -1;
            _.forEach(this.wordsInLines, words => {
                id += 1;
                lines[id] = '';
                _.forEach(words, word => {
                    if ((word.length + 1 + lines[id].length) * this.fontsize / 1.6 > width) {
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
                if (lines[id].length === 0) {
                    lines[id] = ' ';
                }
            });
            this.svgLines = lines;
        }
    },
    watch: {
        text(newText) {
            this.breakWords(newText);
        },
        width(newWidth) {
            this.buildLines(newWidth);
        }
    },
    computed: {
        points() {
            var text = '';
            var d = 10 * this.scale;
            text+= `${this.x+d},${this.y} ${this.x+this.width},${this.y} ${this.x+this.width},${this.y+this.height} ${this.x},${this.y+this.height} ${this.x},${this.y+d}`;
            return text;
        },
        delta() {
            return 10 * this.scale;
        },
        backgroundColor() {
            return this.itemStyle.background && this.itemStyle.background.color ? this.itemStyle.background.color : '#fff';
        },
        strokeColor() {
            return this.itemStyle.stroke && this.itemStyle.stroke.color ? this.itemStyle.stroke.color : '#fff';
        },
        topMargin() {
            if (this.itemStyle.shape === 'simple-comment') {
                return 12;
            }
            return 0;
        }
    }
}
</script>

<style lang="css">
</style>
