<template>
    <g>
        <defs v-if="item.shapeProps.backgroundImage">
            <pattern :id="backgroundImageId" patternUnits="userSpaceOnUse" :width="item.area.w" :height="item.area.h">
                <image :xlink:href="item.shapeProps.backgroundImage" x="0" y="0" :width="item.area.w" :height="item.area.h"/>
            </pattern>
        </defs>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="fill"></path>

        <foreignObject v-if="item.text"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="item.text"
                :style="{'font-size': item.shapeProps.fontSize + 'px', 'padding-left': item.shapeProps.textPaddingLeft+'px', 'padding-right': item.shapeProps.textPaddingRight+'px', 'padding-top': item.shapeProps.textPaddingTop+'px', 'padding-bottom': item.shapeProps.textPaddingBottom+'px' }"
                ></div>
        </foreignObject>


        <foreignObject v-if="item.shapeProps.showName && item.name"
            :x="nameArea.x" :y="nameArea.y" :width="nameArea.w" :height="nameArea.h">
            <div class="item-text-container"
                :style="nameStyle"
                >{{item.name}}</div>

        </foreignObject>

        <path :d="shapePath" 
            :data-item-id="item.id"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            stroke="rgba(255, 255, 255, 0)"
            fill="rgba(255, 255, 255, 0)"></path>
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
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        fontSize: {type: 'number', value: 16, name: 'Text font size'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
        backgroundImage: {type: 'image', value: '', name: 'Image Background'},
        showName: {type: 'boolean', value: false, name: 'Show Name'},
        namePosition: {type:'choice', value: 'center', options: ['top', 'bottom', 'center'], name: 'Name position'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },
    data() {
        return {
            backgroundImageId: `bimg-${shortid.generate()}`
        }
    },
    computed: {
        fill() {
            if (this.item.shapeProps.backgroundImage) {
                return `url(#${this.backgroundImageId})`;
            } else {
                return this.item.shapeProps.fillColor;
            }
        },

        shapePath() {
            const W = this.item.area.w;
            const H = this.item.area.h;
            const R = Math.min(this.item.shapeProps.cornerRadius, this.item.area.w/4, this.item.area.h/4);
            const TL = Math.min(Math.max(0, this.item.area.h - this.item.shapeProps.tailLength), this.item.shapeProps.tailLength);
            const TW = Math.min(Math.max(0, this.item.area.w - this.item.shapeProps.tailWidth), this.item.shapeProps.tailWidth);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        nameStyle() {
            let displace = 50;
            if (this.item.shapeProps.namePosition === 'top') {
                displace = 100;
            } else if (this.item.shapeProps.namePosition === 'bottom') {
                displace = 0;
            }

            return {
                color: this.item.shapeProps.nameColor,
                'text-align': 'center',
                'vertical-align': 'middle',
                position: 'relative',
                top: `${displace}%`,
                transform: `translateY(${-displace}%)`
            };
        },

        nameArea() {
            const height = 60;
            if (this.item.shapeProps.namePosition === 'top') {
                return {x: 0, y:-height, w: this.item.area.w, h: height};
            } else if (this.item.shapeProps.namePosition === 'bottom') {
                return {x: 0, y:this.item.area.h, w: this.item.area.w, h: height};
            }
            return {x: 0, y: 0, w: this.item.area.w, h: this.item.area.h};
        }
    }
}
</script>

