<template>
    <g>
        <defs v-if="item.style.backgroundImage">
            <pattern :id="backgroundImageId" patternUnits="userSpaceOnUse" :width="item.area.w" :height="item.area.h">
                <image :xlink:href="item.style.backgroundImage" x="0" y="0" :width="item.area.w" :height="item.area.h"/>
            </pattern>
        </defs>

        <rect x="0" y="0" :width="item.area.w" :height="item.area.h"
            :stroke-width="item.style.strokeSize + 'px'"
            :stroke="item.style.strokeColor"
            :fill="fill"></rect>

        <foreignObject v-if="item.text"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="item.text"
                :style="{'padding-left': item.style.textPaddingLeft+'px', 'padding-right': item.style.textPaddingRight+'px', 'padding-top': item.style.textPaddingTop+'px', 'padding-bottom': item.style.textPaddingBottom+'px' }"
                ></div>
        </foreignObject>

        <rect x="0" y="0" :width="item.area.w" :height="item.area.h"
            :data-item-id="item.id"
            class="item-hoverable"
            :stroke-width="item.style.strokeSize + 'px'"
            stroke="rgba(255, 255, 255, 0)"
            fill="rgba(255, 255, 255, 0)"></rect>
    </g>
</template>
<script>
import shortid from 'shortid';

export default {
    props: ['item'],

    args: {
        strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(255,125,125,0.5)', name: 'Fill color'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
        backgroundImage: {type: 'image', value: '', name: 'Image Background'}
    },
    data() {
        return {
            backgroundImageId: `bimg-${shortid.generate()}`
        }
    },
    computed: {
        fill() {
            if (this.item.style.backgroundImage) {
                return `url(#${this.backgroundImageId})`;
            } else {
                return this.item.style.fillColor;
            }
        }
    }
}
</script>

